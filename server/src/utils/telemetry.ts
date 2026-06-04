import os from 'os';
import { Request, Response, NextFunction } from 'express';

interface RouteStat {
  route: string;
  method: string;
  hits: number;
  totalTime: number;
  errors: number;
}

const routeStats: Map<string, RouteStat> = new Map();

export function telemetryMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime();
  
  res.on('finish', () => {
    // Only track /api/ routes to keep it focused
    if (!req.originalUrl.startsWith('/api')) return;
    
    // Do not track telemetry or log polling to avoid polluting our own analytics!
    if (req.originalUrl.includes('/telemetry') || req.originalUrl.includes('/logs')) return;
    
    // Normalize route to avoid query params explosion.
    let routePath = req.baseUrl + (req.route?.path || '');
    if (!routePath || routePath === '') {
      routePath = req.originalUrl.split('?')[0];
    }
    
    // Quick sanitization to collapse UUIDs
    routePath = routePath.replace(/\/[a-f0-9-]{36}/gi, '/:id');
    
    const key = `${req.method} ${routePath}`;
    
    const diff = process.hrtime(start);
    const timeMs = diff[0] * 1000 + diff[1] / 1e6;
    
    const isError = res.statusCode >= 400;
    
    if (!routeStats.has(key)) {
      routeStats.set(key, {
        route: routePath,
        method: req.method,
        hits: 0,
        totalTime: 0,
        errors: 0
      });
    }
    
    const stat = routeStats.get(key)!;
    stat.hits += 1;
    stat.totalTime += timeMs;
    if (isError) stat.errors += 1;
  });
  
  next();
}

let lastCpuUsage = process.cpuUsage();
let lastCpuTime = process.uptime() * 1000;

export function getTelemetryData() {
  const memUsage = process.memoryUsage();
  const totalMem = os.totalmem();
  
  const currentCpuUsage = process.cpuUsage();
  const currentCpuTime = process.uptime() * 1000;
  
  const userDiff = currentCpuUsage.user - lastCpuUsage.user;
  const systemDiff = currentCpuUsage.system - lastCpuUsage.system;
  const timeDiff = currentCpuTime - lastCpuTime;
  
  // CPU usage percentage (user + system) / time elapsed
  // cpuUsage is in microseconds, timeDiff is in milliseconds
  const cpuPercent = timeDiff > 0 ? ((userDiff + systemDiff) / 1000 / timeDiff) * 100 : 0;
  
  lastCpuUsage = currentCpuUsage;
  lastCpuTime = currentCpuTime;
  
  const routes = Array.from(routeStats.values()).map(stat => ({
    route: stat.route,
    method: stat.method,
    hits: stat.hits,
    avgTime: stat.hits > 0 ? +(stat.totalTime / stat.hits).toFixed(2) : 0,
    errorRate: stat.hits > 0 ? +((stat.errors / stat.hits) * 100).toFixed(2) : 0
  })).sort((a, b) => b.hits - a.hits);
  
  return {
    hardware: {
      ramUsageMB: +(memUsage.rss / 1024 / 1024).toFixed(2),
      systemTotalRAM_MB: +(totalMem / 1024 / 1024).toFixed(2),
      cpuUsagePercent: +cpuPercent.toFixed(2),
      uptimeSeconds: Math.floor(process.uptime()),
      arch: os.arch(),
      platform: os.platform(),
      nodeVersion: process.version
    },
    routes
  };
}
