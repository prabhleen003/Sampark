/**
 * Analytics helper functions — each returns data for one section.
 * All run in parallel via Promise.all in the route.
 */

import User         from '../models/User.js';
import Vehicle      from '../models/Vehicle.js';
import CallLog      from '../models/CallLog.js';
import Payment      from '../models/Payment.js';
import AbuseReport  from '../models/AbuseReport.js';
import Order        from '../models/Order.js';

// ─── Period parser ────────────────────────────────────────────────────────────
export function parsePeriod(period) {
  switch (period) {
    case '7d':  return 7;
    case '90d': return 90;
    case '1y':  return 365;
    case 'all': return 3650; // ~10 years
    default:    return 30;   // '30d'
  }
}

function startDate(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

const DAY_FORMAT = { format: '%Y-%m-%d', date: '$created_at' };

// ─── 1. Overview ──────────────────────────────────────────────────────────────
export async function getOverviewStats() {
  const [
    totalUsers, totalVehicles, activeQRs,
    totalCalls, totalMessages, totalEmergencies,
    openAbuseReports, pendingOrders,
  ] = await Promise.all([
    User.countDocuments({ deleted_at: null }),
    Vehicle.countDocuments(),
    Vehicle.countDocuments({ status: 'verified', qr_valid_until: { $gt: new Date() } }),
    CallLog.countDocuments({ type: 'call' }),
    CallLog.countDocuments({ type: 'message' }),
    CallLog.countDocuments({ type: 'emergency' }),
    AbuseReport.countDocuments({ status: 'open' }),
    Order.countDocuments({ status: 'paid' }),
  ]);

  return { totalUsers, totalVehicles, activeQRs, totalCalls, totalMessages, totalEmergencies, openAbuseReports, pendingOrders };
}

// ─── 2. Registration trend ────────────────────────────────────────────────────
export async function getRegistrationTrend(days) {
  const trend = await User.aggregate([
    { $match: { created_at: { $gte: startDate(days) }, deleted_at: null } },
    { $group: { _id: { $dateToString: DAY_FORMAT }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  return trend.map(d => ({ date: d._id, count: d.count }));
}

// ─── 3. Communication trend ───────────────────────────────────────────────────
export async function getCommunicationTrend(days) {
  const raw = await CallLog.aggregate([
    { $match: { created_at: { $gte: startDate(days) } } },
    { $group: {
      _id: { date: { $dateToString: DAY_FORMAT }, type: '$type' },
      count: { $sum: 1 },
    }},
    { $sort: { '_id.date': 1 } },
  ]);

  // Reshape: { date → { calls, messages, emergencies } }
  const map = {};
  for (const row of raw) {
    const { date, type } = row._id;
    if (!map[date]) map[date] = { date, calls: 0, messages: 0, emergencies: 0 };
    if (type === 'call')      map[date].calls      = row.count;
    if (type === 'message')   map[date].messages   = row.count;
    if (type === 'emergency') map[date].emergencies = row.count;
  }
  return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
}

// ─── 4. Revenue analytics ─────────────────────────────────────────────────────
export async function getRevenueTrend(days) {
  const [totalAgg, periodAgg, overTime, renewed, totalUserCount] = await Promise.all([
    Payment.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Payment.aggregate([
      { $match: { status: 'paid', created_at: { $gte: startDate(days) } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Payment.aggregate([
      { $match: { status: 'paid', created_at: { $gte: startDate(days) } } },
      { $group: {
        _id: { $dateToString: DAY_FORMAT },
        amount: { $sum: '$amount' },
        count: { $sum: 1 },
      }},
      { $sort: { _id: 1 } },
    ]),
    // Vehicles with 2+ paid payments = renewed
    Payment.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: '$vehicle_id', count: { $sum: 1 } } },
      { $match: { count: { $gte: 2 } } },
      { $count: 'total' },
    ]),
    User.countDocuments({ deleted_at: null }),
  ]);

  const totalRevenue  = totalAgg[0]?.total  || 0;
  const periodRevenue = periodAgg[0]?.total || 0;
  const renewedCount  = renewed[0]?.total   || 0;
  const expiredCount  = await Vehicle.countDocuments({ qr_valid_until: { $lt: new Date() }, qr_token: { $ne: null } });
  const totalEligible = expiredCount + renewedCount;
  const renewalRate   = totalEligible > 0 ? Math.round((renewedCount / totalEligible) * 100) : 0;

  return {
    totalRevenue,
    periodRevenue,
    averageRevenuePerUser: totalUserCount > 0 ? Math.round(totalRevenue / totalUserCount) : 0,
    renewalRate,
    revenueOverTime: overTime.map(d => ({ date: d._id, amount: d.amount, count: d.count })),
  };
}

// ─── 5. Verification stats ────────────────────────────────────────────────────
export async function getVerificationStats() {
  const [byMethod, byStatus, failureReasons] = await Promise.all([
    Vehicle.aggregate([
      { $match: { status: 'verified' } },
      { $group: { _id: '$verification_method', count: { $sum: 1 } } },
    ]),
    Vehicle.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Vehicle.aggregate([
      { $match: { status: 'verification_failed', rejection_reason: { $ne: null } } },
      { $group: { _id: '$rejection_reason', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]),
  ]);

  return {
    byMethod: byMethod.map(d => ({ method: d._id || 'unknown', count: d.count })),
    byStatus: byStatus.map(d => ({ status: d._id, count: d.count })),
    failureReasons: failureReasons.map(d => ({ reason: d._id, count: d.count })),
  };
}

// ─── 6. QR status breakdown ───────────────────────────────────────────────────
export async function getQRStatusBreakdown() {
  const now              = new Date();
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const [active, expiringSoon, expired, unpaid] = await Promise.all([
    Vehicle.countDocuments({ qr_valid_until: { $gt: thirtyDaysFromNow } }),
    Vehicle.countDocuments({ qr_valid_until: { $gt: now, $lte: thirtyDaysFromNow } }),
    Vehicle.countDocuments({ qr_valid_until: { $lte: now }, qr_token: { $ne: null } }),
    Vehicle.countDocuments({ status: 'verified', qr_token: null }),
  ]);

  return { active, expiringSoon, expired, unpaid };
}

// ─── 7. Abuse stats ───────────────────────────────────────────────────────────
export async function getAbuseStats(days) {
  const [byStatus, recentTrend, resolutionTime] = await Promise.all([
    AbuseReport.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    AbuseReport.aggregate([
      { $match: { created_at: { $gte: startDate(days) } } },
      { $group: {
        _id: { $dateToString: DAY_FORMAT },
        count: { $sum: 1 },
      }},
      { $sort: { _id: 1 } },
    ]),
    AbuseReport.aggregate([
      { $match: { status: 'reviewed' } },
      { $project: { resolutionMs: { $subtract: ['$updated_at', '$created_at'] } } },
      { $group: { _id: null, avgMs: { $avg: '$resolutionMs' } } },
    ]),
  ]);

  return {
    byStatus:          byStatus.map(d => ({ status: d._id, count: d.count })),
    recentTrend:       recentTrend.map(d => ({ date: d._id, count: d.count })),
    avgResolutionHours: resolutionTime[0]?.avgMs ? resolutionTime[0].avgMs / (1000 * 60 * 60) : null,
  };
}

// ─── 8. Order stats ───────────────────────────────────────────────────────────
export async function getOrderStats() {
  const [byStatus, byType, orderRevAgg] = await Promise.all([
    Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Order.aggregate([
      { $match: { status: { $ne: 'created' } } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]),
    Order.aggregate([
      { $match: { status: { $in: ['paid', 'processing', 'shipped', 'delivered'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);

  return {
    byStatus:     byStatus.map(d => ({ status: d._id, count: d.count })),
    byType:       byType.map(d => ({ type: d._id, count: d.count })),
    orderRevenue: orderRevAgg[0]?.total || 0,
  };
}

// ─── 9. Top vehicles ──────────────────────────────────────────────────────────
export async function getTopVehicles(limit = 10) {
  return CallLog.aggregate([
    {
      $group: {
        _id: '$vehicle_id',
        totalCalls:       { $sum: { $cond: [{ $eq: ['$type', 'call']      }, 1, 0] } },
        totalMessages:    { $sum: { $cond: [{ $eq: ['$type', 'message']   }, 1, 0] } },
        totalEmergencies: { $sum: { $cond: [{ $eq: ['$type', 'emergency'] }, 1, 0] } },
        total:            { $sum: 1 },
      },
    },
    { $sort: { total: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from:         'vehicles',
        localField:   '_id',
        foreignField: '_id',
        as:           'vehicle',
      },
    },
    { $unwind: '$vehicle' },
    {
      $project: {
        plate_number:     '$vehicle.plate_number',
        totalCalls:       1,
        totalMessages:    1,
        totalEmergencies: 1,
        total:            1,
      },
    },
  ]);
}
