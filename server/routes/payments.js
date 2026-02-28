import express from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import QRCode from 'qrcode';
import Vehicle from '../models/Vehicle.js';
import Payment from '../models/Payment.js';
import { generateSignedUrl } from '../utils/qr.js';

const router = express.Router();

function getRazorpay() {
  return new Razorpay({
    key_id:     process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

// POST /api/v1/payments/create-order  (protected)
router.post('/create-order', async (req, res) => {
  const { vehicle_id } = req.body;

  // 1. Verify vehicle ownership
  const vehicle = await Vehicle.findOne({ _id: vehicle_id, user_id: req.user.userId });
  if (!vehicle) {
    return res.status(403).json({ success: false, message: 'Vehicle not found or access denied' });
  }

  // 2. Vehicle must be admin-approved
  if (vehicle.status !== 'verified') {
    return res.status(400).json({ success: false, message: 'Vehicle not approved yet' });
  }

  // 3. No active payment already
  const existing = await Payment.findOne({
    vehicle_id,
    status: 'paid',
    valid_until: { $gt: new Date() },
  });
  if (existing) {
    return res.status(400).json({ success: false, message: 'QR already active for this vehicle' });
  }

  // 4. Create Razorpay order
  const amount = parseInt(process.env.RAZORPAY_PLAN_AMOUNT) || 49900;
  const razorpay = getRazorpay();

  let order;
  try {
    order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: `sampark_${vehicle_id}_${Date.now()}`,
    });
  } catch (err) {
    console.error('Razorpay order creation failed:', err.message);
    return res.status(502).json({ success: false, message: 'Payment service unavailable. Please try again.' });
  }

  // 5. Save pending payment record
  await Payment.create({
    user_id: req.user.userId,
    vehicle_id,
    razorpay_order_id: order.id,
    amount,
  });

  res.json({
    success: true,
    order_id: order.id,
    amount:   order.amount,
    currency: order.currency,
    key_id:   process.env.RAZORPAY_KEY_ID,
  });
});

// POST /api/v1/payments/verify  (protected)
router.post('/verify', async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, vehicle_id } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ success: false, message: 'Missing payment details' });
  }

  // 1. Find payment record
  const payment = await Payment.findOne({ razorpay_order_id });
  if (!payment) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  // 2. Verify vehicle belongs to requesting user
  const vehicle = await Vehicle.findOne({ _id: payment.vehicle_id, user_id: req.user.userId });
  if (!vehicle) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  // 3. HMAC signature verification
  const expectedSig = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (expectedSig !== razorpay_signature) {
    payment.status = 'failed';
    await payment.save();
    return res.status(400).json({ success: false, message: 'Payment verification failed' });
  }

  // 4. Mark payment as paid with 1-year validity
  const now = new Date();
  const validUntil = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

  payment.razorpay_payment_id = razorpay_payment_id;
  payment.razorpay_signature  = razorpay_signature;
  payment.status              = 'paid';
  payment.valid_from          = now;
  payment.valid_until         = validUntil;
  await payment.save();

  // 5. Generate QR for the vehicle
  const { url, sig } = generateSignedUrl(vehicle._id.toString());
  const qrDataUrl = await QRCode.toDataURL(url, { width: 400, margin: 2 });

  vehicle.qr_token     = sig;
  vehicle.qr_image_url = qrDataUrl;
  vehicle.qr_valid_until = validUntil;
  await vehicle.save();

  res.json({ success: true, message: 'Payment successful. QR generated.' });
});

// GET /api/v1/payments/status/:vehicleId  (protected)
router.get('/status/:vehicleId', async (req, res) => {
  // Verify vehicle ownership
  const vehicle = await Vehicle.findOne({ _id: req.params.vehicleId, user_id: req.user.userId }).select('_id');
  if (!vehicle) {
    return res.status(403).json({ success: false, message: 'Vehicle not found or access denied' });
  }

  const payment = await Payment.findOne({ vehicle_id: req.params.vehicleId })
    .sort({ created_at: -1 })
    .select('-__v -razorpay_signature');

  res.json({ success: true, payment: payment || null });
});

export default router;
