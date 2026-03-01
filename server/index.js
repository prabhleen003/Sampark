import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { randomBytes } from 'crypto';
import authRoutes from './routes/auth.js';
import digilockerAuthRoutes from './routes/digilockerAuth.js';
import userRoutes from './routes/users.js';
import vehicleRoutes from './routes/vehicles.js';
import adminRoutes from './routes/admin.js';
import publicRoutes from './routes/public.js';
import callLogRoutes from './routes/callLogs.js';
import paymentRoutes from './routes/payments.js';
import orderRoutes from './routes/orders.js';
import notificationRoutes from './routes/notifications.js';
import settingsRoutes from './routes/settings.js';
import authMiddleware from './middleware/auth.js';
import adminMiddleware from './middleware/adminAuth.js';
import CallLog from './models/CallLog.js';
import Vehicle from './models/Vehicle.js';
import { createNotification } from './services/notification.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// Health check route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

// Static file serving for uploaded documents
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/auth/digilocker', digilockerAuthRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/users', authMiddleware, settingsRoutes);
app.use('/api/v1/vehicles', vehicleRoutes);
app.use('/api/v1/admin', authMiddleware, adminMiddleware, adminRoutes);
app.use('/api/v1/v', publicRoutes);                        // public — no auth
app.use('/api/v1/call-logs', authMiddleware, callLogRoutes);
app.use('/api/v1/payments', authMiddleware, paymentRoutes);
app.use('/api/v1/orders',        authMiddleware, orderRoutes);
app.use('/api/v1/notifications', authMiddleware, notificationRoutes);

// Exotel webhook — no auth, Exotel posts here when call status updates
app.post('/api/v1/webhooks/exotel', express.urlencoded({ extended: false }), async (req, res) => {
  const { CallSid, Status, Duration } = req.body;
  if (CallSid) {
    const statusMap = { completed: 'completed', 'no-answer': 'no-answer', busy: 'busy', failed: 'failed' };
    const mapped = statusMap[Status?.toLowerCase()] || null;
    if (mapped) {
      const update = { status: mapped, duration_seconds: parseInt(Duration) || null };
      const isMissed = ['no-answer', 'busy', 'failed'].includes(mapped);
      if (isMissed) {
        update.fallback_token   = randomBytes(16).toString('hex');
        update.fallback_expires = new Date(Date.now() + 15 * 60 * 1000);
      }
      const log = await CallLog.findOneAndUpdate({ exotel_sid: CallSid }, update, { new: true });
      if (isMissed && log) {
        const v = await Vehicle.findById(log.vehicle_id).select('user_id plate_number');
        if (v) {
          createNotification(
            v.user_id, 'missed_call',
            `Missed call on ${v.plate_number}`,
            'Someone tried to reach you via your QR code but the call wasn\'t answered.',
            v._id,
            '/dashboard',
            { call_sid: CallSid, outcome: mapped, log_id: log._id.toString() }
          );
        }
      }
    }
  }
  res.sendStatus(200);
});

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });
