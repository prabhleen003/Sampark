import express from 'express';
import Vehicle      from '../models/Vehicle.js';
import User         from '../models/User.js';
import Order        from '../models/Order.js';
import AbuseReport  from '../models/AbuseReport.js';
import CallLog      from '../models/CallLog.js';
import Blocklist    from '../models/Blocklist.js';
import PublicReport   from '../models/PublicReport.js';
import SupportTicket from '../models/SupportTicket.js';
import { createNotification } from '../services/notification.js';
import { getCallerProfile }   from '../utils/callerProfile.js';
import {
  parsePeriod, getOverviewStats, getRegistrationTrend,
  getCommunicationTrend, getRevenueTrend, getVerificationStats,
  getQRStatusBreakdown, getAbuseStats, getOrderStats, getTopVehicles,
} from '../utils/analytics.js';

const router = express.Router();
const ORDER_FILTER_STATUSES = ['paid', 'processing', 'shipped', 'delivered', 'cancelled'];
const ORDER_UPDATE_STATUSES = ['paid', 'processing', 'shipped', 'delivered'];

// ── Flagged Reviews ────────────────────────────────────────────────────────────

// GET /api/v1/admin/flagged-reviews?page=1&limit=10
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
    vehicle.status              = 'verification_failed';
    vehicle.rejection_reason    = reason.trim();
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

  vehicle.status               = 'verified';
  vehicle.rejection_reason     = null;
  vehicle.needs_manual_review  = false;
  vehicle.verification_method  = 'basic';
  vehicle.verification_confidence = 'low';
  vehicle.verification_failed_count = 0;  // reset counter on admin approval
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

// ── Stats ──────────────────────────────────────────────────────────────────────

// GET /api/v1/admin/stats
router.get('/stats', async (req, res) => {
  const [totalUsers, totalVehicles, pending, verified, flaggedReviews, awaitingDigilocker, suspended, openReports] = await Promise.all([
    User.countDocuments(),
    Vehicle.countDocuments(),
    Vehicle.countDocuments({ status: 'pending' }),
    Vehicle.countDocuments({ status: 'verified' }),
    Vehicle.countDocuments({ needs_manual_review: true }),
    Vehicle.countDocuments({ status: 'awaiting_digilocker' }),
    Vehicle.countDocuments({ status: 'suspended' }),
    AbuseReport.countDocuments({ status: 'open' }),
  ]);

  res.json({ success: true, stats: { totalUsers, totalVehicles, pending, verified, flaggedReviews, awaitingDigilocker, suspended, openReports } });
});

// ── Orders ─────────────────────────────────────────────────────────────────────

// GET /api/v1/admin/orders?status=paid
router.get('/orders', async (req, res) => {
  const filter = { status: { $nin: ['created'] } };
  if (ORDER_FILTER_STATUSES.includes(req.query.status)) {
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

  if (!ORDER_UPDATE_STATUSES.includes(status)) {
    return res.status(400).json({ success: false, message: `status must be one of: ${ORDER_UPDATE_STATUSES.join(', ')}` });
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
        order_id:     order._id.toString(),
        tracking_id:  tracking_id?.trim() || null,
        plate_number: order.vehicle_id.plate_number,
      }
    );
  }

  res.json({ success: true, order });
});

// ── Analytics ──────────────────────────────────────────────────────────────────

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

// ── Abuse Reports ──────────────────────────────────────────────────────────────

// GET /api/v1/admin/abuse-reports?status=open&page=1&limit=20
router.get('/abuse-reports', async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const filter = {};
  if (status && ['open', 'reviewed', 'resolved'].includes(status)) filter.status = status;

  const reports = await AbuseReport.find(filter)
    .populate('call_log_id')
    .populate({ path: 'vehicle_id', select: 'plate_number user_id status', populate: { path: 'user_id', select: 'name' } })
    .populate('reported_by_user_id', 'name')
    .sort({ created_at: -1 })
    .skip(skip)
    .limit(Number(limit))
    .select('-__v');

  // Enrich each report with caller profile and cross-counts
  const enriched = await Promise.all(reports.map(async (r) => {
    const callerHash = r.caller_hash || r.call_log_id?.sender_phone_hash;
    const [callerProfile, otherCallerReports, otherVehicleReports] = await Promise.all([
      callerHash ? getCallerProfile(callerHash) : null,
      callerHash
        ? AbuseReport.countDocuments({ caller_hash: callerHash, _id: { $ne: r._id } })
        : 0,
      AbuseReport.countDocuments({ vehicle_id: r.vehicle_id?._id, _id: { $ne: r._id } }),
    ]);
    return { ...r.toObject(), caller_profile: callerProfile, other_caller_reports: otherCallerReports, other_vehicle_reports: otherVehicleReports };
  }));

  // Sort high-risk callers first, then by date
  enriched.sort((a, b) => {
    const riskOrder = { high: 0, medium: 1, low: 2 };
    const aRisk = riskOrder[a.caller_profile?.risk_level] ?? 3;
    const bRisk = riskOrder[b.caller_profile?.risk_level] ?? 3;
    if (aRisk !== bRisk) return aRisk - bRisk;
    return new Date(b.created_at) - new Date(a.created_at);
  });

  const total = await AbuseReport.countDocuments(filter);
  res.json({ success: true, reports: enriched, total, page: Number(page), limit: Number(limit) });
});

// GET /api/v1/admin/abuse-reports/:id
router.get('/abuse-reports/:id', async (req, res) => {
  const report = await AbuseReport.findById(req.params.id)
    .populate('call_log_id')
    .populate({ path: 'vehicle_id', select: 'plate_number user_id status', populate: { path: 'user_id', select: 'name' } })
    .populate('reported_by_user_id', 'name');

  if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

  const callerHash = report.caller_hash || report.call_log_id?.sender_phone_hash;

  // Full caller timeline for this vehicle
  const timeline = callerHash && report.vehicle_id?._id
    ? await CallLog.find({
        vehicle_id: report.vehicle_id._id,
        sender_phone_hash: callerHash,
      }).sort({ created_at: -1 }).limit(50)
    : [];

  // All other reports involving either party
  const relatedReports = await AbuseReport.find({
    $or: [
      { caller_hash: callerHash },
      { vehicle_id: report.vehicle_id?._id },
    ],
    _id: { $ne: report._id },
  }).populate('call_log_id').select('-__v').sort({ created_at: -1 }).limit(20);

  const [callerProfile, otherCallerReports, otherVehicleReports] = await Promise.all([
    callerHash ? getCallerProfile(callerHash) : null,
    callerHash ? AbuseReport.countDocuments({ caller_hash: callerHash, _id: { $ne: report._id } }) : 0,
    AbuseReport.countDocuments({ vehicle_id: report.vehicle_id?._id, _id: { $ne: report._id } }),
  ]);

  res.json({
    success: true,
    report: report.toObject(),
    caller_profile: callerProfile,
    timeline,
    related_reports: relatedReports,
    other_caller_reports: otherCallerReports,
    other_vehicle_reports: otherVehicleReports,
  });
});

// PUT /api/v1/admin/abuse-reports/:id — take action on a report
router.put('/abuse-reports/:id', async (req, res) => {
  const { action, notes, block_duration } = req.body;

  const VALID_ACTIONS = ['dismiss', 'warn_caller', 'block_caller_vehicle', 'block_caller_global', 'suspend_vehicle'];
  if (!VALID_ACTIONS.includes(action)) {
    return res.status(400).json({ success: false, message: `action must be one of: ${VALID_ACTIONS.join(', ')}` });
  }

  const report = await AbuseReport.findById(req.params.id).populate('call_log_id');
  if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
  if (report.status === 'resolved') {
    return res.status(400).json({ success: false, message: 'Report is already resolved' });
  }

  const vehicle = await Vehicle.findById(report.vehicle_id).select('plate_number user_id status');
  if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });

  const callerHash = report.caller_hash || report.call_log_id?.sender_phone_hash;

  const expiresAt = block_duration
    ? new Date(Date.now() + Number(block_duration) * 24 * 60 * 60 * 1000)
    : null;

  switch (action) {
    case 'dismiss':
      report.status      = 'resolved';
      report.resolution  = 'dismissed';
      report.admin_notes = notes || null;
      await report.save();

      createNotification(report.reported_by_user_id, 'abuse_report_resolved',
        'Report Reviewed',
        'Your abuse report has been reviewed and closed.',
        report.vehicle_id, '/dashboard', { report_id: report._id.toString() }
      );
      break;

    case 'warn_caller':
      report.status      = 'resolved';
      report.resolution  = 'caller_warned';
      report.admin_notes = notes || null;
      await report.save();

      createNotification(report.reported_by_user_id, 'abuse_report_resolved',
        'Report Resolved',
        'Action has been taken on your abuse report. The caller has been warned.',
        report.vehicle_id, '/dashboard', { report_id: report._id.toString() }
      );
      break;

    case 'block_caller_vehicle':
      if (!callerHash) {
        return res.status(400).json({ success: false, message: 'No caller identifier on this report' });
      }
      await Blocklist.create({
        vehicle_id: report.vehicle_id,
        caller_hash: callerHash,
        reason:     notes || 'Blocked by admin via abuse report',
        blocked_by: req.user.userId,
        block_type: 'vehicle_specific',
        expires_at: expiresAt,
      });

      report.status      = 'resolved';
      report.resolution  = 'caller_blocked_vehicle';
      report.admin_notes = notes || null;
      await report.save();

      createNotification(report.reported_by_user_id, 'abuse_report_resolved',
        'Caller Blocked',
        `The reported caller has been blocked from contacting vehicle ${vehicle.plate_number}.`,
        report.vehicle_id, '/dashboard', { report_id: report._id.toString() }
      );
      break;

    case 'block_caller_global':
      if (!callerHash) {
        return res.status(400).json({ success: false, message: 'No caller identifier on this report' });
      }
      await Blocklist.create({
        vehicle_id: null,
        caller_hash: callerHash,
        reason:     notes || 'Globally blocked by admin via abuse report',
        blocked_by: req.user.userId,
        block_type: 'global',
        expires_at: expiresAt,
      });

      report.status      = 'resolved';
      report.resolution  = 'caller_blocked_global';
      report.admin_notes = notes || null;
      await report.save();

      createNotification(report.reported_by_user_id, 'abuse_report_resolved',
        'Caller Blocked',
        'The reported caller has been permanently blocked from the platform.',
        report.vehicle_id, '/dashboard', { report_id: report._id.toString() }
      );
      break;

    case 'suspend_vehicle':
      await Vehicle.findByIdAndUpdate(report.vehicle_id, {
        status:           'suspended',
        suspension_reason: notes || 'Suspended due to reported abuse',
      });

      report.status      = 'resolved';
      report.resolution  = 'vehicle_suspended';
      report.admin_notes = notes || null;
      await report.save();

      createNotification(vehicle.user_id, 'vehicle_suspended',
        'Vehicle Suspended',
        `Vehicle ${vehicle.plate_number} has been suspended due to reported abuse. Contact support for details.`,
        report.vehicle_id, '/dashboard', { plate_number: vehicle.plate_number }
      );
      break;
  }

  res.json({ success: true, report });
});

// ── Blocklist Management ───────────────────────────────────────────────────────

// GET /api/v1/admin/blocklist?type=global&active=true
router.get('/blocklist', async (req, res) => {
  const { type, active } = req.query;
  const filter = {};

  if (type && ['global', 'vehicle_specific'].includes(type)) filter.block_type = type;

  if (active === 'true') {
    filter.$and = [
      { $or: [{ expires_at: null }, { expires_at: { $gt: new Date() } }] },
    ];
  } else if (active === 'false') {
    filter.expires_at = { $lte: new Date() };
  }

  const blocks = await Blocklist.find(filter)
    .populate('blocked_by', 'name')
    .populate('vehicle_id', 'plate_number')
    .sort({ created_at: -1 })
    .select('-__v');

  res.json({ success: true, blocks });
});

// DELETE /api/v1/admin/blocklist/:id — unblock a caller
router.delete('/blocklist/:id', async (req, res) => {
  const block = await Blocklist.findByIdAndDelete(req.params.id);
  if (!block) return res.status(404).json({ success: false, message: 'Block not found' });

  console.log(`[AUDIT] Admin ${req.user.userId} removed block ${req.params.id} (${block.block_type}, caller: ${block.caller_hash.slice(0, 8)}...)`);

  res.json({ success: true, message: 'Block removed successfully' });
});

// ── Suspended Vehicles ─────────────────────────────────────────────────────────

// GET /api/v1/admin/suspended-vehicles
router.get('/suspended-vehicles', async (req, res) => {
  const vehicles = await Vehicle.find({ status: 'suspended' })
    .populate('user_id', 'name phone_hash')
    .sort({ updated_at: -1 })
    .select('plate_number user_id status suspension_reason updated_at');

  res.json({ success: true, vehicles });
});

// PUT /api/v1/admin/suspended-vehicles/:id/unsuspend
router.put('/suspended-vehicles/:id/unsuspend', async (req, res) => {
  const { notes } = req.body;
  if (!notes?.trim()) {
    return res.status(400).json({ success: false, message: 'Admin notes are required when unsuspending' });
  }

  const vehicle = await Vehicle.findById(req.params.id).populate('user_id', 'name');
  if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });
  if (vehicle.status !== 'suspended') {
    return res.status(400).json({ success: false, message: 'Vehicle is not suspended' });
  }

  vehicle.status           = 'verified';
  vehicle.suspension_reason = null;
  await vehicle.save();

  createNotification(vehicle.user_id._id, 'vehicle_verified',
    'Vehicle Reinstated',
    `Vehicle ${vehicle.plate_number} has been unsuspended. Your QR code is now active again.`,
    vehicle._id, '/dashboard',
    { plate_number: vehicle.plate_number, admin_notes: notes.trim() }
  );

  res.json({ success: true, vehicle });
});

// ── Public Reports ─────────────────────────────────────────────────────────────

// GET /api/v1/admin/public-reports?status=open&page=1&limit=20
router.get('/public-reports', async (req, res) => {
  const { status = 'open', page = 1, limit = 20 } = req.query;
  const VALID_STATUSES = ['open', 'reviewed', 'dismissed'];
  const filter = VALID_STATUSES.includes(status) ? { status } : { status: 'open' };
  const skip = (Number(page) - 1) * Number(limit);

  const [reports, total] = await Promise.all([
    PublicReport.find(filter)
      .populate('vehicle_id', 'plate_number status user_id')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(Number(limit))
      .select('-__v'),
    PublicReport.countDocuments(filter),
  ]);

  // Tag reports from vehicles with 3+ open reports
  const vehicleReportCounts = {};
  await Promise.all(
    [...new Set(reports.map(r => r.vehicle_id?._id?.toString()).filter(Boolean))].map(async vid => {
      vehicleReportCounts[vid] = await PublicReport.countDocuments({ vehicle_id: vid, status: 'open' });
    })
  );

  const enriched = reports.map(r => ({
    ...r.toObject(),
    vehicle_open_report_count: vehicleReportCounts[r.vehicle_id?._id?.toString()] || 0,
  }));

  res.json({ success: true, reports: enriched, total, page: Number(page) });
});

// PUT /api/v1/admin/public-reports/:id — dismiss or investigate
router.put('/public-reports/:id', async (req, res) => {
  const { action, notes } = req.body;
  if (!['dismiss', 'investigate'].includes(action)) {
    return res.status(400).json({ success: false, message: 'action must be dismiss or investigate' });
  }

  const report = await PublicReport.findById(req.params.id);
  if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

  if (action === 'dismiss') {
    report.status      = 'dismissed';
    report.admin_notes = notes?.trim() || null;
    await report.save();
    return res.json({ success: true, report });
  }

  // investigate: flag vehicle for manual review
  const vehicle = await Vehicle.findById(report.vehicle_id).select('plate_number user_id needs_manual_review');
  if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });

  vehicle.needs_manual_review = true;
  await vehicle.save();

  report.status      = 'reviewed';
  report.admin_notes = notes?.trim() || null;
  await report.save();

  // Notify admins
  const admins = await User.find({ role: 'admin' }).select('_id');
  admins.forEach(a => {
    createNotification(a._id, 'verification_update',
      'Public Report — Vehicle Flagged for Review',
      `Vehicle ${vehicle.plate_number} has been flagged for review based on a public report.`,
      report.vehicle_id, '/admin/verifications',
      { report_id: report._id.toString(), plate_number: vehicle.plate_number }
    );
  });

  res.json({ success: true, report, vehicle: { plate_number: vehicle.plate_number, needs_manual_review: true } });
});

// ── Admin Support Routes ───────────────────────────────────────────────────────

const PRIORITY_WEIGHT = { critical: 0, high: 1, medium: 2, low: 3 };

// GET /api/v1/admin/support/stats
router.get('/support/stats', async (req, res) => {
  const openTickets = await SupportTicket.countDocuments({ status: { $in: ['open', 'in_progress', 'awaiting_user'] } });

  const allTickets = await SupportTicket.find({});
  let totalFirstResponse = 0, firstResponseCount = 0;
  let totalResolution = 0;
  const resolvedTickets = [];

  allTickets.forEach(t => {
    const firstAdmin = t.messages.find(m => m.sender === 'admin');
    if (firstAdmin && t.messages[0]) {
      totalFirstResponse += new Date(firstAdmin.created_at) - new Date(t.messages[0].created_at);
      firstResponseCount++;
    }
    if (t.resolved_at) { totalResolution += new Date(t.resolved_at) - new Date(t.created_at); resolvedTickets.push(t); }
  });

  const [byCategory, satisfaction] = await Promise.all([
    SupportTicket.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    SupportTicket.aggregate([{ $match: { satisfaction_rating: { $ne: null } } }, { $group: { _id: null, avg: { $avg: '$satisfaction_rating' }, count: { $sum: 1 } } }]),
  ]);

  res.json({
    success: true,
    open_tickets: openTickets,
    avg_first_response_hours: firstResponseCount > 0 ? Math.round((totalFirstResponse / firstResponseCount) / 3600000 * 10) / 10 : 0,
    avg_resolution_hours: resolvedTickets.length > 0 ? Math.round((totalResolution / resolvedTickets.length) / 3600000 * 10) / 10 : 0,
    by_category: byCategory,
    satisfaction_avg: satisfaction[0]?.avg ? Math.round(satisfaction[0].avg * 10) / 10 : null,
    satisfaction_count: satisfaction[0]?.count || 0,
  });
});

// GET /api/v1/admin/support
router.get('/support', async (req, res) => {
  const { status, priority, category, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  else filter.status = { $in: ['open', 'in_progress'] };
  if (priority) filter.priority = priority;
  if (category) filter.category = category;

  const skip = (Number(page) - 1) * Number(limit);
  const [tickets, total] = await Promise.all([
    SupportTicket.find(filter).populate('user_id', 'name').populate('vehicle_id', 'plate_number status').sort({ updated_at: -1 }).skip(skip).limit(Number(limit)),
    SupportTicket.countDocuments(filter),
  ]);

  const enriched = tickets.map(t => {
    const last = t.messages[t.messages.length - 1];
    const needsResponse = last?.sender === 'user';
    let timeSinceUser = null;
    for (let i = t.messages.length - 1; i >= 0; i--) {
      if (t.messages[i].sender === 'user') { timeSinceUser = Date.now() - new Date(t.messages[i].created_at); break; }
    }
    return {
      ...t.toObject(),
      message_count: t.messages.length,
      needs_response: needsResponse,
      time_since_user_message: timeSinceUser,
      last_message: last ? { text: last.text.slice(0, 100), sender: last.sender, created_at: last.created_at } : null,
    };
  });

  enriched.sort((a, b) => {
    const wa = PRIORITY_WEIGHT[a.priority] ?? 2, wb = PRIORITY_WEIGHT[b.priority] ?? 2;
    if (wa !== wb) return wa - wb;
    if (a.needs_response && !b.needs_response) return -1;
    if (!a.needs_response && b.needs_response) return 1;
    return new Date(b.updated_at) - new Date(a.updated_at);
  });

  res.json({ success: true, tickets: enriched, total, page: Number(page), total_pages: Math.ceil(total / Number(limit)) });
});

// GET /api/v1/admin/support/:ticketId
router.get('/support/:ticketId', async (req, res) => {
  const ticket = await SupportTicket.findById(req.params.ticketId)
    .populate('user_id', 'name created_at')
    .populate('vehicle_id', 'plate_number status qr_valid_until');
  if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

  const userId = ticket.user_id._id;
  const [vehicleCount, previousTickets] = await Promise.all([
    Vehicle.countDocuments({ user_id: userId }),
    SupportTicket.countDocuments({ user_id: userId, _id: { $ne: ticket._id } }),
  ]);

  res.json({
    success: true,
    ticket,
    user_context: {
      name: ticket.user_id.name,
      account_age_days: Math.floor((Date.now() - new Date(ticket.user_id.created_at)) / 86400000),
      vehicle_count: vehicleCount,
      previous_tickets: previousTickets,
    },
  });
});

// POST /api/v1/admin/support/:ticketId/message
router.post('/support/:ticketId/message', async (req, res) => {
  const { text, set_awaiting } = req.body;
  if (!text?.trim() || text.trim().length > 2000) return res.status(400).json({ success: false, message: 'Message required, max 2000 characters' });

  const ticket = await SupportTicket.findById(req.params.ticketId);
  if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
  if (ticket.status === 'closed') return res.status(400).json({ success: false, message: 'Cannot reply to a closed ticket' });

  ticket.messages.push({ sender: 'admin', sender_id: req.user?.userId || null, sender_name: 'Sampaark Support', text: text.trim() });
  if (set_awaiting) ticket.status = 'awaiting_user';
  else if (ticket.status === 'open') ticket.status = 'in_progress';
  ticket.updated_at = new Date();
  await ticket.save();

  createNotification(
    ticket.user_id, 'support_reply',
    `New Reply on Ticket ${ticket.ticket_number}`,
    `Sampaark Support replied: "${text.trim().slice(0, 80)}${text.trim().length > 80 ? '…' : ''}"`,
    null, '/support/tickets',
    { ticket_id: ticket._id.toString() }
  );

  res.json({ success: true, ticket });
});

// PUT /api/v1/admin/support/:ticketId/status
router.put('/support/:ticketId/status', async (req, res) => {
  const { status, notes } = req.body;
  const VALID = ['open', 'in_progress', 'awaiting_user', 'resolved', 'closed'];
  if (!VALID.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status' });

  const ticket = await SupportTicket.findById(req.params.ticketId);
  if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

  const oldStatus = ticket.status;
  ticket.status = status;
  if (status === 'resolved') ticket.resolved_at = new Date();
  if (status === 'closed')   ticket.closed_at   = new Date();

  const noteText = notes?.trim() ? ` Note: ${notes.trim()}` : '';
  ticket.messages.push({ sender: 'system', sender_id: null, sender_name: 'System', text: `Ticket status changed from ${oldStatus} to ${status}.${noteText}` });
  ticket.updated_at = new Date();
  await ticket.save();

  const statusLabels = { resolved: 'Your support ticket has been resolved.', closed: 'Your support ticket has been closed.', in_progress: 'Your support ticket is being worked on.', awaiting_user: 'Your support ticket needs your response.' };
  if (statusLabels[status]) {
    createNotification(ticket.user_id, 'support_status_update', `Ticket ${ticket.ticket_number} Updated`, statusLabels[status], null, '/support/tickets', { ticket_id: ticket._id.toString() });
  }

  res.json({ success: true, ticket });
});

// PUT /api/v1/admin/support/:ticketId/priority
router.put('/support/:ticketId/priority', async (req, res) => {
  const { priority } = req.body;
  if (!['low', 'medium', 'high', 'critical'].includes(priority)) return res.status(400).json({ success: false, message: 'Invalid priority' });

  const ticket = await SupportTicket.findById(req.params.ticketId);
  if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

  const old = ticket.priority;
  ticket.priority = priority;
  ticket.messages.push({ sender: 'system', sender_id: null, sender_name: 'System', text: `Priority changed from ${old} to ${priority}.` });
  ticket.updated_at = new Date();
  await ticket.save();
  res.json({ success: true, ticket });
});

export default router;
