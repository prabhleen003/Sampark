import express from 'express';
import Vehicle from '../models/Vehicle.js';
import CallLog from '../models/CallLog.js';
import authMiddleware from '../middleware/auth.js';
import { uploadVehicleDocs } from '../middleware/upload.js';

const router = express.Router();

const PLATE_REGEX = /^[A-Z]{2}\d{2}[A-Z]{1,2}\d{4}$/;

// POST /api/v1/vehicles  (protected, multipart)
router.post('/', authMiddleware, (req, res) => {
  uploadVehicleDocs(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }

    const { plate_number } = req.body;

    if (!plate_number || !PLATE_REGEX.test(plate_number.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plate number. Use format: MH01AB1234',
      });
    }

    // Check required documents
    if (!req.files?.rc_doc || !req.files?.dl_doc || !req.files?.plate_photo) {
      return res.status(400).json({ success: false, message: 'All three documents are required' });
    }

    // Max 2 vehicles per user
    const count = await Vehicle.countDocuments({ user_id: req.user.userId });
    if (count >= 2) {
      return res.status(400).json({ success: false, message: 'Maximum 2 vehicles allowed per account' });
    }

    // Check duplicate plate
    const existing = await Vehicle.findOne({ plate_number: plate_number.toUpperCase() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'This plate number is already registered' });
    }

    const vehicle = await Vehicle.create({
      user_id: req.user.userId,
      plate_number: plate_number.toUpperCase(),
      rc_doc_url: `/uploads/${req.files.rc_doc[0].filename}`,
      dl_doc_url: `/uploads/${req.files.dl_doc[0].filename}`,
      plate_photo_url: `/uploads/${req.files.plate_photo[0].filename}`,
    });

    res.status(201).json({ success: true, vehicle });
  });
});

// GET /api/v1/vehicles  (protected)
router.get('/', authMiddleware, async (req, res) => {
  const vehicles = await Vehicle.find({ user_id: req.user.userId }).select('-__v');
  res.json({ success: true, vehicles });
});

// GET /api/v1/vehicles/:id  (protected)
router.get('/:id', authMiddleware, async (req, res) => {
  const vehicle = await Vehicle.findOne({
    _id: req.params.id,
    user_id: req.user.userId,
  }).select('-__v');

  if (!vehicle) {
    return res.status(404).json({ success: false, message: 'Vehicle not found' });
  }
  res.json({ success: true, vehicle });
});

// GET /api/v1/vehicles/:id/qr  (protected) — returns QR image for verified vehicle
router.get('/:id/qr', authMiddleware, async (req, res) => {
  const vehicle = await Vehicle.findOne({
    _id: req.params.id,
    user_id: req.user.userId,
  }).select('status qr_image_url plate_number qr_token');

  if (!vehicle) {
    return res.status(404).json({ success: false, message: 'Vehicle not found' });
  }
  if (vehicle.status !== 'verified' || !vehicle.qr_image_url) {
    return res.status(400).json({ success: false, message: 'QR code not available yet' });
  }

  res.json({
    success: true,
    qr_image_url: vehicle.qr_image_url,
    plate_number: vehicle.plate_number,
    qr_token: vehicle.qr_token,
  });
});

// GET /api/v1/vehicles/:id/call-logs  (protected) — owner's activity feed
router.get('/:id/call-logs', authMiddleware, async (req, res) => {
  const vehicle = await Vehicle.findOne({ _id: req.params.id, user_id: req.user.userId }).select('_id');
  if (!vehicle) {
    return res.status(403).json({ success: false, message: 'Vehicle not found or access denied' });
  }

  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 20);
  const skip  = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    CallLog.find({ vehicle_id: req.params.id })
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .select('-__v'),
    CallLog.countDocuments({ vehicle_id: req.params.id }),
  ]);

  res.json({ success: true, logs, total, page });
});

// PUT /api/v1/vehicles/:id  — resubmit docs for a rejected vehicle
router.put('/:id', authMiddleware, (req, res) => {
  uploadVehicleDocs(req, res, async (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });

    const vehicle = await Vehicle.findOne({ _id: req.params.id, user_id: req.user.userId });
    if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });
    if (vehicle.status !== 'rejected') {
      return res.status(400).json({ success: false, message: 'Only rejected vehicles can be resubmitted' });
    }

    if (!req.files?.rc_doc || !req.files?.dl_doc || !req.files?.plate_photo) {
      return res.status(400).json({ success: false, message: 'All three documents are required' });
    }

    vehicle.rc_doc_url      = `/uploads/${req.files.rc_doc[0].filename}`;
    vehicle.dl_doc_url      = `/uploads/${req.files.dl_doc[0].filename}`;
    vehicle.plate_photo_url = `/uploads/${req.files.plate_photo[0].filename}`;
    vehicle.status          = 'pending';
    vehicle.rejection_reason = null;
    await vehicle.save();

    res.json({ success: true, vehicle });
  });
});

export default router;
