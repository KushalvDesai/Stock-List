// nodemon trigger
import { Router, Response } from 'express';
import { prisma } from '../prisma';
import { authenticate, AuthRequest, authorize } from '../middleware/authMiddleware';

const router = Router();

// Get the current staff member's assigned factories and their marks
router.get('/my-factory', authenticate, authorize(['staff']), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        factories: {
          include: {
            marks: true,
          }
        }
      }
    });

    if (!user || !user.factories || user.factories.length === 0) {
      res.status(200).json([]);
      return;
    }

    // Return the array of factories
    res.status(200).json(user.factories);
  } catch (error) {
    console.error('Error fetching user factory:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get all companies with their factories and marks
router.get('/', authenticate, authorize(['owner', 'admin']), async (req: AuthRequest, res: Response) => {
  try {
    const companies = await prisma.company.findMany({
      include: {
        factories: {
          include: {
            marks: true,
          }
        }
      }
    });
    res.status(200).json(companies);
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create a new company
router.post('/', authenticate, authorize(['owner', 'admin']), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name } = req.body;
    if (!name) {
      res.status(400).json({ message: 'Company name is required' });
      return;
    }
    const company = await prisma.company.create({ data: { name } });
    res.status(201).json(company);
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(400).json({ message: 'Company name already exists' });
      return;
    }
    console.error('Error creating company:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create a new factory
router.post('/factory', authenticate, authorize(['owner', 'admin']), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, companyId } = req.body;
    if (!name || !companyId) {
      res.status(400).json({ message: 'Factory name and companyId are required' });
      return;
    }
    const factory = await prisma.factory.create({ data: { name, companyId } });
    res.status(201).json(factory);
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(400).json({ message: 'Factory name already exists' });
      return;
    }
    console.error('Error creating factory:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create a new mark
router.post('/mark', authenticate, authorize(['owner', 'admin']), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, factoryId } = req.body;
    if (!name || !factoryId) {
      res.status(400).json({ message: 'Mark name and factoryId are required' });
      return;
    }
    const mark = await prisma.mark.create({ data: { name, factoryId } });
    res.status(201).json(mark);
  } catch (error) {
    console.error('Error creating mark:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get staff list
router.get('/staff', authenticate, authorize(['owner', 'admin']), async (req: AuthRequest, res: Response) => {
  try {
    const staff = await prisma.user.findMany({
      where: { role: 'staff' },
      select: {
        id: true,
        username: true,
        factories: {
          select: { id: true, name: true }
        }
      }
    });
    res.status(200).json(staff);
  } catch (error) {
    console.error('Error fetching staff:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update staff factory assignment
router.put('/staff/:id/factories', authenticate, authorize(['owner', 'admin']), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { factoryIds } = req.body; // Expect an array of factory IDs

    const user = await prisma.user.update({
      where: { id },
      data: {
        factories: {
          set: (factoryIds || []).map((fid: string) => ({ id: fid }))
        }
      }
    });
    res.status(200).json({ message: 'Staff assignment updated successfully', user });
  } catch (error) {
    console.error('Error updating staff factory assignment:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
