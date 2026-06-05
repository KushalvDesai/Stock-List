// nodemon trigger
import { Router, Response } from 'express';
import { prisma } from '../prisma';
import { authenticate, AuthRequest, authorize } from '../middleware/authMiddleware';
import bcrypt from 'bcryptjs';

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

    res.status(200).json(user.factories);
  } catch (error) {
    console.error('Error fetching user factory:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get companies (isolated to owner)
router.get('/', authenticate, authorize(['owner', 'admin']), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    let whereClause = {};
    if (req.user?.role === 'owner') {
      const dbUser = await prisma.user.findUnique({ where: { id: req.user.userId } });
      if (!dbUser || !dbUser.companyId) {
        res.status(200).json([]);
        return;
      }
      whereClause = { id: dbUser.companyId };
    }

    const companies = await prisma.company.findMany({
      where: whereClause,
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

    // Instantly link the owner to their newly created company
    if (req.user?.role === 'owner') {
      await prisma.user.update({
        where: { id: req.user.userId },
        data: { companyId: company.id }
      });
    }

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
    let targetCompanyId = companyId;
    if (req.user?.role === 'owner') {
      const dbUser = await prisma.user.findUnique({ where: { id: req.user.userId } });
      if (!dbUser || !dbUser.companyId) {
        res.status(403).json({ message: 'You must create a company first.' });
        return;
      }
      targetCompanyId = dbUser.companyId; // Force it to their company, ignoring the body payload
    }

    const factory = await prisma.factory.create({ data: { name, companyId: targetCompanyId } });
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
    if (req.user?.role === 'owner') {
      const dbUser = await prisma.user.findUnique({ where: { id: req.user.userId } });
      const factory = await prisma.factory.findUnique({ where: { id: factoryId } });
      if (!factory || factory.companyId !== dbUser?.companyId) {
        res.status(403).json({ message: 'Unauthorized: You do not own this factory' });
        return;
      }
    }

    const mark = await prisma.mark.create({ data: { name, factoryId } });
    res.status(201).json(mark);
  } catch (error) {
    console.error('Error creating mark:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get staff list (isolated to owner's company)
router.get('/staff', authenticate, authorize(['owner', 'admin']), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    let whereClause: any = { role: 'staff' };
    
    if (req.user?.role === 'owner') {
      const dbUser = await prisma.user.findUnique({ where: { id: req.user.userId } });
      if (!dbUser || !dbUser.companyId) {
        res.status(200).json([]);
        return;
      }
      whereClause.companyId = dbUser.companyId;
    }

    const staff = await prisma.user.findMany({
      where: whereClause,
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

// Owner creates new staff
router.post('/staff', authenticate, authorize(['owner', 'admin']), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ message: 'Username and password are required' });
      return;
    }

    let companyIdToAssign = undefined;
    if (req.user?.role === 'owner') {
      const dbUser = await prisma.user.findUnique({ where: { id: req.user.userId } });
      if (!dbUser || !dbUser.companyId) {
        res.status(400).json({ message: 'You must create a company first before adding staff.' });
        return;
      }
      companyIdToAssign = dbUser.companyId;
    } else if (req.user?.role === 'admin') {
      companyIdToAssign = req.body.companyId;
    }

    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) {
      res.status(400).json({ message: 'Username already exists' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        role: 'staff',
        companyId: companyIdToAssign
      }
    });
    
    res.status(201).json({ message: 'Staff created successfully', userId: user.id });
  } catch (error) {
    console.error('Error creating staff:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update staff factory assignment
router.put('/staff/:id/factories', authenticate, authorize(['owner', 'admin']), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { factoryIds } = req.body; 

    if (req.user?.role === 'owner') {
      const dbUser = await prisma.user.findUnique({ where: { id: req.user.userId } });
      
      const staffMember = await prisma.user.findUnique({ where: { id } });
      if (!staffMember || staffMember.companyId !== dbUser?.companyId) {
        res.status(403).json({ message: 'Unauthorized: Staff member does not belong to your company' });
        return;
      }

      if (factoryIds && factoryIds.length > 0) {
        const factories = await prisma.factory.findMany({ where: { id: { in: factoryIds } } });
        const allMatch = factories.every(f => f.companyId === dbUser?.companyId);
        if (!allMatch || factories.length !== factoryIds.length) {
          res.status(403).json({ message: 'Unauthorized: One or more factories do not belong to your company' });
          return;
        }
      }
    }
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

// Update staff password
router.put('/staff/:id/password', authenticate, authorize(['owner', 'admin']), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 5) {
      res.status(400).json({ message: 'Password must be at least 5 characters long' });
      return;
    }

    if (req.user?.role === 'owner') {
      const dbUser = await prisma.user.findUnique({ where: { id: req.user.userId } });
      const staffMember = await prisma.user.findUnique({ where: { id } });
      if (!staffMember || staffMember.companyId !== dbUser?.companyId || staffMember.role !== 'staff') {
        res.status(403).json({ message: 'Unauthorized: Cannot modify this user' });
        return;
      }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword }
    });

    res.status(200).json({ message: 'Staff password updated successfully' });
  } catch (error) {
    console.error('Error updating staff password:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete staff
router.delete('/staff/:id', authenticate, authorize(['owner', 'admin']), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    if (req.user?.role === 'owner') {
      const dbUser = await prisma.user.findUnique({ where: { id: req.user.userId } });
      const staffMember = await prisma.user.findUnique({ where: { id } });
      if (!staffMember || staffMember.companyId !== dbUser?.companyId || staffMember.role !== 'staff') {
        res.status(403).json({ message: 'Unauthorized: Cannot delete this user' });
        return;
      }
    }

    await prisma.user.delete({ where: { id } });
    res.status(200).json({ message: 'Staff member deleted successfully' });
  } catch (error) {
    console.error('Error deleting staff:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
