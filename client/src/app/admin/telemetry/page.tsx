"use client";

import React, { useEffect, useState } from "react";
import { LogOut, Home, Users, Terminal, Activity, Server, Cpu, HardDrive, Clock, AlertTriangle } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import { api } from "@/lib/axios";
import { NotificationDropdown } from "@/components/notification-dropdown";


interface TelemetryData {
  hardware: {
    ramUsageMB: number;
    systemTotalRAM_MB: number;
    cpuUsagePercent: number;
    uptimeSeconds: number;
    arch: string;
    platform: string;
    nodeVersion: string;
  };
  routes: {
    route: string;
    method: string;
    hits: number;
    avgTime: number;
    errorRate: number;
  }[];
}

export default function TelemetryPage() {
  const { logout } = useAuthStore();
  const router = useRouter();
  
  const [data, setData] = useState<TelemetryData | null>(null);

  const fetchTelemetry = async () => {
    try {
      const res = await api.get("/admin/telemetry");
      setData(res.data);
    } catch (error) {
      console.error("Failed to fetch telemetry:", error);
    }
  };

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 3000); // Live updates every 3s
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h ${m}m ${s}s`;
  };

  return (
    <div className="w-full h-full flex flex-col font-mono">
        {/* Top Navbar */}
        <header className="bg-transparent border-4 border-current shadow-[4px_4px_0_0_currentColor] border-b border-current shrink-0 px-6 py-4 flex justify-between items-center shadow-none sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-current tracking-tight flex items-center gap-2">
              <Activity className="text-indigo-600" />
              Live Telemetry
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <NotificationDropdown />
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm font-medium text-current hover:text-current transition-none"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </header>

        <div className="flex-1 w-full max-w-7xl mx-auto px-8 lg:px-12 py-8 space-y-8">
          
          {/* Hardware Overview */}
          <div>
            <h2 className="text-lg font-bold text-current mb-4 flex items-center gap-2">
              <Server size={20} className="text-indigo-500"/>
              Hardware Overview
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-transparent border-4 border-current shadow-[4px_4px_0_0_currentColor] rounded-none shadow-none border border-current p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-current uppercase">Process RAM</h3>
                  <HardDrive size={18} className="text-blue-500" />
                </div>
                <p className="text-3xl font-bold text-current">
                  {data ? data.hardware.ramUsageMB : '--'} <span className="text-sm font-medium text-current">MB</span>
                </p>
                <p className="text-xs text-current mt-2">
                  System Total: {data ? Math.round(data.hardware.systemTotalRAM_MB / 1024) : '--'} GB
                </p>
              </div>

              <div className="bg-transparent border-4 border-current shadow-[4px_4px_0_0_currentColor] rounded-none shadow-none border border-current p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-current uppercase">CPU Load</h3>
                  <Cpu size={18} className="text-emerald-500" />
                </div>
                <p className="text-3xl font-bold text-current">
                  {data ? data.hardware.cpuUsagePercent : '--'} <span className="text-sm font-medium text-current">%</span>
                </p>
                <div className="w-full bg-transparent h-1.5 rounded-none mt-3 overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full rounded-none transition-none duration-500" 
                    style={{ width: `${Math.min(100, data?.hardware.cpuUsagePercent || 0)}%` }}
                  ></div>
                </div>
              </div>

              <div className="bg-transparent border-4 border-current shadow-[4px_4px_0_0_currentColor] rounded-none shadow-none border border-current p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-current uppercase">Uptime</h3>
                  <Clock size={18} className="text-purple-500" />
                </div>
                <p className="text-2xl font-bold text-current tracking-tight">
                  {data ? formatUptime(data.hardware.uptimeSeconds) : '--'}
                </p>
                <p className="text-xs text-current mt-2">Continuous runtime</p>
              </div>

              <div className="bg-transparent border-4 border-current shadow-[4px_4px_0_0_currentColor] rounded-none shadow-none border border-current p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-current uppercase">Environment</h3>
                  <Terminal size={18} className="text-current" />
                </div>
                <p className="text-lg font-bold text-current">
                  Node {data?.hardware.nodeVersion || '--'}
                </p>
                <p className="text-xs text-current mt-1 capitalize">
                  {data?.hardware.platform} ({data?.hardware.arch})
                </p>
              </div>
            </div>
          </div>

          {/* Network & Routing */}
          <div>
            <h2 className="text-lg font-bold text-current mb-4 flex items-center gap-2">
              <Activity size={20} className="text-indigo-500"/>
              Route Analytics (Since Startup)
            </h2>
            <div className="bg-transparent border-4 border-current shadow-[4px_4px_0_0_currentColor] rounded-none shadow-none border border-current overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-transparent border-b border-current">
                    <th className="py-3 px-6 font-semibold text-current text-xs uppercase tracking-wider">Method</th>
                    <th className="py-3 px-6 font-semibold text-current text-xs uppercase tracking-wider">Endpoint</th>
                    <th className="py-3 px-6 font-semibold text-current text-xs uppercase tracking-wider text-right">Total Hits</th>
                    <th className="py-3 px-6 font-semibold text-current text-xs uppercase tracking-wider text-right">Avg Latency</th>
                    <th className="py-3 px-6 font-semibold text-current text-xs uppercase tracking-wider text-right">Error Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {!data ? (
                    <tr><td colSpan={5} className="py-8 text-center text-current">Loading metrics...</td></tr>
                  ) : data.routes.length === 0 ? (
                    <tr><td colSpan={5} className="py-8 text-center text-current">No API routes hit yet.</td></tr>
                  ) : (
                    data.routes.map((r, i) => (
                      <tr key={i} className="hover:bg-transparent transition-none">
                        <td className="py-3 px-6">
                          <span className={`px-2 py-1 rounded-none text-xs font-bold ${
                            r.method === 'GET' ? 'bg-blue-100 text-blue-700' : 
                            r.method === 'POST' ? 'bg-green-100 text-green-700' : 
                            r.method === 'PUT' ? 'bg-orange-100 text-orange-700' : 
                            'bg-red-100 text-red-700'
                          }`}>
                            {r.method}
                          </span>
                        </td>
                        <td className="py-3 px-6 text-sm font-medium text-current font-mono">
                          {r.route}
                        </td>
                        <td className="py-3 px-6 text-right text-sm font-semibold text-current">
                          {r.hits.toLocaleString()}
                        </td>
                        <td className="py-3 px-6 text-right text-sm font-medium">
                          <span className={r.avgTime > 500 ? 'text-red-600 font-bold' : r.avgTime > 100 ? 'text-orange-500' : 'text-emerald-600'}>
                            {r.avgTime} ms
                          </span>
                        </td>
                        <td className="py-3 px-6 text-right text-sm font-medium">
                          {r.errorRate > 0 ? (
                            <span className="flex items-center justify-end gap-1 text-red-600">
                              <AlertTriangle size={14} />
                              {r.errorRate}%
                            </span>
                          ) : (
                            <span className="text-current">0%</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
  );
}
