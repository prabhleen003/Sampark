import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';
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

// Trust the first proxy hop so req.ip reflects the real client IP behind nginx / Render / Railway.
// 'false' in dev means req.ip = 127.0.0.1 (no proxy present).
app.set('trust proxy', process.env.NODE_ENV === 'production' ? 1 : false);

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

// Static file serving for uploaded documents — auth-gated.
// Accepts JWT from Authorization header OR ?token= query param (needed for <img src> / PDF links).
// Any valid authenticated user may access uploads; unauthenticated requests are rejected.
function uploadsAuth(req, res, next) {
  const raw = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.split(' ')[1]
    : req.query.token;

  if (!raw) return res.status(401).json({ message: 'Authentication required' });

  try {
    jwt.verify(raw, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

app.use('/uploads', uploadsAuth, express.static('uploads', {
  setHeaders(res) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
  },
}));

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

// Exotel webhook authentication middleware.
// Configure Exotel to POST to: /api/v1/webhooks/exotel?token=<EXOTEL_WEBHOOK_SECRET>
// In dev (EXOTEL_WEBHOOK_SECRET not set), allow through with a warning.
function verifyExotelWebhook(req, res, next) {
  const secret = process.env.EXOTEL_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('[webhook] EXOTEL_WEBHOOK_SECRET not set — webhook is unauthenticated');
    return next();
  }
  if (req.query.token !== secret) {
    console.warn('[webhook] Rejected request with invalid webhook token from', req.ip);
    return res.sendStatus(403);
  }
  next();
}

// Exotel webhook — no auth, Exotel posts here when call status updates
app.post('/api/v1/webhooks/exotel', express.urlencoded({ extended: false }), verifyExotelWebhook, async (req, res) => {
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
app.post('/api/v1/webhooks/exotel-sms', express.urlencoded({ extended: false }), verifyExotelWebhook, async (req, res) => {
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

// Global error handler — catches errors forwarded via next(err) from any route,
// including async handlers wrapped with asyncHandler / wrapRouter.
// Must be registered after all routes and webhooks.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // Mongoose bad ObjectId / cast failure → treat as 400 Not Found
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    return res.status(400).json({ success: false, message: 'Invalid ID format' });
  }
  // Mongoose duplicate-key (unique index violation)
  if (err.code === 11000) {
    return res.status(409).json({ success: false, message: 'Duplicate entry' });
  }
  // Multer file-type / size errors (user-facing)
  if (err.message && (err.message.includes('Only') || err.message.includes('File too large'))) {
    return res.status(400).json({ success: false, message: err.message });
  }
  console.error('[unhandled error]', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
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
