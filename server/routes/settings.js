/**
 * Settings routes — all protected by authMiddleware (applied in index.js).
 * Mounted at /api/v1/users.
 */
import express from 'express';
import { createHash } from 'crypto';
import User       from '../models/User.js';
import Vehicle    from '../models/Vehicle.js';
import CallLog    from '../models/CallLog.js';
import Payment    from '../models/Payment.js';
import Order      from '../models/Order.js';
import Notification from '../models/Notification.js';
import { uploadAvatar } from '../middleware/upload.js';
import { generateOtp, storeOtp, verifyOtp } from '../utils/otp.js';
import { encryptPhone } from '../utils/encrypt.js';
import { calculatePrivacyScore, refreshPrivacyScore } from '../utils/privacyScore.js';

const router = express.Router();

const INDIAN_PHONE_RE = /^[6-9]\d{9}$/;
const EMAIL_RE        = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_PREFS     = ['missed_calls', 'messages', 'payment_reminders', 'qr_expiry', 'order_updates'];
const VALID_LANGS     = ['en', 'hi'];

// ── GET /api/v1/users/me/settings ────────────────────────────────────────────
router.get('/me/settings', async (req, res) => {
  const user = await User.findById(req.user.userId).select('-__v -phone_encrypted');
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  const vehicleCount = await Vehicle.countDocuments({ user_id: user._id, status: { $ne: 'deactivated' } });

  const masked_phone = user.phone_hash
    ? `******${user.phone_hash.slice(-4)}`
    : null;

  res.json({
    success: true,
    settings: {
      name:                    user.name,
      email:                   user.email,
      masked_phone,
      language:                user.language,
      avatar_url:              user.avatar_url,
      notification_preferences: user.notification_preferences,
      account_created:         user.created_at,
      active_vehicles:         vehicleCount,
    },
  });
});

// ── PUT /api/v1/users/me/settings ─────────────────────────────────────────────
router.put('/me/settings', async (req, res) => {
  const { name, email, notification_preferences, language } = req.body;
  const update = {};

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 50) {
      return res.status(400).json({ success: false, message: 'Name must be 2–50 characters' });
    }
    update.name = name.trim();
  }

  if (email !== undefined) {
    if (email !== null && (typeof email !== 'string' || !EMAIL_RE.test(email))) {
      return res.status(400).json({ success: false, message: 'Invalid email address' });
    }
    update.email = email || null;
  }

  if (language !== undefined) {
    if (!VALID_LANGS.includes(language)) {
      return res.status(400).json({ success: false, message: `language must be one of: ${VALID_LANGS.join(', ')}` });
    }
    update.language = language;
  }

  if (notification_preferences !== undefined) {
    if (typeof notification_preferences !== 'object' || Array.isArray(notification_preferences)) {
      return res.status(400).json({ success: false, message: 'notification_preferences must be an object' });
    }
    const unknownKeys = Object.keys(notification_preferences).filter(k => !VALID_PREFS.includes(k));
    if (unknownKeys.length) {
      return res.status(400).json({ success: false, message: `Unknown preference keys: ${unknownKeys.join(', ')}` });
    }
    for (const [k, v] of Object.entries(notification_preferences)) {
      if (typeof v !== 'boolean') {
        return res.status(400).json({ success: false, message: `Preference values must be boolean. Got "${k}": ${v}` });
      }
      update[`notification_preferences.${k}`] = v;
    }
  }

  if (!Object.keys(update).length) {
    return res.status(400).json({ success: false, message: 'No valid fields provided' });
  }

  const user = await User.findByIdAndUpdate(req.user.userId, { $set: update }, { new: true })
    .select('-__v -phone_encrypted');

  res.json({ success: true, settings: user });
  refreshPrivacyScore(req.user.userId); // fire-and-forget
});

// ── POST /api/v1/users/me/change-phone (Phase 1: send OTP) ───────────────────
router.post('/me/change-phone', async (req, res) => {
  const { new_phone } = req.body;

  if (!new_phone || !INDIAN_PHONE_RE.test(new_phone)) {
    return res.status(400).json({ success: false, message: 'Enter a valid 10-digit Indian mobile number' });
  }

  // Check if the new number is already in use
  const existing = await User.findOne({ phone_hash: new_phone });
  if (existing) {
    return res.status(409).json({ success: false, message: 'This phone number is already registered' });
  }

  const otp = generateOtp();
  storeOtp(`change:${new_phone}`, otp);
  console.log(`Phone-change OTP for ${new_phone}: ${otp}`);

  const response = { success: true, message: 'OTP sent to new number' };
  if (process.env.NODE_ENV !== 'production') response.otp = otp;
  res.json(response);
});

// ── POST /api/v1/users/me/change-phone/verify (Phase 2) ──────────────────────
router.post('/me/change-phone/verify', async (req, res) => {
  const { new_phone, otp } = req.body;

  if (!new_phone || !otp) {
    return res.status(400).json({ success: false, message: 'new_phone and otp are required' });
  }

  const result = verifyOtp(`change:${new_phone}`, otp);
  if (!result.valid) {
    return res.status(400).json({ success: false, message: result.reason });
  }

  let encrypted;
  try {
    encrypted = encryptPhone(new_phone);
  } catch {
    encrypted = new_phone; // fallback if encrypt util not available
  }

  await User.findByIdAndUpdate(req.user.userId, {
    phone_hash:           new_phone,
    phone_encrypted:      encrypted,
    token_invalidated_at: new Date(),
  });

  res.json({ success: true, message: 'Phone updated. Please login again.' });
});

// ── POST /api/v1/users/me/avatar ─────────────────────────────────────────────
router.post('/me/avatar', (req, res) => {
  uploadAvatar(req, res, async (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const avatar_url = `/uploads/${req.file.filename}`;
    await User.findByIdAndUpdate(req.user.userId, { avatar_url });
    res.json({ success: true, avatar_url });
  });
});

// ── GET /api/v1/users/me/payments ────────────────────────────────────────────
router.get('/me/payments', async (req, res) => {
  const vehicles = await Vehicle.find({ user_id: req.user.userId }).select('_id plate_number');
  const vehicleIds = vehicles.map(v => v._id);
  const vehicleMap = Object.fromEntries(vehicles.map(v => [v._id.toString(), v.plate_number]));

  const payments = await Payment.find({ vehicle_id: { $in: vehicleIds } })
    .sort({ created_at: -1 })
    .select('-__v');

  const enriched = payments.map(p => ({
    ...p.toObject(),
    plate_number: vehicleMap[p.vehicle_id.toString()] || null,
  }));

  res.json({ success: true, payments: enriched });
});

// ── GET /api/v1/users/me/export ──────────────────────────────────────────────
router.get('/me/export', async (req, res) => {
  const userId = req.user.userId;

  const [user, vehicles, payments, orders, notifs] = await Promise.all([
    User.findById(userId).select('name email phone_hash language created_at'),
    Vehicle.find({ user_id: userId }).select('plate_number status qr_valid_until emergency_contacts created_at'),
    Payment.find({ vehicle_id: { $in: (await Vehicle.find({ user_id: userId }).select('_id')).map(v => v._id) } })
      .select('amount status valid_from valid_until txnid created_at'),
    Order.find({ user_id: userId }).select('type amount status tracking_id delivery_address created_at'),
    Notification.find({ user_id: userId }).select('type title created_at'),
  ]);

  const vehicleIds = vehicles.map(v => v._id);
  const callLogs = await CallLog.find({ vehicle_id: { $in: vehicleIds } })
    .select('type status duration_seconds created_at');

  const exportData = {
    exported_at: new Date().toISOString(),
    profile: {
      name:         user.name,
      email:        user.email,
      masked_phone: `******${user.phone_hash?.slice(-4)}`,
      language:     user.language,
      member_since: user.created_at,
    },
    vehicles: vehicles.map(v => ({
      plate_number:        v.plate_number,
      status:              v.status,
      qr_valid_until:      v.qr_valid_until,
      emergency_contacts:  (v.emergency_contacts || []).map(c => ({
        label:         c.label,
        masked_phone:  `******${c.phone_encrypted?.slice(-4) || '????'}`,
        priority:      c.priority,
      })),
      registered_at: v.created_at,
    })),
    call_logs: callLogs.map(l => ({
      type:             l.type,
      status:           l.status,
      duration_seconds: l.duration_seconds,
      timestamp:        l.created_at,
    })),
    payments: payments.map(p => ({
      amount:     p.amount,
      status:     p.status,
      valid_from: p.valid_from,
      valid_until:p.valid_until,
      txnid:      p.txnid,
      date:       p.created_at,
    })),
    orders: orders.map(o => ({
      type:       o.type,
      amount:     o.amount,
      status:     o.status,
      tracking_id:o.tracking_id,
      city:       o.delivery_address?.city,
      state:      o.delivery_address?.state,
      date:       o.created_at,
    })),
    notifications: notifs.map(n => ({
      type:      n.type,
      title:     n.title,
      timestamp: n.created_at,
    })),
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="sampark_data_export.json"');
  res.json(exportData);
});

// ── DELETE /api/v1/users/me ───────────────────────────────────────────────────
router.delete('/me', async (req, res) => {
  const { confirmation } = req.body;
  if (confirmation !== 'DELETE') {
    return res.status(400).json({ success: false, message: 'Type DELETE to confirm account deletion' });
  }

  const userId = req.user.userId;
  const vehicles = await Vehicle.find({ user_id: userId }).select('_id');
  const vehicleIds = vehicles.map(v => v._id);

  await Promise.all([
    // Soft-delete user
    User.findByIdAndUpdate(userId, {
      deleted_at:           new Date(),
      token_invalidated_at: new Date(),
    }),
    // Deactivate all QR codes
    Vehicle.updateMany(
      { user_id: userId },
      { qr_token: null, qr_image_url: null, status: 'deactivated', emergency_contacts: [] }
    ),
    // Cancel pending orders
    Order.updateMany(
      { user_id: userId, status: { $in: ['created', 'paid', 'processing'] } },
      { status: 'cancelled' }
    ),
    // Anonymize call logs (keep for abuse tracking)
    CallLog.updateMany(
      { vehicle_id: { $in: vehicleIds } },
      { sender_phone_hash: null, anonymized: true }
    ),
    // Delete notifications
    Notification.deleteMany({ user_id: userId }),
  ]);

  res.json({ success: true, message: 'Account deleted' });
});

// ── GET /api/v1/users/me/privacy-score ───────────────────────────────────────
// Returns the cached score (or freshly calculates if never computed).
router.get('/me/privacy-score', async (req, res) => {
  const user = await User.findById(req.user.userId)
    .select('privacy_score privacy_breakdown privacy_score_at');

  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  // If score was never calculated, do it now (first load)
  if (user.privacy_score === null) {
    const { score, breakdown } = await calculatePrivacyScore(req.user.userId);
    await User.findByIdAndUpdate(req.user.userId, {
      privacy_score:     score,
      privacy_breakdown: breakdown,
      privacy_score_at:  new Date(),
    });
    return res.json({ success: true, score, breakdown });
  }

  res.json({
    success: true,
    score:     user.privacy_score,
    breakdown: user.privacy_breakdown,
    scored_at: user.privacy_score_at,
  });
});

export default router;
