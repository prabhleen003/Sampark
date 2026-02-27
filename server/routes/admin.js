import express from 'express';
import Vehicle from '../models/Vehicle.js';
import User from '../models/User.js';

const router = express.Router();

// GET /api/v1/admin/verifications?status=pending&page=1&limit=10
router.get('/verifications', async (req, res) => {
  const { status = 'pending', page = 1, limit = 10 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const filter = {};
  if (['pending', 'verified', 'rejected'].includes(status)) {
    filter.status = status;
  }

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

// PUT /api/v1/admin/verifications/:vehicleId
router.put('/verifications/:vehicleId', async (req, res) => {
  const { action, reason } = req.body;

  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ success: false, message: 'action must be "approve" or "reject"' });
  }
  if (action === 'reject' && !reason?.trim()) {
    return res.status(400).json({ success: false, message: 'rejection reason is required' });
  }

  const update = action === 'approve'
    ? { status: 'verified', rejection_reason: null }
    : { status: 'rejected', rejection_reason: reason.trim() };

  const vehicle = await Vehicle.findByIdAndUpdate(
    req.params.vehicleId,
    update,
    { new: true }
  ).populate('user_id', 'name phone_hash').select('-__v');

  if (!vehicle) {
    return res.status(404).json({ success: false, message: 'Vehicle not found' });
  }

  res.json({ success: true, vehicle });
});

// GET /api/v1/admin/stats
router.get('/stats', async (req, res) => {
  const [totalUsers, totalVehicles, pending, verified, rejected] = await Promise.all([
    User.countDocuments(),
    Vehicle.countDocuments(),
    Vehicle.countDocuments({ status: 'pending' }),
    Vehicle.countDocuments({ status: 'verified' }),
    Vehicle.countDocuments({ status: 'rejected' }),
  ]);

  res.json({ success: true, stats: { totalUsers, totalVehicles, pending, verified, rejected } });
});

export default router;
