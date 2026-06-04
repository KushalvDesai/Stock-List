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
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: 'http://localhost:3001', credentials: true }));
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
});
