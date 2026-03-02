import express from 'express';
import crypto, { randomBytes } from 'crypto';
import Vehicle from '../models/Vehicle.js';
import User from '../models/User.js';
import CallLog from '../models/CallLog.js';
import EmergencySession from '../models/EmergencySession.js';
import PublicReport from '../models/PublicReport.js';
import ScanLog from '../models/ScanLog.js';
import { verifySignature } from '../utils/qr.js';
import { initiateCall } from '../services/exotel.js';
import { checkCallerRateLimit, checkVehicleRateLimit } from '../utils/rateLimit.js';
import { decryptPhone, hashPhone } from '../utils/encrypt.js';
import { createNotification } from '../services/notification.js';
import { isCallerBlocked } from '../utils/callerProfile.js';

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

  if (!sig || !(await verifySignature(vehicleId, sig))) {
    return res.status(403).json({ success: false, message: 'Invalid or expired QR code' });
  }

  const vehicle = await Vehicle.findById(vehicleId)
    .select('plate_number comm_mode status qr_valid_until deactivated_at transfer_status');
  if (!vehicle) {
    return res.status(404).json({ success: false, message: 'Vehicle not found or not verified' });
  }

  // Deactivated vehicle — removed by owner or transferred away
  if (vehicle.deactivated_at) {
    return res.json({
      success: true,
      deactivated: true,
      vehicle: { plate_number: vehicle.plate_number },
    });
  }

  // Transfer in progress — QR is temporarily invalid
  if (vehicle.transfer_status === 'pending') {
    return res.json({
      success: true,
      transferring: true,
      vehicle: { plate_number: vehicle.plate_number },
    });
  }

  // Suspended vehicle — show muted state, no actions allowed
  if (vehicle.status === 'suspended') {
    return res.json({
      success: true,
      suspended: true,
      vehicle: { plate_number: vehicle.plate_number },
    });
  }

  if (vehicle.status !== 'verified') {
    return res.status(404).json({ success: false, message: 'Vehicle not found or not verified' });
  }

  if (vehicle.qr_valid_until && new Date() > new Date(vehicle.qr_valid_until)) {
    return res.json({
      success: true,
      expired: true,
      vehicle: { plate_number: vehicle.plate_number },
    });
  }

  // Track scan — fire and forget, never block the response
  ScanLog.create({
    vehicle_id: vehicle._id,
    user_agent: req.headers['user-agent'] || null,
    ip_hash: crypto.createHash('sha256').update(req.ip || '').digest('hex'),
  }).catch(() => {});

  res.json({
    success: true,
    vehicle: {
      plate_number: vehicle.plate_number,
      comm_mode: vehicle.comm_mode,
    },
  });
});

// POST /api/v1/v/sms-lookup — look up vehicle by card_code (SMS fallback, must be before /:vehicleId)
router.post('/sms-lookup', async (req, res) => {
  const { card_code } = req.body;
  if (!card_code?.trim()) {
    return res.status(400).json({ success: false, message: 'card_code is required' });
  }
  const vehicle = await Vehicle.findOne({
    card_code: card_code.trim().toUpperCase(),
    deactivated_at: null,
    status: 'verified',
  }).select('_id plate_number');
  if (!vehicle) {
    return res.status(404).json({ success: false, message: 'No active vehicle found with this code' });
  }
  const publicUrl = `${process.env.APP_URL}/v/${vehicle._id}`;
  res.json({ success: true, vehicle_id: vehicle._id, plate_number: vehicle.plate_number, public_url: publicUrl });
});

// GET /api/v1/v/:vehicleId/info — enriched public vehicle info (requires valid sig)
router.get('/:vehicleId/info', async (req, res) => {
  const { vehicleId } = req.params;
  const { sig } = req.query;

  if (!sig || !(await verifySignature(vehicleId, sig))) {
    return res.status(403).json({ success: false, message: 'Invalid or expired QR code' });
  }

  const vehicle = await Vehicle.findOne({
    _id: vehicleId,
    status: 'verified',
    deactivated_at: null,
    transfer_status: 'none',
  }).select('plate_number comm_mode verification_method digilocker_verified emergency_contacts created_at card_code qr_valid_until');

  if (!vehicle) {
    return res.status(404).json({ success: false, message: 'Vehicle not found or not active' });
  }

  const [totalCalls, answeredCalls, avgAgg] = await Promise.all([
    CallLog.countDocuments({ vehicle_id: vehicleId, type: 'call' }),
    CallLog.countDocuments({ vehicle_id: vehicleId, type: 'call', status: 'completed' }),
    CallLog.aggregate([
      { $match: { vehicle_id: vehicle._id, type: 'call', status: 'completed', duration_seconds: { $gt: 0 } } },
      { $group: { _id: null, avg: { $avg: '$duration_seconds' } } },
    ]),
  ]);

  const hasEnoughData = totalCalls >= 5;
  const stats = hasEnoughData ? {
    owner_response_rate: Math.round((answeredCalls / totalCalls) * 100),
    average_response_time: avgAgg[0]?.avg ? Math.round(avgAgg[0].avg) : 0,
  } : null;

  res.json({
    success: true,
    info: {
      plate_number:         vehicle.plate_number,
      comm_mode:            vehicle.comm_mode,
      has_emergency_contacts: vehicle.emergency_contacts.length > 0,
      verification_method:  vehicle.verification_method,
      is_digilocker_verified: vehicle.digilocker_verified,
      qr_active_since:      vehicle.created_at,
      card_code:            vehicle.card_code,
      ...stats,
    },
  });
});

// POST /api/v1/v/:vehicleId/report — public issue report (fake QR, vehicle mismatch, etc.)
router.post('/:vehicleId/report', async (req, res) => {
  const { vehicleId } = req.params;
  const { reason, description, reporter_phone } = req.body;

  const VALID_REASONS = ['fake_qr', 'vehicle_mismatch', 'suspicious_activity', 'other'];
  if (!reason || !VALID_REASONS.includes(reason)) {
    return res.status(400).json({ success: false, message: 'Valid reason is required' });
  }

  const vehicle = await Vehicle.findById(vehicleId).select('_id plate_number');
  if (!vehicle) {
    return res.status(404).json({ success: false, message: 'Vehicle not found' });
  }

  let reporterHash = null;
  if (reporter_phone && /^[6-9]\d{9}$/.test(reporter_phone)) {
    reporterHash = crypto.createHash('sha256').update(reporter_phone).digest('hex');

    // Rate limit: max 3 reports per phone hash per day
    const oneDayAgo = new Date(Date.now() - 86400000);
    const recentCount = await PublicReport.countDocuments({
      reporter_phone_hash: reporterHash,
      created_at: { $gte: oneDayAgo },
    });
    if (recentCount >= 3) {
      return res.status(429).json({ success: false, message: 'You have already reported this vehicle recently.' });
    }
  }

  const desc = description?.trim().slice(0, 500) || null;
  await PublicReport.create({ vehicle_id: vehicleId, reporter_phone_hash: reporterHash, reason, description: desc });

  res.status(201).json({ success: true, message: 'Report submitted. Thank you for helping keep Sampaark safe.' });
});

// GET /api/v1/v/:vehicleId/templates — message templates list
router.get('/:vehicleId/templates', async (req, res) => {
  const { sig } = req.query;
  if (!sig || !(await verifySignature(req.params.vehicleId, sig))) {
    return res.status(403).json({ success: false, message: 'Invalid or expired QR code' });
  }
  res.json({ success: true, templates: MESSAGE_TEMPLATES });
});

// POST /api/v1/v/:vehicleId/message — send a message to the vehicle owner
router.post('/:vehicleId/message', async (req, res) => {
  const { vehicleId } = req.params;
  const { sig, sender_phone, template_id, custom_text } = req.body;

  if (!sig || !(await verifySignature(vehicleId, sig))) {
    return res.status(403).json({ success: false, message: 'Invalid or expired QR code' });
  }

  const vehicle = await Vehicle.findById(vehicleId).select('status comm_mode user_id plate_number');
  if (!vehicle || vehicle.status !== 'verified') {
    return res.status(404).json({ success: false, message: 'Vehicle not found' });
  }

  if (vehicle.comm_mode === 'silent') {
    return res.status(403).json({ success: false, message: 'This vehicle is in silent mode' });
  }

  // Blocklist check (use sender_phone as identifier if provided)
  if (sender_phone && await isCallerBlocked(sender_phone, vehicleId)) {
    return res.status(403).json({ success: false, message: 'You are unable to contact this vehicle at this time.' });
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
    sender_phone_hash: sender_phone ? hashPhone(sender_phone) : null,
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
  if (!sig || !(await verifySignature(vehicleId, sig))) {
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

  // 4b. Blocklist check
  if (await isCallerBlocked(caller_phone, vehicleId)) {
    return res.status(403).json({ success: false, message: 'You are unable to contact this vehicle at this time.' });
  }

  // 5. Per-caller rate limit (3 calls/hour to this vehicle)
  if (checkCallerRateLimit(caller_phone, vehicleId)) {
    return res.status(429).json({ success: false, message: 'Too many call attempts. Try again later.' });
  }

  // 6. Per-vehicle daily cap (15 calls/day)
  const vehicleRateLimit = checkVehicleRateLimit(vehicleId);
  if (vehicleRateLimit.blocked) {
    // First blocked attempt (16th/day): persist admin-review flag.
    if (vehicleRateLimit.shouldFlagForReview) {
      await Vehicle.findByIdAndUpdate(vehicleId, { flagged_for_review: true });
    }
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
    sender_phone_hash: hashPhone(caller_phone),
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
    return res.status(410).json({
      success: false,
      message: 'Message window has expired. Please scan the QR again.',
      action: 'scan_again',
    });
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

  if (!sig || !(await verifySignature(vehicleId, sig))) {
    return res.status(403).json({ success: false, message: 'Invalid or expired QR code' });
  }

  const vehicle = await Vehicle.findById(vehicleId)
    .select('status user_id plate_number emergency_contacts qr_valid_until');
  if (!vehicle || !['verified', 'suspended'].includes(vehicle.status)) {
    return res.status(404).json({ success: false, message: 'Vehicle not found' });
  }
  if (vehicle.qr_valid_until && new Date() > new Date(vehicle.qr_valid_until)) {
    return res.status(400).json({ success: false, message: 'QR has expired' });
  }
  if (!caller_phone || !INDIAN_PHONE_RE.test(caller_phone)) {
    return res.status(400).json({ success: false, message: 'Valid 10-digit phone required' });
  }

  // Emergency calls bypass blocks but log if caller is blocked
  const callerIsBlocked = await isCallerBlocked(caller_phone, vehicleId);

  const owner = await User.findById(vehicle.user_id).select('phone_encrypted');
  if (!owner) return res.status(500).json({ success: false, message: 'Could not reach vehicle owner' });

  const contacts = [...vehicle.emergency_contacts].sort((a, b) => a.priority - b.priority);

  const session = await EmergencySession.create({
    vehicle_id:             vehicleId,
    caller_phone,
    description:            description || null,
    stage:                  'calling_owner',
    blocked_caller_emergency: callerIsBlocked,
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
