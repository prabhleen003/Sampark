import express from 'express';
import { createHash } from 'crypto';
import Vehicle from '../models/Vehicle.js';
import Payment from '../models/Payment.js';
import Order from '../models/Order.js';
import User from '../models/User.js';

const router = express.Router();

const PAYU_KEY  = process.env.PAYU_MERCHANT_KEY;
const PAYU_SALT = process.env.PAYU_MERCHANT_SALT;
const PAYU_URL  = process.env.PAYU_ENV === 'prod'
  ? 'https://secure.payu.in/_payment'
  : 'https://test.payu.in/_payment';

const PINCODE_RE = /^\d{6}$/;
const PHONE_RE   = /^[6-9]\d{9}$/;

function payuRequestHash({ txnid, amount, productinfo, firstname, email }) {
  const str = `${PAYU_KEY}|${txnid}|${amount}|${productinfo}|${firstname}|${email}||||||||||${PAYU_SALT}`;
  return createHash('sha512').update(str).digest('hex');
}

function payuResponseHash({ status, email, firstname, productinfo, amount, txnid }) {
  const str = `${PAYU_SALT}|${status}|||||||||||${email}|${firstname}|${productinfo}|${amount}|${txnid}|${PAYU_KEY}`;
  return createHash('sha512').update(str).digest('hex');
}

function makeTxnid() {
  return `SCRD_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

// POST /api/v1/orders/create  (protected)
router.post('/create', async (req, res) => {
  const { vehicle_id, type = 'standard', delivery_address } = req.body;

  const [vehicle, user] = await Promise.all([
    Vehicle.findOne({ _id: vehicle_id, user_id: req.user.userId }).select('_id status'),
    User.findById(req.user.userId).select('name phone_hash'),
  ]);

  if (!vehicle) {
    return res.status(403).json({ success: false, message: 'Vehicle not found or access denied' });
  }

  const activePayment = await Payment.findOne({
    vehicle_id,
    status: 'paid',
    valid_until: { $gt: new Date() },
  });
  if (!activePayment) {
    return res.status(400).json({ success: false, message: 'No active QR for this vehicle. Complete QR payment first.' });
  }

  if (!['standard', 'express'].includes(type)) {
    return res.status(400).json({ success: false, message: 'Delivery type must be standard or express' });
  }

  const a = delivery_address || {};
  if (!a.name?.trim() || !a.line1?.trim() || !a.city?.trim() || !a.state?.trim()) {
    return res.status(400).json({ success: false, message: 'name, line1, city, and state are required' });
  }
  if (!PINCODE_RE.test(a.pincode)) {
    return res.status(400).json({ success: false, message: 'Pincode must be 6 digits' });
  }
  if (!PHONE_RE.test(a.phone)) {
    return res.status(400).json({ success: false, message: 'Enter a valid 10-digit Indian mobile number' });
  }

  const amountRupees = type === 'express' ? 199 : 99;
  const txnid        = makeTxnid();
  const amount       = amountRupees.toFixed(2);
  const productinfo  = `Sampark Physical Card - ${type === 'express' ? 'Express' : 'Standard'} Delivery`;
  const firstname    = (user?.name || 'User').split(' ')[0];
  const email        = 'noreply@sampark.app';
  const phone        = user?.phone_hash || '0000000000';

  await Order.create({
    user_id: req.user.userId,
    vehicle_id,
    type,
    delivery_address: {
      name:    a.name.trim(),
      line1:   a.line1.trim(),
      line2:   a.line2?.trim() || '',
      city:    a.city.trim(),
      state:   a.state.trim(),
      pincode: a.pincode,
      phone:   a.phone,
    },
    amount: amountRupees,
    txnid,
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

// POST /api/v1/orders/verify  (protected)
router.post('/verify', async (req, res) => {
  const { txnid, mihpayid, status, hash, amount, productinfo, firstname, email } = req.body;

  if (!txnid || !mihpayid || !status || !hash) {
    return res.status(400).json({ success: false, message: 'Missing payment details' });
  }

  const order = await Order.findOne({ txnid });
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

  if (order.user_id.toString() !== req.user.userId) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  const expectedHash = payuResponseHash({ status, email, firstname, productinfo, amount, txnid });
  if (expectedHash !== hash) {
    return res.status(400).json({ success: false, message: 'Payment verification failed' });
  }

  if (status !== 'success') {
    return res.status(400).json({ success: false, message: 'Payment was not successful' });
  }

  order.mihpayid = mihpayid;
  order.status   = 'paid';
  await order.save();

  res.json({ success: true, order_id: order._id });
});

// GET /api/v1/orders  (protected)
router.get('/', async (req, res) => {
  const orders = await Order.find({ user_id: req.user.userId })
    .populate('vehicle_id', 'plate_number')
    .sort({ created_at: -1 })
    .select('-__v');
  res.json({ success: true, orders });
});

// GET /api/v1/orders/:id  (protected)
router.get('/:id', async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('vehicle_id', 'plate_number')
    .select('-__v');
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  if (order.user_id.toString() !== req.user.userId) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  res.json({ success: true, order });
});

export default router;
