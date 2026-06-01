import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/authMiddleware';

const router = Router();

// Endpoint for staff, owner, and admin to upload stock data
router.post('/upload', authenticate, authorize(['staff', 'owner', 'admin']), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      INV,
      INV_NO,
      GRADE,
      TOTAL_BAGS,
      BAG_WT,
      NET_WT,
      DOP,
      BROKER,
      BUYER,
      SOLD_DATE,
      SOLD_RATE,
      BILL_NO,
      BILTY_NO,
      PURCHASE_SAMPLE,
      PURCHASE_SAMPLE_DATE,
    } = req.body;

    // Helper to safely parse dates if provided
    const parseDate = (dateStr: any) => dateStr ? new Date(dateStr) : null;
    // Helper to safely parse numbers
    const parseIntSafe = (num: any) => num != null ? parseInt(num, 10) : null;
    const parseFloatSafe = (num: any) => num != null ? parseFloat(num) : null;

    const currentUser = await prisma.user.findUnique({ where: { id: req.user?.userId } });

    const data = {
      inv: INV,
      invNo: INV_NO,
      grade: GRADE,
      totalBags: parseIntSafe(TOTAL_BAGS),
      bagWt: parseFloatSafe(BAG_WT),
      netWt: parseFloatSafe(NET_WT),
      dop: parseDate(DOP),
      broker: BROKER,
      buyer: BUYER,
      soldDate: parseDate(SOLD_DATE),
      soldRate: parseFloatSafe(SOLD_RATE),
      billNo: BILL_NO,
      biltyNo: BILTY_NO,
      purchaseSample: PURCHASE_SAMPLE,
      purchaseSampleDate: parseDate(PURCHASE_SAMPLE_DATE),
      user: currentUser?.username,
    };

    // Assuming we want to insert into both Stock and StockMaster,
    // or maybe StockMaster is the source of truth and Stock is the transaction log.
    // For now, we will create records in both tables simultaneously as requested.

    // Using a transaction to ensure both tables are updated or neither is.
    const result = await prisma.$transaction([
      prisma.stock.create({ data }),
      prisma.stockMaster.create({ data }),
    ]);

    res.status(201).json({
      message: 'Stock data uploaded successfully',
      stock: result[0],
      stockMaster: result[1],
    });
  } catch (error) {
    console.error('Error uploading stock data:', error);
    res.status(500).json({ message: 'Internal server error while uploading stock data' });
  }
});

router.delete('/:id', authenticate, authorize(['owner', 'admin']), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const stock = await prisma.stock.findUnique({ where: { id } });
    if (!stock) {
      res.status(404).json({ message: 'Stock entry not found' });
      return;
    }

    await prisma.stock.delete({ where: { id } });

    res.status(200).json({ message: 'Stock entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting stock data:', error);
    res.status(500).json({ message: 'Internal server error while deleting stock data' });
  }
});

// Request OTP for stock update (staff and owner)
router.post('/:id/request-update-otp', authenticate, authorize(['staff', 'owner']), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const stock = await prisma.stock.findUnique({ where: { id } });
    
    if (!stock) {
      res.status(404).json({ message: 'Stock entry not found' });
      return;
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    await prisma.updateOtp.create({
      data: {
        stockId: id,
        otp,
        expiresAt,
      },
    });

    const currentUser = await prisma.user.findUnique({ where: { id: req.user?.userId } });
    const username = currentUser?.username || 'Unknown User';

    // In a real application, send this OTP to the owner via Email or SMS
    const details = `INV: ${stock.inv}, INV_NO: ${stock.invNo}, GRADE: ${stock.grade}, TOTAL_BAGS: ${stock.totalBags}, BAG_WT: ${stock.bagWt}, NET_WT: ${stock.netWt}, DOP: ${stock.dop}, TIMESTAMP: ${stock.timestamp}`;
    console.log(`[NOTIFICATION TO OWNER] OTP for updating stock ${id} is: ${otp}. User trying to update: ${username}. Details: ${details}`);

    res.status(200).json({ message: 'OTP sent to owner successfully' });
  } catch (error) {
    console.error('Error requesting OTP:', error);
    res.status(500).json({ message: 'Internal server error while requesting OTP' });
  }
});

// Update stock entry using OTP (staff and owner)
router.put('/:id', authenticate, authorize(['staff', 'owner']), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { otp, ...updateData } = req.body;
    const otpStr = otp as string;

    if (!otpStr) {
      res.status(400).json({ message: 'OTP is required to update stock' });
      return;
    }

    // Find valid OTP
    const validOtp = await prisma.updateOtp.findFirst({
      where: {
        stockId: id,
        otp: otpStr,
        expiresAt: { gt: new Date() },
      },
    });

    if (!validOtp) {
      res.status(401).json({ message: 'Invalid or expired OTP' });
      return;
    }

    // Process dates and numbers in updateData safely
    if (updateData.DOP) updateData.dop = new Date(updateData.DOP as string);
    if (updateData.SOLD_DATE) updateData.soldDate = new Date(updateData.SOLD_DATE as string);
    if (updateData.PURCHASE_SAMPLE_DATE) updateData.purchaseSampleDate = new Date(updateData.PURCHASE_SAMPLE_DATE as string);
    
    const currentUser = await prisma.user.findUnique({ where: { id: req.user?.userId } });

    // Perform update
    const updatedStock = await prisma.stock.update({
      where: { id },
      data: {
        inv: updateData.INV as string | undefined,
        invNo: updateData.INV_NO ? parseInt(updateData.INV_NO as string, 10) : undefined,
        grade: updateData.GRADE as string | undefined,
        totalBags: updateData.TOTAL_BAGS ? parseInt(updateData.TOTAL_BAGS as string, 10) : undefined,
        bagWt: updateData.BAG_WT ? parseFloat(updateData.BAG_WT as string) : undefined,
        netWt: updateData.NET_WT ? parseFloat(updateData.NET_WT as string) : undefined,
        dop: updateData.dop,
        broker: updateData.BROKER as string | undefined,
        buyer: updateData.BUYER as string | undefined,
        soldDate: updateData.soldDate,
        soldRate: updateData.SOLD_RATE ? parseFloat(updateData.SOLD_RATE as string) : undefined,
        billNo: updateData.BILL_NO as string | undefined,
        biltyNo: updateData.BILTY_NO as string | undefined,
        purchaseSample: updateData.PURCHASE_SAMPLE as string | undefined,
        purchaseSampleDate: updateData.purchaseSampleDate,
        user: currentUser?.username,
      },
    });

    // Delete the used OTP
    await prisma.updateOtp.delete({ where: { id: validOtp.id } });

    res.status(200).json({ message: 'Stock entry updated successfully', stock: updatedStock });
  } catch (error) {
    console.error('Error updating stock data:', error);
    res.status(500).json({ message: 'Internal server error while updating stock data' });
  }
});

export default router;
