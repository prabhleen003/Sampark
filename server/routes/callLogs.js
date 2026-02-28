import express from 'express';
import CallLog from '../models/CallLog.js';
import Vehicle from '../models/Vehicle.js';
import AbuseReport from '../models/AbuseReport.js';

const router = express.Router();

const VALID_REASONS = ['harassment', 'spam', 'threatening', 'other'];

// POST /api/v1/call-logs/:logId/report  (protected)
router.post('/:logId/report', async (req, res) => {
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

  await AbuseReport.create({
    call_log_id:        log._id,
    vehicle_id:         log.vehicle_id,
    reported_by_user_id:req.user.userId,
    reason,
  });

  // Auto-flag vehicle if it has 3+ open abuse reports
  const openCount = await AbuseReport.countDocuments({ vehicle_id: log.vehicle_id, status: 'open' });
  if (openCount >= 3 && !vehicle.flagged_for_review) {
    vehicle.flagged_for_review = true;
    await vehicle.save();
  }

  res.json({ success: true, message: 'Report submitted. We\'ll review it shortly.' });
});

export default router;
