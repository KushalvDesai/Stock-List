import { Router, Response } from 'express';
import { prisma } from '../prisma';
import { authenticate, AuthRequest } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    if (!userRole) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const notifications = await prisma.notification.findMany({
      where: { role: userRole as any },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.status(200).json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.put('/read-all', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userRole = req.user?.role;
    if (!userRole) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    await prisma.notification.updateMany({
      where: { role: userRole as any, isRead: false },
      data: { isRead: true },
    });
    res.status(200).json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.put('/:id/status', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { isRead } = req.body;
    
    if (typeof isRead !== 'boolean') {
      res.status(400).json({ message: 'isRead must be a boolean' });
      return;
    }

    await prisma.notification.update({
      where: { id },
      data: { isRead },
    });
    res.status(200).json({ message: 'Notification status updated' });
  } catch (error) {
    console.error('Error updating notification:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/clear-all', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userRole = req.user?.role;
    if (!userRole) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    await prisma.notification.deleteMany({
      where: { role: userRole as any },
    });
    res.status(200).json({ message: 'All notifications cleared' });
  } catch (error) {
    console.error('Error clearing notifications:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.notification.delete({
      where: { id },
    });
    res.status(200).json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
