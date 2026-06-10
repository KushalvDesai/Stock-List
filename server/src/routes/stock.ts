import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/authMiddleware';

const router = Router();

// Endpoint for staff, owner, and admin to fetch stock data
router.get('/', authenticate, authorize(['staff', 'owner', 'admin']), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    let whereClause: any = { isDeleted: false };
    if (req.user?.role !== 'admin') {
      const dbUser = await prisma.user.findUnique({ where: { id: req.user?.userId } });
      if (!dbUser || !dbUser.companyId) {
        res.status(200).json([]);
        return;
      }
      whereClause.factory = {
        companyId: dbUser.companyId
      };
    }

    const stock = await prisma.stock.findMany({
      where: whereClause,
      include: { factory: true, mark: true },
      orderBy: { createdAt: 'asc' },
    });
    res.status(200).json(stock);
  } catch (error) {
    console.error('Error fetching stock data:', error);
    res.status(500).json({ message: 'Internal server error while fetching stock data' });
  }
});

// Endpoint for staff to request an edit to a stock entry
router.post('/:id/edit-request', authenticate, authorize(['staff', 'owner', 'admin']), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const newData = req.body;
    
    const stock = await prisma.stock.findUnique({ where: { id } });
    if (!stock) {
      res.status(404).json({ message: 'Stock entry not found' });
      return;
    }

    const currentUser = await prisma.user.findUnique({ where: { id: req.user?.userId } });

    await prisma.stockEditRequest.create({
      data: {
        stockId: id,
        newData,
        status: 'pending',
        requestedBy: currentUser?.username || 'Unknown',
      }
    });

    const isAuctionEdit = newData.auction !== undefined && String(newData.auction) !== String(stock.auction || false);
    const title = isAuctionEdit ? 'High Priority: Auction Edit' : 'New Stock Edit Request';
    const message = `Staff member ${currentUser?.username || 'Unknown'} proposed changes to stock ${stock.inv || 'N/A'}-${stock.invNo || 'N/A'}.`;

    // Create notifications for owner and admin
    await prisma.notification.createMany({
      data: [
        { title, message, role: 'owner' },
        { title, message, role: 'admin' }
      ]
    });

    res.status(201).json({ message: 'Edit request submitted for owner approval' });
  } catch (error) {
    console.error('Error submitting edit request:', error);
    res.status(500).json({ message: 'Internal server error while submitting edit request' });
  }
});

// Endpoint for owner/admin to fetch pending edit requests
router.get('/edit-requests/pending', authenticate, authorize(['owner', 'admin']), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    let whereClause: any = { status: 'pending' };
    
    if (req.user?.role !== 'admin') {
      const dbUser = await prisma.user.findUnique({ where: { id: req.user?.userId } });
      if (!dbUser || !dbUser.companyId) {
        res.status(200).json([]);
        return;
      }
      whereClause.stock = {
        factory: {
          companyId: dbUser.companyId
        }
      };
    }

    const requests = await prisma.stockEditRequest.findMany({
      where: whereClause,
      include: { stock: true },
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json(requests);
  } catch (error) {
    console.error('Error fetching edit requests:', error);
    res.status(500).json({ message: 'Internal server error while fetching edit requests' });
  }
});

// Endpoint to approve edit request
router.post('/edit-requests/:id/approve', authenticate, authorize(['owner', 'admin']), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const editRequest = await prisma.stockEditRequest.findUnique({ where: { id } });
    if (!editRequest || editRequest.status !== 'pending') {
      res.status(404).json({ message: 'Pending edit request not found' });
      return;
    }

    const newData = editRequest.newData as any;
    
    // Update both Stock and StockMaster
    await prisma.$transaction([
      prisma.stock.update({
        where: { id: editRequest.stockId },
        data: {
          inv: newData.inv,
          invNo: newData.invNo ? parseInt(newData.invNo, 10) : undefined,
          grade: newData.grade,
          totalBags: newData.totalBags ? parseInt(newData.totalBags, 10) : undefined,
          bagWt: newData.bagWt ? parseFloat(newData.bagWt) : undefined,
          netWt: newData.netWt ? parseFloat(newData.netWt) : undefined,
          auction: newData.auction !== undefined ? Boolean(newData.auction) : undefined,
        }
      }),
      // Assuming StockMaster has same id or we just want to update the original
      prisma.stockEditRequest.update({
        where: { id },
        data: { status: 'approved' }
      })
    ]);

    const updatedStock = await prisma.stock.findUnique({ where: { id: editRequest.stockId } });
    if (updatedStock) {
      await prisma.notification.create({
        data: {
          title: 'Edit Request Approved',
          message: `The edit request by ${editRequest.requestedBy} for stock ${updatedStock.inv || 'N/A'}-${updatedStock.invNo || 'N/A'} was approved.`,
          role: 'staff'
        }
      });
    }

    res.status(200).json({ message: 'Edit request approved' });
  } catch (error) {
    console.error('Error approving edit request:', error);
    res.status(500).json({ message: 'Internal server error while approving' });
  }
});

// Endpoint to reject edit request
router.post('/edit-requests/:id/reject', authenticate, authorize(['owner', 'admin']), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const editRequest = await prisma.stockEditRequest.findUnique({ where: { id } });
    if (!editRequest) {
      res.status(404).json({ message: 'Pending edit request not found' });
      return;
    }

    await prisma.stockEditRequest.update({
      where: { id },
      data: { status: 'rejected' }
    });

    const stock = await prisma.stock.findUnique({ where: { id: editRequest.stockId } });
    if (stock) {
      await prisma.notification.create({
        data: {
          title: 'Edit Request Rejected',
          message: `The edit request by ${editRequest.requestedBy} for stock ${stock.inv || 'N/A'}-${stock.invNo || 'N/A'} was rejected.`,
          role: 'staff'
        }
      });
    }

    res.status(200).json({ message: 'Edit request rejected' });
  } catch (error) {
    console.error('Error rejecting edit request:', error);
    res.status(500).json({ message: 'Internal server error while rejecting' });
  }
});

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

    let factoryId = null;
    if (req.body.MARK_ID) {
      const mark = await prisma.mark.findUnique({ where: { id: req.body.MARK_ID } });
      factoryId = mark?.factoryId || null;
    }

    const data = {
      inv: INV,
      invNo: parseIntSafe(INV_NO),
      grade: GRADE as any,
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
      transporter: req.body.TRANSPORTER,
      purchaseSample: PURCHASE_SAMPLE as any,
      purchaseSampleDate: parseDate(PURCHASE_SAMPLE_DATE),
      user: currentUser?.username,
      factoryId: factoryId,
      markId: req.body.MARK_ID || null,
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
  } catch (error: any) {
    console.error('Error uploading stock data:', error);
    if (error.code === 'P2002') {
      res.status(400).json({ message: 'Duplicate entry: A stock with this Inv, Inv No, Grade, Mark, and Factory already exists.' });
    } else {
      res.status(500).json({ message: 'Internal server error while uploading stock data' });
    }
  }
});

router.delete('/:id', authenticate, authorize(['owner', 'admin']), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const stock = await prisma.stock.findUnique({ where: { id }, include: { factory: true } });
    if (!stock) {
      res.status(404).json({ message: 'Stock entry not found' });
      return;
    }

    if (req.user?.role === 'owner') {
      const dbUser = await prisma.user.findUnique({ where: { id: req.user.userId } });
      if (stock.factory?.companyId !== dbUser?.companyId) {
        res.status(403).json({ message: 'Unauthorized: Cannot delete this stock' });
        return;
      }
    }

    // Soft delete
    await prisma.stock.update({ 
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() }
    });

    res.status(200).json({ message: 'Stock entry moved to recycle bin' });
  } catch (error) {
    console.error('Error deleting stock data:', error);
    res.status(500).json({ message: 'Internal server error while deleting stock data' });
  }
});

// Batch Delete Stock (Soft Delete)
router.post('/delete-batch', authenticate, authorize(['owner', 'admin']), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ message: 'No items selected' });
      return;
    }

    let companyId: string | null | undefined = null;
    if (req.user?.role === 'owner') {
      const dbUser = await prisma.user.findUnique({ where: { id: req.user.userId } });
      companyId = dbUser?.companyId;
      if (!companyId) {
        res.status(403).json({ message: 'Unauthorized' });
        return;
      }

      // Verify ownership of all stocks
      const stocks = await prisma.stock.findMany({
        where: { id: { in: ids } },
        include: { factory: true }
      });
      const allOwned = stocks.every(s => s.factory?.companyId === companyId);
      if (!allOwned) {
        res.status(403).json({ message: 'Unauthorized: You do not own some of the selected items' });
        return;
      }
    }

    await prisma.stock.updateMany({
      where: { id: { in: ids } },
      data: { isDeleted: true, deletedAt: new Date() }
    });

    res.status(200).json({ message: 'Items moved to recycle bin successfully' });
  } catch (error) {
    console.error('Error batch deleting stock:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get Recycle Bin
router.get('/recycle-bin', authenticate, authorize(['owner', 'admin']), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    let whereClause: any = { isDeleted: true };
    if (req.user?.role === 'owner') {
      const dbUser = await prisma.user.findUnique({ where: { id: req.user.userId } });
      if (!dbUser || !dbUser.companyId) {
        res.status(200).json([]);
        return;
      }
      whereClause.factory = { companyId: dbUser.companyId };
    }

    const deletedItems = await prisma.stock.findMany({
      where: whereClause,
      include: { factory: true, mark: true },
      orderBy: { deletedAt: 'desc' },
    });
    res.status(200).json(deletedItems);
  } catch (error) {
    console.error('Error fetching recycle bin:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Batch Recover from Recycle Bin
router.post('/recover-batch', authenticate, authorize(['owner', 'admin']), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ message: 'No items selected' });
      return;
    }

    if (req.user?.role === 'owner') {
      const dbUser = await prisma.user.findUnique({ where: { id: req.user.userId } });
      const companyId = dbUser?.companyId;

      // Verify ownership
      const stocks = await prisma.stock.findMany({
        where: { id: { in: ids } },
        include: { factory: true }
      });
      const allOwned = stocks.every(s => s.factory?.companyId === companyId);
      if (!allOwned) {
        res.status(403).json({ message: 'Unauthorized: You do not own some of the selected items' });
        return;
      }
    }

    await prisma.stock.updateMany({
      where: { id: { in: ids } },
      data: { isDeleted: false, deletedAt: null }
    });

    res.status(200).json({ message: 'Items recovered successfully' });
  } catch (error) {
    console.error('Error recovering stock:', error);
    res.status(500).json({ message: 'Internal server error' });
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

    const userRole = req.user?.role;

    // Owners and admins can bypass the OTP requirement
    if (userRole !== 'owner' && userRole !== 'admin') {
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
      
      // Delete the used OTP
      await prisma.updateOtp.delete({ where: { id: validOtp.id } });
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
        grade: updateData.GRADE as any,
        totalBags: updateData.TOTAL_BAGS ? parseInt(updateData.TOTAL_BAGS as string, 10) : undefined,
        bagWt: updateData.BAG_WT ? parseFloat(updateData.BAG_WT as string) : undefined,
        netWt: updateData.NET_WT ? parseFloat(updateData.NET_WT as string) : undefined,
        dop: updateData.dop,
        broker: updateData.BROKER as string | undefined,
        buyer: updateData.BUYER as string | undefined,
        soldDate: updateData.soldDate,
        soldRate: updateData.SOLD_RATE ? parseFloat(updateData.SOLD_RATE as string) : undefined,
        soldInvNo: updateData.SOLD_INV_NO ? parseInt(updateData.SOLD_INV_NO as string, 10) : undefined,
        billNo: updateData.BILL_NO as string | undefined,
        biltyNo: updateData.BILTY_NO as string | undefined,
        transporter: updateData.TRANSPORTER as string | undefined,
        purchaseSample: updateData.PURCHASE_SAMPLE as any,
        purchaseSampleDate: updateData.purchaseSampleDate,
        user: currentUser?.username,
        auctionBroker: updateData.AUCTION_BROKER as any,
      },
    });

    // Return success

    res.status(200).json({ message: 'Stock entry updated successfully', stock: updatedStock });
  } catch (error) {
    console.error('Error updating stock data:', error);
    res.status(500).json({ message: 'Internal server error while updating stock data' });
  }
});

export default router;
