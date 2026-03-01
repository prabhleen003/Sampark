import express from 'express';
import Vehicle from '../models/Vehicle.js';
import User from '../models/User.js';
import Order from '../models/Order.js';
import { createNotification } from '../services/notification.js';
import {
  parsePeriod, getOverviewStats, getRegistrationTrend,
  getCommunicationTrend, getRevenueTrend, getVerificationStats,
  getQRStatusBreakdown, getAbuseStats, getOrderStats, getTopVehicles,
} from '../utils/analytics.js';

const router = express.Router();
const ORDER_STATUSES = ['paid', 'processing', 'shipped', 'delivered'];

// GET /api/v1/admin/flagged-reviews?page=1&limit=10
// Returns vehicles flagged for manual review (auto-verification failed or abuse flagged)
router.get('/flagged-reviews', async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const filter = { needs_manual_review: true };

  const [vehicles, total] = await Promise.all([
    Vehicle.find(filter)
      .populate('user_id', 'name phone_hash')
      .sort({ created_at: 1 })
      .skip(skip)
      .limit(Number(limit))
      .select('-__v'),
    Vehicle.countDocuments(filter),
  ]);

  res.json({ success: true, vehicles, total, page: Number(page), limit: Number(limit) });
});

// PUT /api/v1/admin/flagged-reviews/:vehicleId
// Admin manually approves or rejects a flagged vehicle
router.put('/flagged-reviews/:vehicleId', async (req, res) => {
  const { action, reason } = req.body;

  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ success: false, message: 'action must be "approve" or "reject"' });
  }
  if (action === 'reject' && !reason?.trim()) {
    return res.status(400).json({ success: false, message: 'rejection reason is required' });
  }

  const vehicle = await Vehicle.findById(req.params.vehicleId);
  if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });
  if (!vehicle.needs_manual_review) {
    return res.status(400).json({ success: false, message: 'Vehicle is not flagged for manual review' });
  }

  if (action === 'reject') {
    vehicle.status             = 'verification_failed';
    vehicle.rejection_reason   = reason.trim();
    vehicle.needs_manual_review = false;
    await vehicle.save();
    await vehicle.populate('user_id', 'name phone_hash');

    createNotification(
      vehicle.user_id._id, 'vehicle_rejected',
      `${vehicle.plate_number} could not be verified`,
      `Reason: ${reason.trim()}. Please re-upload your documents and resubmit.`,
      vehicle._id,
      '/dashboard',
      { plate_number: vehicle.plate_number, reason: reason.trim() }
    );
    return res.json({ success: true, vehicle });
  }

  // Approve — mark verified, clear manual review flag
  vehicle.status              = 'verified';
  vehicle.rejection_reason    = null;
  vehicle.needs_manual_review = false;
  vehicle.verification_method = 'basic';
  vehicle.verification_confidence = 'low';
  await vehicle.save();

  createNotification(
    vehicle.user_id, 'vehicle_verified',
    `${vehicle.plate_number} approved!`,
    'Your vehicle documents have been verified. Pay ₹499 to activate your QR code.',
    vehicle._id,
    '/dashboard',
    { plate_number: vehicle.plate_number }
  );

  await vehicle.populate('user_id', 'name phone_hash');
  res.json({ success: true, vehicle });
});

// GET /api/v1/admin/stats
router.get('/stats', async (req, res) => {
  const [totalUsers, totalVehicles, pending, verified, flaggedReviews, awaitingDigilocker] = await Promise.all([
    User.countDocuments(),
    Vehicle.countDocuments(),
    Vehicle.countDocuments({ status: 'pending' }),
    Vehicle.countDocuments({ status: 'verified' }),
    Vehicle.countDocuments({ needs_manual_review: true }),
    Vehicle.countDocuments({ status: 'awaiting_digilocker' }),
  ]);

  res.json({ success: true, stats: { totalUsers, totalVehicles, pending, verified, flaggedReviews, awaitingDigilocker } });
});

// GET /api/v1/admin/orders?status=paid
router.get('/orders', async (req, res) => {
  const filter = { status: { $nin: ['created'] } };
  if (ORDER_STATUSES.includes(req.query.status)) {
    filter.status = req.query.status;
  }
  const orders = await Order.find(filter)
    .populate('user_id', 'name phone_hash')
    .populate('vehicle_id', 'plate_number')
    .sort({ created_at: -1 })
    .select('-__v');
  res.json({ success: true, orders });
});

// PUT /api/v1/admin/orders/:id
router.put('/orders/:id', async (req, res) => {
  const { status, tracking_id } = req.body;

  if (!ORDER_STATUSES.includes(status)) {
    return res.status(400).json({ success: false, message: `status must be one of: ${ORDER_STATUSES.join(', ')}` });
  }
  if (status === 'shipped' && !tracking_id?.trim()) {
    return res.status(400).json({ success: false, message: 'tracking_id is required when status is shipped' });
  }

  const order = await Order.findByIdAndUpdate(
    req.params.id,
    { status, tracking_id: tracking_id?.trim() || null },
    { new: true }
  ).populate('user_id', 'name phone_hash').populate('vehicle_id', 'plate_number').select('-__v');

  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

  const orderMessages = {
    processing: 'Your Sampark card is being prepared and will ship soon.',
    shipped:    `Your Sampark card has shipped! Tracking ID: ${tracking_id?.trim() || 'pending'}.`,
    delivered:  'Your Sampark card has been delivered. Stick it on your vehicle!',
  };
  const notifTypeMap = { processing: 'order_update', shipped: 'order_shipped', delivered: 'order_delivered' };
  if (orderMessages[status]) {
    createNotification(
      order.user_id._id,
      notifTypeMap[status] || 'order_update',
      `Card order ${status}`,
      orderMessages[status],
      order.vehicle_id._id,
      '/dashboard',
      {
        order_id:    order._id.toString(),
        tracking_id: tracking_id?.trim() || null,
        plate_number: order.vehicle_id.plate_number,
      }
    );
  }

  res.json({ success: true, order });
});

// GET /api/v1/admin/analytics?period=30d
router.get('/analytics', async (req, res) => {
  const period = req.query.period || '30d';
  const days   = parsePeriod(period);

  const [
    overview, registrations, communications,
    revenue, verification, qrStatus,
    abuse, orders, topVehicles,
  ] = await Promise.all([
    getOverviewStats(),
    getRegistrationTrend(days),
    getCommunicationTrend(days),
    getRevenueTrend(days),
    getVerificationStats(),
    getQRStatusBreakdown(),
    getAbuseStats(days),
    getOrderStats(),
    getTopVehicles(),
  ]);

  res.json({
    success: true, period,
    overview, registrations, communications,
    revenue, verification, qrStatus,
    abuse, orders, topVehicles,
  });
});

export default router;
