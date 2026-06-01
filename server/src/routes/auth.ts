import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import fs from 'fs';
import path from 'path';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

export const bannedIps = new Map<string, Date>();

export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  handler: (req, res, next, options) => {
    const ip = ipKeyGenerator(req.ip || 'unknown');
    // Only set if not already tracked or if we want to reset the ban timer (usually rate limiter extends it)
    bannedIps.set(ip, new Date(Date.now() + 60 * 60 * 1000));
    res.status(options.statusCode).send(options.message);
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const logAuthAttempt = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const logMessage = `${new Date().toISOString()} - Auth attempt from IP: ${ip} for path: ${req.path}\n`;
  
  const logFilePath = path.join(process.cwd(), 'auth.log');
  fs.appendFile(logFilePath, logMessage, (err) => {
    if (err) console.error('Failed to write to auth log:', err);
  });
  
  next();
};

router.use(logAuthAttempt);
router.use(authLimiter);

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password) {
      res.status(400).json({ message: 'Username and password are required' });
      return;
    }

    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      res.status(400).json({ message: 'Username already exists' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        role: role || 'staff', // Default to staff if not provided
      },
    });

    res.status(201).json({ message: 'User registered successfully', userId: user.id });
  } catch (error: any) {
    console.error('Registration error:', error);
    fs.writeFileSync(path.join(process.cwd(), 'error.log'), String(error.message || error));
    res.status(500).json({ message: 'Internal server error', details: String(error.message || error) });
  }
});

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ message: 'Username and password are required' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, {
      expiresIn: '1d',
    });

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
