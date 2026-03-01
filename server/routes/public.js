import express from 'express';
import { randomBytes } from 'crypto';
import Vehicle from '../models/Vehicle.js';
import User from '../models/User.js';
import CallLog from '../models/CallLog.js';
import EmergencySession from '../models/EmergencySession.js';
import { verifySignature } from '../utils/qr.js';
import { initiateCall } from '../services/exotel.js';
import { checkCallerRateLimit, checkVehicleRateLimit } from '../utils/rateLimit.js';
import { decryptPhone } from '../utils/encrypt.js';
import { createNotification } from '../services/notification.js';

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

  const vehicle = await Vehicle.findById(vehicleId).select('plate_number comm_mode status qr_valid_until');
  if (!vehicle || vehicle.status !== 'verified') {
    return res.status(404).json({ success: false, message: 'Vehicle not found or not verified' });
  }

  if (vehicle.qr_valid_until && new Date() > new Date(vehicle.qr_valid_until)) {
    return res.json({
      success: true,
      expired: true,
      vehicle: { plate_number: vehicle.plate_number },
    });
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

  const vehicle = await Vehicle.findById(vehicleId).select('status comm_mode user_id plate_number');
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

  const msgPreview = custom_text?.trim()
    || MESSAGE_TEMPLATES.find(t => t.id === template_id)?.text
    || 'Someone left you a message.';
  createNotification(
    vehicle.user_id, 'message_received',
    `New message on ${vehicle.plate_number}`,
    msgPreview,
    vehicleId,
    '/dashboard',
    { template_id: template_id || null, log_id: log._id.toString() }
  );

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
  const vehicle = await Vehicle.findById(vehicleId).select('status comm_mode user_id plate_number');
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

  // 8. Initiate call via Exotel (or mock) — decrypt owner phone first
  let callResult;
  try {
    callResult = await initiateCall(caller_phone, decryptPhone(owner.phone_encrypted));
  } catch (err) {
    console.error('Exotel error:', err.message);
    return res.status(502).json({ success: false, message: 'Call service temporarily unavailable. Please try again.' });
  }

  // 9. Log the call
  const log = await CallLog.create({
    vehicle_id: vehicleId,
    type: 'call',
    sender_phone_hash: caller_phone,
    exotel_sid: callResult.sid,
    status: 'initiated',
  });

  // 10. Mock mode: simulate webhook status update after delay
  if (callResult.mockOutcome) {
    const ownerId   = vehicle.user_id;
    const plateNum  = vehicle.plate_number;
    const vehicleObjId = vehicle._id;
    setTimeout(async () => {
      try {
        const update = {
          status: callResult.mockOutcome,
          duration_seconds: callResult.mockOutcome === 'completed' ? Math.floor(Math.random() * 60) + 10 : null,
        };
        const isMissed = ['no-answer', 'busy', 'failed'].includes(callResult.mockOutcome);
        if (isMissed) {
          update.fallback_token  = randomBytes(16).toString('hex');
          update.fallback_expires = new Date(Date.now() + 15 * 60 * 1000);
        }
        await CallLog.findByIdAndUpdate(log._id, update);
        if (isMissed) {
          createNotification(
            ownerId, 'missed_call',
            `Missed call on ${plateNum}`,
            'Someone tried to reach you via your QR code but the call wasn\'t answered.',
            vehicleObjId,
            '/dashboard',
            { outcome: callResult.mockOutcome, log_id: log._id.toString() }
          );
        }
      } catch (e) {
        console.error('Mock webhook error:', e.message);
      }
    }, callResult.mockDelay);
  }

  res.json({ success: true, message: 'Connecting your call...', call_log_id: log._id });
});

// GET /api/v1/v/:vehicleId/call-status/:callLogId — poll call status (public)
router.get('/:vehicleId/call-status/:callLogId', async (req, res) => {
  const { vehicleId, callLogId } = req.params;
  try {
    const log = await CallLog.findOne({ _id: callLogId, vehicle_id: vehicleId, type: 'call' });
    if (!log) return res.status(404).json({ success: false, message: 'Call not found' });

    const response = { success: true, status: log.status || 'ringing' };
    // Include fallback token only if not used and not expired
    if (
      log.fallback_token &&
      !log.fallback_token_used &&
      log.fallback_expires &&
      log.fallback_expires > new Date()
    ) {
      response.fallback_token = log.fallback_token;
    }
    res.json(response);
  } catch {
    res.status(400).json({ success: false, message: 'Invalid call ID' });
  }
});

// POST /api/v1/v/:vehicleId/fallback-message — send fallback message after missed call (public)
router.post('/:vehicleId/fallback-message', async (req, res) => {
  const { vehicleId } = req.params;
  const { fallback_token, message, urgency } = req.body;

  if (!fallback_token) return res.status(400).json({ success: false, message: 'Token required' });
  if (!message?.trim()) return res.status(400).json({ success: false, message: 'Message is required' });
  if (message.trim().length > 300) return res.status(400).json({ success: false, message: 'Message must be 300 characters or less' });

  const VALID_URGENCIES = ['normal', 'urgent', 'emergency'];
  const urgencyValue = VALID_URGENCIES.includes(urgency) ? urgency : 'urgent';

  const log = await CallLog.findOne({ vehicle_id: vehicleId, fallback_token, fallback_token_used: false });
  if (!log) return res.status(403).json({ success: false, message: 'Invalid or already used token' });
  if (!log.fallback_expires || log.fallback_expires < new Date()) {
    return res.status(410).json({ success: false, message: 'Message window has expired' });
  }

  log.fallback_message    = message.trim();
  log.fallback_urgency    = urgencyValue;
  log.fallback_token_used = true;
  await log.save();

  res.json({ success: true });
});

// ── Emergency call chain helpers ──────────────────────────────────────────────

/**
 * Attempt a single call in the emergency chain.
 * Mock mode: owner always no-answer (7s), contacts always connect (7s).
 * Real mode: initiates the call and returns 'no-answer' immediately
 * (the real status is managed via Exotel webhooks — not yet wired for emergency chain).
 */
async function emergencyCallAttempt(callerPhone, targetPhone, isMock, isOwner) {
  if (isMock) {
    await new Promise(r => setTimeout(r, 7000));
    return isOwner ? 'no-answer' : 'connected';
  }
  try {
    await initiateCall(callerPhone, targetPhone);
  } catch (e) {
    console.error('Emergency call error:', e.message);
  }
  return 'no-answer'; // pessimistic — real webhook would update status
}

/**
 * Run the full emergency call chain:
 * owner → contact 1 → contact 2 → contact 3 → all_failed
 * Updates EmergencySession stage at each step.
 */
async function runEmergencyChain(sessionId, ownerPhoneRaw, contacts, callerPhone) {
  const isMock = process.env.MOCK_CALLS === 'true';

  // Attempt: owner
  const ownerOutcome = await emergencyCallAttempt(callerPhone, ownerPhoneRaw, isMock, true);
  if (ownerOutcome === 'connected') {
    await EmergencySession.findByIdAndUpdate(sessionId, { stage: 'connected', connected_to: 'owner' });
    return;
  }

  // Attempt: each emergency contact in priority order
  for (let i = 0; i < contacts.length; i++) {
    await EmergencySession.findByIdAndUpdate(sessionId, { stage: `calling_contact_${i + 1}` });
    const contactPhone = decryptPhone(contacts[i].phone_encrypted);
    const outcome = await emergencyCallAttempt(callerPhone, contactPhone, isMock, false);
    if (outcome === 'connected') {
      await EmergencySession.findByIdAndUpdate(sessionId, { stage: 'connected', connected_to: `contact_${i + 1}` });
      return;
    }
  }

  await EmergencySession.findByIdAndUpdate(sessionId, { stage: 'all_failed' });
}

// POST /api/v1/v/:vehicleId/emergency — initiate emergency call chain (public)
router.post('/:vehicleId/emergency', async (req, res) => {
  const { vehicleId } = req.params;
  const { sig, caller_phone, description } = req.body;

  if (!sig || !verifySignature(vehicleId, sig)) {
    return res.status(403).json({ success: false, message: 'Invalid or expired QR code' });
  }

  const vehicle = await Vehicle.findById(vehicleId)
    .select('status user_id plate_number emergency_contacts qr_valid_until');
  if (!vehicle || vehicle.status !== 'verified') {
    return res.status(404).json({ success: false, message: 'Vehicle not found or not verified' });
  }
  if (vehicle.qr_valid_until && new Date() > new Date(vehicle.qr_valid_until)) {
    return res.status(400).json({ success: false, message: 'QR has expired' });
  }
  if (!caller_phone || !INDIAN_PHONE_RE.test(caller_phone)) {
    return res.status(400).json({ success: false, message: 'Valid 10-digit phone required' });
  }

  const owner = await User.findById(vehicle.user_id).select('phone_encrypted');
  if (!owner) return res.status(500).json({ success: false, message: 'Could not reach vehicle owner' });

  const contacts = [...vehicle.emergency_contacts].sort((a, b) => a.priority - b.priority);

  const session = await EmergencySession.create({
    vehicle_id:   vehicleId,
    caller_phone,
    description:  description || null,
    stage:        'calling_owner',
  });

  createNotification(
    vehicle.user_id, 'emergency_alert',
    `Emergency reported for ${vehicle.plate_number}`,
    description ? `"${description}"` : 'Someone reported an emergency near your vehicle via QR scan.',
    vehicleId,
    '/dashboard',
    { session_id: session._id.toString(), caller_phone_partial: caller_phone.slice(-4) }
  );

  // Fire-and-forget — chain runs asynchronously while client polls
  runEmergencyChain(session._id, decryptPhone(owner.phone_encrypted), contacts, caller_phone)
    .catch(e => console.error('Emergency chain error:', e.message));

  res.json({ success: true, emergency_session_id: session._id });
});

// GET /api/v1/v/:vehicleId/emergency-status/:sessionId — poll chain status (public)
router.get('/:vehicleId/emergency-status/:sessionId', async (req, res) => {
  try {
    const session = await EmergencySession.findOne({
      _id:        req.params.sessionId,
      vehicle_id: req.params.vehicleId,
    });
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
    res.json({ success: true, stage: session.stage, connected_to: session.connected_to });
  } catch {
    res.status(400).json({ success: false, message: 'Invalid session ID' });
  }
});

export default router;
