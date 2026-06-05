import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/authMiddleware';
import { authLimiter, bannedIps } from './auth';
import { serverLogs, clientLogs } from '../utils/logger';
import { getTelemetryData } from '../utils/telemetry';

const router = Router();

router.get('/banned-ips', authenticate, authorize(['admin']), (req: AuthRequest, res: Response) => {
  const now = new Date();
  const bannedList: { ip: string; expiresAt: Date }[] = [];
  
  for (const [ip, expiresAt] of bannedIps.entries()) {
    if (expiresAt > now) {
      bannedList.push({ ip, expiresAt });
    } else {
      bannedIps.delete(ip);
    }
  }
  
  res.status(200).json(bannedList);
});

router.post('/unban', authenticate, authorize(['admin']), (req: AuthRequest, res: Response) => {
  const { ip } = req.body;
  if (!ip) {
    res.status(400).json({ message: 'IP is required' });
    return;
  }

  authLimiter.resetKey(ip);
  bannedIps.delete(ip);
  
  res.status(200).json({ message: `IP ${ip} has been unbanned` });
});

router.get('/users', authenticate, authorize(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, username: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/users/:id/password', authenticate, authorize(['admin']), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 5) {
      res.status(400).json({ message: 'Password must be at least 5 characters long' });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/users/:id/role', authenticate, authorize(['admin']), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { role } = req.body;

    if (!['staff', 'owner', 'admin'].includes(role)) {
      res.status(400).json({ message: 'Invalid role' });
      return;
    }

    await prisma.user.update({
      where: { id },
      data: { role },
    });

    res.status(200).json({ message: 'Role updated successfully' });
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/users/:id', authenticate, authorize(['admin']), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    
    // Prevent self-deletion if desired
    if (id === req.user?.userId) {
      res.status(400).json({ message: 'Cannot delete your own account' });
      return;
    }

    await prisma.user.delete({ where: { id } });
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/logs', authenticate, authorize(['admin']), (req: AuthRequest, res: Response) => {
  res.status(200).json({ 
    server: serverLogs.join(''), 
    client: clientLogs.join('') 
  });
});

router.post('/logs/client', (req: Request, res: Response) => {
  const { log } = req.body;
  if (log) {
    clientLogs.push(log);
    if (clientLogs.length > 1000) clientLogs.shift();
  }
  res.status(200).send('ok');
});

router.get('/telemetry', authenticate, authorize(['admin']), (req: AuthRequest, res: Response) => {
  res.status(200).json(getTelemetryData());
});

export default router;
