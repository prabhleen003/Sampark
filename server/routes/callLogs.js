import express from 'express';
import CallLog     from '../models/CallLog.js';
import Vehicle     from '../models/Vehicle.js';
import AbuseReport from '../models/AbuseReport.js';
import Blocklist   from '../models/Blocklist.js';
import User        from '../models/User.js';
import { refreshPrivacyScore } from '../utils/privacyScore.js';
import { createNotification }  from '../services/notification.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

const VALID_REASONS = ['harassment', 'spam', 'threatening', 'other'];

/**
 * Auto-escalation: run after every new abuse report is created.
 * - Vehicle with 5+ reports in 7 days → auto-suspend + notify admins
 * - Caller with 3+ reports across any vehicle → auto-block globally for 7 days
 */
async function checkAutoEscalation(vehicleId, callerHash) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [vehicleReports, admins] = await Promise.all([
    AbuseReport.countDocuments({ vehicle_id: vehicleId, created_at: { $gte: sevenDaysAgo } }),
    User.find({ role: 'admin' }).select('_id'),
  ]);

  if (vehicleReports >= 5) {
    const vehicle = await Vehicle.findById(vehicleId).select('status plate_number suspension_reason');
    if (vehicle && vehicle.status !== 'suspended') {
      await Vehicle.findByIdAndUpdate(vehicleId, {
        status:           'suspended',
        suspension_reason: `Auto-suspended: ${vehicleReports} abuse reports in 7 days`,
      });

      for (const admin of admins) {
        createNotification(
          admin._id, 'auto_suspension',
          'Vehicle Auto-Suspended',
          `Vehicle received ${vehicleReports} abuse reports in 7 days. Auto-suspended for review.`,
          vehicleId, '/admin/suspended-vehicles',
          { vehicle_id: vehicleId.toString(), report_count: vehicleReports }
        );
      }
    }
  }

  if (callerHash) {
    const callerLogIds = await CallLog.find({ sender_phone_hash: callerHash }).distinct('_id');
    const callerReports = await AbuseReport.countDocuments({ call_log_id: { $in: callerLogIds } });

    if (callerReports >= 3) {
      const existingBlock = await Blocklist.findOne({ caller_hash: callerHash, block_type: 'global' });
      if (!existingBlock) {
        await Blocklist.create({
          vehicle_id: null,
          caller_hash: callerHash,
          reason:     `Auto-blocked: ${callerReports} abuse reports across vehicles`,
          blocked_by: null, // system action
          block_type: 'global',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });
      }
    }
  }
}

// POST /api/v1/call-logs/:logId/report  (protected — auth enforced here and at mount level)
router.post('/:logId/report', authMiddleware, async (req, res) => {
  const { reason } = req.body;

  if (!reason || !VALID_REASONS.includes(reason)) {
    return res.status(400).json({ success: false, message: 'Provide a valid reason: harassment, spam, threatening, or other' });
  }

  const log = await CallLog.findById(req.params.logId);
  if (!log) {
    return res.status(404).json({ success: false, message: 'Log entry not found' });
  }

  // Verify the vehicle belongs to the requesting user
  const vehicle = await Vehicle.findOne({ _id: log.vehicle_id, user_id: req.user.userId });
  if (!vehicle) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  const callerHash = log.sender_phone_hash || null;

  await AbuseReport.create({
    call_log_id:         log._id,
    vehicle_id:          log.vehicle_id,
    reported_by_user_id: req.user.userId,
    caller_hash:         callerHash,
    reason,
  });

  // Auto-flag vehicle if it has 3+ open abuse reports
  const openCount = await AbuseReport.countDocuments({ vehicle_id: log.vehicle_id, status: 'open' });
  if (openCount >= 3 && !vehicle.flagged_for_review) {
    vehicle.flagged_for_review = true;
    await vehicle.save();
  }

  res.json({ success: true, message: 'Report submitted. We\'ll review it shortly.' });

  // Async tasks — don't block response
  const reportedVehicle = await Vehicle.findById(log.vehicle_id).select('user_id');
  if (reportedVehicle) refreshPrivacyScore(reportedVehicle.user_id);

  checkAutoEscalation(log.vehicle_id, callerHash).catch(e =>
    console.error('Auto-escalation error:', e.message)
  );
});

export default router;
