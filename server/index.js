import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { randomBytes } from 'crypto';
import authRoutes from './routes/auth.js';
import digilockerAuthRoutes from './routes/digilockerAuth.js';
import userRoutes from './routes/users.js';
import vehicleRoutes from './routes/vehicles.js';
import vehicleTransferRoutes from './routes/vehicleTransfer.js';
import adminRoutes from './routes/admin.js';
import publicRoutes from './routes/public.js';
import callLogRoutes from './routes/callLogs.js';
import paymentRoutes from './routes/payments.js';
import orderRoutes from './routes/orders.js';
import notificationRoutes from './routes/notifications.js';
import settingsRoutes from './routes/settings.js';
import supportRoutes from './routes/support.js';
import authMiddleware from './middleware/auth.js';
import adminMiddleware from './middleware/adminAuth.js';
import CallLog from './models/CallLog.js';
import Vehicle from './models/Vehicle.js';
import User from './models/User.js';
import { createNotification } from './services/notification.js';
import { decryptPhone } from './utils/encrypt.js';

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
app.use('/api/v1/vehicles', vehicleTransferRoutes);
app.use('/api/v1/admin', authMiddleware, adminMiddleware, adminRoutes);
app.use('/api/v1/v', publicRoutes);                        // public — no auth
app.use('/api/v1/call-logs', authMiddleware, callLogRoutes);
app.use('/api/v1/payments', authMiddleware, paymentRoutes);
app.use('/api/v1/orders',        authMiddleware, orderRoutes);
app.use('/api/v1/notifications', authMiddleware, notificationRoutes);
app.use('/api/v1/support', supportRoutes);          // /faq is public; auth enforced per-route

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

// Exotel SMS webhook — owner replies to virtual number
app.post('/api/v1/webhooks/exotel-sms', express.urlencoded({ extended: false }), async (req, res) => {
  try {
    const { From, Body } = req.body;
    if (!From || !Body) {
      return res.sendStatus(400);
    }

    const normalizedFrom = String(From).replace(/\D/g, '').slice(-10);
    const users = await User.find().select('_id phone_encrypted');
    let matchedUser = null;

    for (const user of users) {
      const userPhone = decryptPhone(user.phone_encrypted).replace(/\D/g, '').slice(-10);
      if (userPhone && userPhone === normalizedFrom) {
        matchedUser = user;
        break;
      }
    }

    if (!matchedUser) {
      console.log('[SMS WEBHOOK] Could not match reply to a user');
      return res.sendStatus(200);
    }

    const vehicles = await Vehicle.find({ user_id: matchedUser._id }).select('_id');
    const vehicleIds = vehicles.map(v => v._id);

    const recentLog = await CallLog.findOne({
      vehicle_id: { $in: vehicleIds },
      type: 'sms',
      status: 'completed',
      created_at: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    }).sort({ created_at: -1 });

    if (recentLog) {
      recentLog.owner_reply = Body;
      recentLog.owner_replied_at = new Date();
      await recentLog.save();
      console.log(`[SMS WEBHOOK] Owner reply saved for log ${recentLog._id}`);
    }

    return res.sendStatus(200);
  } catch (error) {
    console.error('[SMS WEBHOOK ERROR]', error);
    return res.sendStatus(500);
  }
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
