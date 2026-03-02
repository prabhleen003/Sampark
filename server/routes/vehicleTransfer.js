import express from 'express';
import crypto from 'crypto';
import Vehicle from '../models/Vehicle.js';
import Order from '../models/Order.js';
import Payment from '../models/Payment.js';
import authMiddleware from '../middleware/auth.js';
import { createNotification } from '../services/notification.js';

const router = express.Router();

function generateTransferToken() {
  return crypto.randomBytes(4).toString('hex').toUpperCase(); // 8-char alphanumeric
}

async function expireActivePayments(vehicleId) {
  const expiredAt = new Date(Date.now() - 1000);
  await Payment.updateMany(
    {
      vehicle_id: vehicleId,
      status: 'paid',
      valid_until: { $gt: new Date() },
    },
    { $set: { valid_until: expiredAt } }
  );
}

// POST /api/v1/vehicles/transfer/claim  ← must be BEFORE /:id routes
router.post('/transfer/claim', authMiddleware, async (req, res) => {
  try {
    const { transfer_code } = req.body;
    if (!transfer_code?.trim()) {
      return res.status(400).json({ success: false, message: 'Transfer code is required' });
    }

    const vehicle = await Vehicle.findOne({
      transfer_token: transfer_code.trim().toUpperCase(),
      transfer_status: 'pending',
    });

    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Invalid or expired transfer code' });
    }

    // Check expiry
    if (vehicle.transfer_expires_at < new Date()) {
      // Auto-cancel expired transfer
      vehicle.transfer_status = 'none';
      vehicle.transfer_token = null;
      vehicle.transfer_initiated_at = null;
      vehicle.transfer_expires_at = null;
      await vehicle.save();
      return res.status(400).json({ success: false, message: 'This transfer code has expired' });
    }

    // Can't claim your own vehicle
    if (vehicle.user_id.toString() === req.user.userId) {
      return res.status(400).json({ success: false, message: 'You cannot claim a vehicle you already own' });
    }

    // New owner max 2 active vehicles check
    const activeCount = await Vehicle.countDocuments({
      user_id: req.user.userId,
      deactivated_at: null,
    });
    if (activeCount >= 2) {
      return res.status(400).json({ success: false, message: 'Maximum 2 vehicles allowed per account' });
    }

    const previousOwnerId = vehicle.user_id;
    const newOwnerId = req.user.userId;

    // Transfer the vehicle
    vehicle.previous_owner_id = previousOwnerId;
    vehicle.user_id = newOwnerId;
    vehicle.status = 'needs_reverification';
    vehicle.transfer_status = 'completed';
    vehicle.transfer_token = null;
    vehicle.transfer_initiated_at = null;
    vehicle.transfer_expires_at = null;
    // QR already invalidated on initiate; status = needs_reverification keeps it invalid
    await vehicle.save();

    // Notify both parties
    createNotification(
      previousOwnerId,
      'vehicle_transferred_out',
      'Vehicle Transfer Complete',
      `Your vehicle ${vehicle.plate_number} has been successfully transferred to its new owner.`,
      vehicle._id.toString(),
      '/dashboard',
      { plate_number: vehicle.plate_number }
    );
    createNotification(
      newOwnerId,
      'vehicle_transferred_in',
      'Vehicle Claimed',
      `You have claimed ${vehicle.plate_number}. Please re-verify your documents to activate it.`,
      vehicle._id.toString(),
      '/dashboard',
      { plate_number: vehicle.plate_number }
    );

    res.json({
      success: true,
      message: 'Vehicle claimed successfully. Please submit documents for re-verification.',
      vehicle: {
        _id: vehicle._id,
        plate_number: vehicle.plate_number,
        status: vehicle.status,
      },
    });
  } catch (err) {
    console.error('Transfer claim error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/v1/vehicles/:id/transfer/initiate
router.post('/:id/transfer/initiate', authMiddleware, async (req, res) => {
  try {
    const vehicle = await Vehicle.findOne({ _id: req.params.id, user_id: req.user.userId });
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }
    if (vehicle.deactivated_at) {
      return res.status(400).json({ success: false, message: 'Vehicle is deactivated' });
    }
    if (vehicle.status === 'suspended') {
      return res.status(400).json({ success: false, message: 'Suspended vehicles cannot be transferred' });
    }
    if (!['verified', 'needs_reverification'].includes(vehicle.status)) {
      return res.status(400).json({ success: false, message: 'Only active vehicles can be transferred' });
    }
    if (vehicle.transfer_status === 'pending') {
      return res.status(400).json({ success: false, message: 'A transfer is already in progress for this vehicle' });
    }

    const token = generateTransferToken();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

    vehicle.transfer_status = 'pending';
    vehicle.transfer_token = token;
    vehicle.transfer_initiated_at = new Date();
    vehicle.transfer_expires_at = expiresAt;
    // Invalidate QR immediately so scanner sees "transfer in progress"
    vehicle.qr_token = null;
    vehicle.qr_image_url = null;
    vehicle.qr_valid_until = null;
    await vehicle.save();
    await expireActivePayments(vehicle._id);

    createNotification(
      req.user.userId,
      'transfer_initiated',
      'Vehicle Transfer Initiated',
      `Transfer for ${vehicle.plate_number} has been initiated. Share the code with the new owner. It expires in 48 hours.`,
      vehicle._id.toString(),
      '/dashboard',
      { plate_number: vehicle.plate_number, transfer_code: token }
    );

    res.json({
      success: true,
      transfer_code: token,
      expires_at: expiresAt,
      message: 'Share this code with the new owner. It expires in 48 hours.',
    });
  } catch (err) {
    console.error('Transfer initiate error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/v1/vehicles/:id/transfer/cancel
router.post('/:id/transfer/cancel', authMiddleware, async (req, res) => {
  try {
    const vehicle = await Vehicle.findOne({ _id: req.params.id, user_id: req.user.userId });
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }
    if (vehicle.transfer_status !== 'pending') {
      return res.status(400).json({ success: false, message: 'No pending transfer to cancel' });
    }

    // Clear transfer fields
    vehicle.transfer_status = 'none';
    vehicle.transfer_token = null;
    vehicle.transfer_initiated_at = null;
    vehicle.transfer_expires_at = null;
    // Keep QR inactive after cancellation; owner must pay again to reactivate.
    vehicle.qr_token = null;
    vehicle.qr_image_url = null;
    vehicle.qr_valid_until = null;

    await vehicle.save();

    res.json({ success: true, message: 'Transfer cancelled. QR remains inactive; complete payment to reactivate.' });
  } catch (err) {
    console.error('Transfer cancel error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/v1/vehicles/:id/transfer/status
router.get('/:id/transfer/status', authMiddleware, async (req, res) => {
  try {
    const vehicle = await Vehicle.findOne({ _id: req.params.id, user_id: req.user.userId })
      .select('plate_number transfer_status transfer_token transfer_initiated_at transfer_expires_at');
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    const now = new Date();
    const isExpired = vehicle.transfer_expires_at && vehicle.transfer_expires_at < now;

    res.json({
      success: true,
      transfer_status: vehicle.transfer_status,
      transfer_code: vehicle.transfer_status === 'pending' && !isExpired ? vehicle.transfer_token : null,
      transfer_initiated_at: vehicle.transfer_initiated_at,
      transfer_expires_at: vehicle.transfer_expires_at,
      is_expired: isExpired,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/v1/vehicles/:id  — soft delete (owner removes vehicle)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { plate_number } = req.body;
    if (!plate_number?.trim()) {
      return res.status(400).json({ success: false, message: 'Plate number confirmation is required' });
    }

    const vehicle = await Vehicle.findOne({ _id: req.params.id, user_id: req.user.userId });
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }
    if (vehicle.deactivated_at) {
      return res.status(400).json({ success: false, message: 'Vehicle is already deactivated' });
    }

    // Confirm plate
    if (plate_number.trim().toUpperCase() !== vehicle.plate_number) {
      return res.status(400).json({ success: false, message: 'Plate number does not match' });
    }

    // Cancel any pending orders for this vehicle
    await Order.updateMany(
      { vehicle_id: vehicle._id, status: { $in: ['created', 'paid', 'processing'] } },
      { $set: { status: 'cancelled' } }
    );

    // Soft-delete: set deactivated_at, clear QR and transfer fields
    vehicle.deactivated_at = new Date();
    vehicle.deactivation_reason = 'owner_removed';
    vehicle.qr_token = null;
    vehicle.qr_image_url = null;
    vehicle.transfer_status = 'none';
    vehicle.transfer_token = null;
    vehicle.transfer_initiated_at = null;
    vehicle.transfer_expires_at = null;
    await vehicle.save();

    res.json({ success: true, message: 'Vehicle removed from your account.' });
  } catch (err) {
    console.error('Vehicle delete error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
