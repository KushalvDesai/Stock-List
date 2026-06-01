import { Router, Response } from 'express';
import { authenticate, authorize, AuthRequest } from '../middleware/authMiddleware';
import { authLimiter, bannedIps } from './auth';

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

export default router;
