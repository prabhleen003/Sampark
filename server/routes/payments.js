import express from 'express';
import { createHash } from 'crypto';
import QRCode from 'qrcode';
import Vehicle from '../models/Vehicle.js';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import { generateSignedUrl } from '../utils/qr.js';
import { createNotification } from '../services/notification.js';
import { refreshPrivacyScore } from '../utils/privacyScore.js';

const router = express.Router();

const PAYU_KEY    = process.env.PAYU_MERCHANT_KEY;
const PAYU_SALT   = process.env.PAYU_MERCHANT_SALT;
const PAYU_URL    = process.env.PAYU_ENV === 'prod'
  ? 'https://secure.payu.in/_payment'
  : 'https://test.payu.in/_payment';
const PLAN_AMOUNT = parseFloat(process.env.PAYU_PLAN_AMOUNT) || 499; // in rupees

/**
 * SHA-512 hash for PayU payment request.
 * Format: key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||salt
 */
function payuRequestHash({ txnid, amount, productinfo, firstname, email }) {
  const str = `${PAYU_KEY}|${txnid}|${amount}|${productinfo}|${firstname}|${email}||||||||||${PAYU_SALT}`;
  return createHash('sha512').update(str).digest('hex');
}

/**
 * SHA-512 hash for PayU response verification.
 * Format: salt|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key
 */
function payuResponseHash({ status, email, firstname, productinfo, amount, txnid }) {
  const str = `${PAYU_SALT}|${status}|||||||||||${email}|${firstname}|${productinfo}|${amount}|${txnid}|${PAYU_KEY}`;
  return createHash('sha512').update(str).digest('hex');
}

function makeTxnid(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

// POST /api/v1/payments/create-order  (protected)
router.post('/create-order', async (req, res) => {
  const { vehicle_id } = req.body;

  const [vehicle, user] = await Promise.all([
    Vehicle.findOne({ _id: vehicle_id, user_id: req.user.userId }),
    User.findById(req.user.userId).select('name phone_hash'),
  ]);

  if (!vehicle) {
    return res.status(403).json({ success: false, message: 'Vehicle not found or access denied' });
  }
  if (vehicle.status !== 'verified') {
    return res.status(400).json({ success: false, message: 'Vehicle not approved yet' });
  }

  const existing = await Payment.findOne({
    vehicle_id,
    status: 'paid',
    valid_until: { $gt: new Date() },
  });
  if (existing) {
    return res.status(400).json({ success: false, message: 'QR already active for this vehicle' });
  }

  const txnid      = makeTxnid('SQRP');
  const amount     = PLAN_AMOUNT.toFixed(2);
  const productinfo = 'Sampark QR Card - 1 Year';
  const firstname  = (user?.name || 'User').split(' ')[0];
  const email      = `noreply@sampark.app`;
  const phone      = user?.phone_hash || '0000000000';

  await Payment.create({
    user_id: req.user.userId,
    vehicle_id,
    txnid,
    amount: PLAN_AMOUNT,
  });

  res.json({
    success: true,
    payu_url: PAYU_URL,
    key:         PAYU_KEY,
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    phone,
    hash: payuRequestHash({ txnid, amount, productinfo, firstname, email }),
  });
});

// POST /api/v1/payments/verify  (protected)
router.post('/verify', async (req, res) => {
  const { txnid, mihpayid, status, hash, amount, productinfo, firstname, email } = req.body;

  if (!txnid || !mihpayid || !status || !hash) {
    return res.status(400).json({ success: false, message: 'Missing payment details' });
  }

  const payment = await Payment.findOne({ txnid });
  if (!payment) {
    return res.status(404).json({ success: false, message: 'Transaction not found' });
  }

  if (payment.user_id.toString() !== req.user.userId) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  // Verify PayU response hash
  const expectedHash = payuResponseHash({ status, email, firstname, productinfo, amount, txnid });
  if (expectedHash !== hash) {
    payment.status = 'failed';
    await payment.save();
    return res.status(400).json({ success: false, message: 'Payment verification failed' });
  }

  if (status !== 'success') {
    payment.status = 'failed';
    await payment.save();
    return res.status(400).json({ success: false, message: 'Payment was not successful' });
  }

  // Mark payment as paid with 1-year validity
  const now       = new Date();
  const validUntil = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

  payment.mihpayid   = mihpayid;
  payment.status     = 'paid';
  payment.valid_from = now;
  payment.valid_until = validUntil;
  await payment.save();

  // Generate QR for the vehicle
  const vehicle = await Vehicle.findById(payment.vehicle_id);
  const { url, sig } = generateSignedUrl(vehicle._id.toString());
  const qrDataUrl    = await QRCode.toDataURL(url, { width: 400, margin: 2 });

  vehicle.qr_token      = sig;
  vehicle.qr_image_url  = qrDataUrl;
  vehicle.qr_valid_until = validUntil;
  vehicle.card_code     = Math.random().toString(36).slice(2, 10).toUpperCase();
  await vehicle.save();

  createNotification(
    req.user.userId, 'payment_success',
    `QR activated for ${vehicle.plate_number}`,
    'Payment successful! Download your QR code and stick it on your vehicle.',
    vehicle._id,
    '/dashboard',
    { plate_number: vehicle.plate_number, valid_until: validUntil, txnid, mihpayid }
  );

  res.json({ success: true, message: 'Payment successful. QR generated.' });
  refreshPrivacyScore(req.user.userId);
});

// GET /api/v1/payments/status/:vehicleId  (protected)
router.get('/status/:vehicleId', async (req, res) => {
  const vehicle = await Vehicle.findOne({ _id: req.params.vehicleId, user_id: req.user.userId }).select('_id');
  if (!vehicle) {
    return res.status(403).json({ success: false, message: 'Vehicle not found or access denied' });
  }

  const payment = await Payment.findOne({ vehicle_id: req.params.vehicleId })
    .sort({ created_at: -1 })
    .select('-__v');

  res.json({ success: true, payment: payment || null });
});

// POST /api/v1/payments/renew  (protected)
router.post('/renew', async (req, res) => {
  const { vehicle_id } = req.body;

  const [vehicle, user] = await Promise.all([
    Vehicle.findOne({ _id: vehicle_id, user_id: req.user.userId }),
    User.findById(req.user.userId).select('name phone_hash'),
  ]);

  if (!vehicle) {
    return res.status(403).json({ success: false, message: 'Vehicle not found or access denied' });
  }
  if (vehicle.status !== 'verified') {
    return res.status(400).json({ success: false, message: 'Vehicle not approved yet' });
  }

  const activePayment = await Payment.findOne({
    vehicle_id,
    status: 'paid',
    valid_until: { $gt: new Date() },
  });
  const daysLeft = activePayment
    ? Math.floor((new Date(activePayment.valid_until) - Date.now()) / 86400000)
    : -1;

  if (activePayment && daysLeft > 30) {
    return res.status(400).json({ success: false, message: 'Your QR is still active for more than 30 days.' });
  }

  const txnid      = makeTxnid('SQRR');
  const amount     = PLAN_AMOUNT.toFixed(2);
  const productinfo = 'Sampark QR Renewal - 1 Year';
  const firstname  = (user?.name || 'User').split(' ')[0];
  const email      = 'noreply@sampark.app';
  const phone      = user?.phone_hash || '0000000000';

  await Payment.create({
    user_id: req.user.userId,
    vehicle_id,
    txnid,
    amount: PLAN_AMOUNT,
  });

  res.json({
    success: true,
    payu_url: PAYU_URL,
    key:         PAYU_KEY,
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    phone,
    hash: payuRequestHash({ txnid, amount, productinfo, firstname, email }),
  });
});

// GET /api/v1/payments/history/:vehicleId  (protected)
router.get('/history/:vehicleId', async (req, res) => {
  const vehicle = await Vehicle.findOne({ _id: req.params.vehicleId, user_id: req.user.userId }).select('_id');
  if (!vehicle) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  const payments = await Payment.find({ vehicle_id: req.params.vehicleId })
    .sort({ created_at: -1 })
    .select('-__v');

  res.json({ success: true, payments });
});

export default router;
