import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import "dotenv/config";
import authRoutes from './routes/auth';
import stockRoutes from './routes/stock';
import adminRoutes from './routes/admin';
import notificationRoutes from './routes/notifications';
import companyRoutes from './routes/company';
import { prisma } from './prisma';
import { initLogger } from './utils/logger';
import { telemetryMiddleware } from './utils/telemetry';

initLogger();

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

const frontendUrl = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.replace(/\/$/, '') : '';
const allowedOrigins = ['http://localhost:3001', frontendUrl].filter(Boolean);
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(helmet());
app.use(morgan('dev'));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Telemetry tracker
app.use(telemetryMiddleware);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/company', companyRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  try {
    await prisma.$connect();
    console.log('✅ Successfully connected to the database.');
  } catch (error) {
    console.error('❌ Failed to connect to the database:', error);
  }

  // Background cleanup task for Recycle Bin (runs every 12 hours)
  setInterval(async () => {
    try {
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
      const result = await prisma.stock.deleteMany({
        where: {
          isDeleted: true,
          deletedAt: {
            lt: tenDaysAgo
          }
        }
      });
      if (result.count > 0) {
        console.log(`[Cleanup] Emptied ${result.count} old items from recycle bin.`);
      }
    } catch (error) {
      console.error('Error in recycle bin cleanup task:', error);
    }
  }, 1000 * 60 * 60 * 12);
});
