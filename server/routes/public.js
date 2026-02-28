import express from 'express';
import Vehicle from '../models/Vehicle.js';
import User from '../models/User.js';
import CallLog from '../models/CallLog.js';
import { verifySignature } from '../utils/qr.js';
import { initiateCall } from '../services/exotel.js';
import { checkCallerRateLimit, checkVehicleRateLimit } from '../utils/rateLimit.js';

const router = express.Router();

const INDIAN_PHONE_RE = /^[6-9]\d{9}$/;

const MESSAGE_TEMPLATES = [
  { id: 1, text: 'Your car is blocking my vehicle' },
  { id: 2, text: 'Your car lights are on' },
  { id: 3, text: 'Your car is being towed' },
  { id: 4, text: 'Your car alarm is going off' },
  { id: 5, text: 'Need to talk — please call back' },
];

// GET /api/v1/v/:vehicleId — public vehicle info (QR scan entry)
router.get('/:vehicleId', async (req, res) => {
  const { vehicleId } = req.params;
  const { sig } = req.query;

  if (!sig || !verifySignature(vehicleId, sig)) {
    return res.status(403).json({ success: false, message: 'Invalid or expired QR code' });
  }

  const vehicle = await Vehicle.findById(vehicleId).select('plate_number comm_mode status');
  if (!vehicle || vehicle.status !== 'verified') {
    return res.status(404).json({ success: false, message: 'Vehicle not found or not verified' });
  }

  res.json({
    success: true,
    vehicle: {
      plate_number: vehicle.plate_number,
      comm_mode: vehicle.comm_mode,
    },
  });
});

// GET /api/v1/v/:vehicleId/templates — message templates list
router.get('/:vehicleId/templates', async (req, res) => {
  const { sig } = req.query;
  if (!sig || !verifySignature(req.params.vehicleId, sig)) {
    return res.status(403).json({ success: false, message: 'Invalid or expired QR code' });
  }
  res.json({ success: true, templates: MESSAGE_TEMPLATES });
});

// POST /api/v1/v/:vehicleId/message — send a message to the vehicle owner
router.post('/:vehicleId/message', async (req, res) => {
  const { vehicleId } = req.params;
  const { sig, sender_phone, template_id, custom_text } = req.body;

  if (!sig || !verifySignature(vehicleId, sig)) {
    return res.status(403).json({ success: false, message: 'Invalid or expired QR code' });
  }

  const vehicle = await Vehicle.findById(vehicleId).select('status comm_mode');
  if (!vehicle || vehicle.status !== 'verified') {
    return res.status(404).json({ success: false, message: 'Vehicle not found' });
  }

  if (vehicle.comm_mode === 'silent') {
    return res.status(403).json({ success: false, message: 'This vehicle is in silent mode' });
  }

  if (!template_id && !custom_text?.trim()) {
    return res.status(400).json({ success: false, message: 'Provide a template or a custom message' });
  }

  if (custom_text && custom_text.trim().length > 200) {
    return res.status(400).json({ success: false, message: 'Custom message must be 200 characters or less' });
  }

  const log = await CallLog.create({
    vehicle_id: vehicleId,
    type: 'message',
    sender_phone_hash: sender_phone || null,
    template_id: template_id || null,
    custom_text: custom_text?.trim() || null,
  });

  res.status(201).json({ success: true, message: 'Message sent to vehicle owner', log_id: log._id });
});

// POST /api/v1/v/:vehicleId/call — initiate a masked call to the vehicle owner
router.post('/:vehicleId/call', async (req, res) => {
  const { vehicleId } = req.params;
  const { sig, caller_phone } = req.body;

  // 1. Verify QR signature
  if (!sig || !verifySignature(vehicleId, sig)) {
    return res.status(403).json({ success: false, message: 'Invalid or expired QR code' });
  }

  // 2. Find and validate vehicle
  const vehicle = await Vehicle.findById(vehicleId).select('status comm_mode user_id');
  if (!vehicle || vehicle.status !== 'verified') {
    return res.status(404).json({ success: false, message: 'Vehicle not found or not verified' });
  }

  // 3. Check comm_mode
  if (vehicle.comm_mode === 'silent' || vehicle.comm_mode === 'message_only') {
    return res.status(403).json({ success: false, message: 'Vehicle owner has disabled calls.' });
  }

  // 4. Validate caller phone
  if (!caller_phone || !INDIAN_PHONE_RE.test(caller_phone)) {
    return res.status(400).json({ success: false, message: 'Enter a valid 10-digit Indian mobile number' });
  }

  // 5. Per-caller rate limit (3 calls/hour to this vehicle)
  if (checkCallerRateLimit(caller_phone, vehicleId)) {
    return res.status(429).json({ success: false, message: 'Too many call attempts. Try again later.' });
  }

  // 6. Per-vehicle daily cap (15 calls/day)
  if (checkVehicleRateLimit(vehicleId)) {
    return res.status(429).json({ success: false, message: 'This vehicle has received too many calls today.' });
  }

  // 7. Get owner's phone
  const owner = await User.findById(vehicle.user_id).select('phone_encrypted');
  if (!owner) {
    return res.status(500).json({ success: false, message: 'Could not reach vehicle owner' });
  }

  // 8. Initiate call via Exotel (or mock)
  let exotelSid;
  try {
    const result = await initiateCall(caller_phone, owner.phone_encrypted);
    exotelSid = result.sid;
  } catch (err) {
    console.error('Exotel error:', err.message);
    return res.status(502).json({ success: false, message: 'Call service temporarily unavailable. Please try again.' });
  }

  // 9. Log the call
  await CallLog.create({
    vehicle_id: vehicleId,
    type: 'call',
    sender_phone_hash: caller_phone,
    exotel_sid: exotelSid,
    status: 'initiated',
  });

  res.json({ success: true, message: 'Connecting your call...' });
});

export default router;
