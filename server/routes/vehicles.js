import express from 'express';
import Vehicle from '../models/Vehicle.js';
import CallLog from '../models/CallLog.js';
import authMiddleware from '../middleware/auth.js';
import { uploadVehicleDocs } from '../middleware/upload.js';
import { encryptPhone, maskPhone } from '../utils/encrypt.js';
import { refreshPrivacyScore } from '../utils/privacyScore.js';
import { runVerifier } from '../services/verification/index.js';
import { generateSignedUrl } from '../utils/qr.js';
import QRCode from 'qrcode';

const router = express.Router();

const PLATE_REGEX    = /^[A-Z]{2}\d{2}[A-Z]{1,2}\d{4}$/;
const EMERG_PHONE_RE = /^[6-9]\d{9}$/;

function formatContacts(contacts) {
  return [...contacts]
    .sort((a, b) => a.priority - b.priority)
    .map(c => ({ _id: c._id, label: c.label, priority: c.priority, phone_masked: maskPhone(c.phone_encrypted) }));
}

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

    // Run the configured verifier
    const result = await runVerifier(vehicle, req.files, req.user.userId);

    if (result.nextStep === 'digilocker') {
      // DigiLocker mode — prompt user to authenticate
      vehicle.status = 'awaiting_digilocker';
      await vehicle.save();
      res.status(201).json({
        success: true,
        vehicle,
        next_step: 'digilocker',
        auth_url: result.authUrl,
      });
      refreshPrivacyScore(req.user.userId);
      return;
    }

    if (result.verified) {
      // Basic mode — auto-approve
      const signedUrl = generateSignedUrl(vehicle._id.toString());
      const qrDataUrl = await QRCode.toDataURL(signedUrl.url, { width: 300, margin: 2 });
      const validUntil = new Date();
      validUntil.setFullYear(validUntil.getFullYear() + 1);

      vehicle.status                 = 'verified';
      vehicle.verification_method    = result.method;
      vehicle.verification_confidence = result.confidence;
      vehicle.qr_token               = signedUrl.sig;
      vehicle.qr_image_url           = qrDataUrl;
      vehicle.qr_valid_until         = validUntil;
      vehicle.card_code              = Math.random().toString(36).slice(2, 10).toUpperCase();
      await vehicle.save();

      res.status(201).json({ success: true, vehicle, next_step: 'payment' });
    } else {
      // Verification failed — flag for manual review
      vehicle.status             = 'verification_failed';
      vehicle.rejection_reason   = result.reason;
      vehicle.needs_manual_review = true;
      await vehicle.save();

      res.status(201).json({
        success: true,
        vehicle,
        next_step: 'manual_review',
        message: result.reason,
      });
    }

    refreshPrivacyScore(req.user.userId);
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

// GET /api/v1/vehicles/:id/qr-card  (protected) — data for printable card
router.get('/:id/qr-card', authMiddleware, async (req, res) => {
  const vehicle = await Vehicle.findOne({ _id: req.params.id, user_id: req.user.userId })
    .select('status qr_image_url plate_number qr_valid_until card_code');
  if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });
  if (vehicle.status !== 'verified' || !vehicle.qr_image_url) {
    return res.status(400).json({ success: false, message: 'QR not available yet' });
  }
  // Lazy card_code generation for vehicles that predate Step 8
  if (!vehicle.card_code) {
    vehicle.card_code = Math.random().toString(36).slice(2, 10).toUpperCase();
    await vehicle.save();
  }
  res.json({
    success: true,
    qr_image:    vehicle.qr_image_url,
    plate_number: vehicle.plate_number,
    valid_until:  vehicle.qr_valid_until,
    card_code:    vehicle.card_code,
  });
});

// PUT /api/v1/vehicles/:id  — resubmit docs after verification_failed
router.put('/:id', authMiddleware, (req, res) => {
  uploadVehicleDocs(req, res, async (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });

    const vehicle = await Vehicle.findOne({ _id: req.params.id, user_id: req.user.userId });
    if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });
    if (!['verification_failed', 'awaiting_digilocker'].includes(vehicle.status)) {
      return res.status(400).json({ success: false, message: 'Only vehicles with failed verification can be resubmitted' });
    }

    if (!req.files?.rc_doc || !req.files?.dl_doc || !req.files?.plate_photo) {
      return res.status(400).json({ success: false, message: 'All three documents are required' });
    }

    vehicle.rc_doc_url        = `/uploads/${req.files.rc_doc[0].filename}`;
    vehicle.dl_doc_url        = `/uploads/${req.files.dl_doc[0].filename}`;
    vehicle.plate_photo_url   = `/uploads/${req.files.plate_photo[0].filename}`;
    vehicle.rejection_reason  = null;
    vehicle.needs_manual_review = false;
    await vehicle.save();

    // Re-run verifier on the new documents
    const result = await runVerifier(vehicle, req.files, req.user.userId);

    if (result.nextStep === 'digilocker') {
      vehicle.status = 'awaiting_digilocker';
      await vehicle.save();
      res.json({ success: true, vehicle, next_step: 'digilocker', auth_url: result.authUrl });
      return;
    }

    if (result.verified) {
      const signedUrl = generateSignedUrl(vehicle._id.toString());
      const qrDataUrl = await QRCode.toDataURL(signedUrl.url, { width: 300, margin: 2 });
      const validUntil = new Date();
      validUntil.setFullYear(validUntil.getFullYear() + 1);

      vehicle.status                  = 'verified';
      vehicle.verification_method     = result.method;
      vehicle.verification_confidence  = result.confidence;
      vehicle.qr_token                 = signedUrl.sig;
      vehicle.qr_image_url             = qrDataUrl;
      vehicle.qr_valid_until           = validUntil;
      vehicle.card_code                = Math.random().toString(36).slice(2, 10).toUpperCase();
      await vehicle.save();
      res.json({ success: true, vehicle, next_step: 'payment' });
    } else {
      vehicle.status              = 'verification_failed';
      vehicle.rejection_reason    = result.reason;
      vehicle.needs_manual_review = true;
      await vehicle.save();
      res.json({ success: true, vehicle, next_step: 'manual_review', message: result.reason });
    }

    refreshPrivacyScore(req.user.userId);
  });
});

// ── Emergency Contacts CRUD ───────────────────────────────────────────────────

// GET /:id/emergency-contacts
router.get('/:id/emergency-contacts', authMiddleware, async (req, res) => {
  const vehicle = await Vehicle.findOne({ _id: req.params.id, user_id: req.user.userId })
    .select('emergency_contacts');
  if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });
  res.json({ success: true, contacts: formatContacts(vehicle.emergency_contacts) });
});

// POST /:id/emergency-contacts
router.post('/:id/emergency-contacts', authMiddleware, async (req, res) => {
  const { phone, label, priority } = req.body;
  if (!phone || !EMERG_PHONE_RE.test(phone))
    return res.status(400).json({ success: false, message: 'Valid 10-digit phone required' });
  if (!label?.trim())
    return res.status(400).json({ success: false, message: 'Label is required' });
  if (![1, 2, 3].includes(parseInt(priority)))
    return res.status(400).json({ success: false, message: 'Priority must be 1, 2, or 3' });

  const vehicle = await Vehicle.findOne({ _id: req.params.id, user_id: req.user.userId });
  if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });
  if (vehicle.emergency_contacts.length >= 3)
    return res.status(400).json({ success: false, message: 'Maximum 3 emergency contacts allowed' });

  vehicle.emergency_contacts.push({
    phone_encrypted: encryptPhone(phone),
    label:           label.trim().slice(0, 50),
    priority:        parseInt(priority),
  });
  await vehicle.save();
  res.status(201).json({ success: true, contacts: formatContacts(vehicle.emergency_contacts) });
  refreshPrivacyScore(req.user.userId);
});

// PUT /:id/emergency-contacts/:contactId
router.put('/:id/emergency-contacts/:contactId', authMiddleware, async (req, res) => {
  const { label, priority } = req.body;
  const vehicle = await Vehicle.findOne({ _id: req.params.id, user_id: req.user.userId });
  if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });

  const contact = vehicle.emergency_contacts.id(req.params.contactId);
  if (!contact) return res.status(404).json({ success: false, message: 'Contact not found' });

  if (label?.trim()) contact.label = label.trim().slice(0, 50);
  if (priority && [1, 2, 3].includes(parseInt(priority))) contact.priority = parseInt(priority);
  await vehicle.save();
  res.json({ success: true, contacts: formatContacts(vehicle.emergency_contacts) });
});

// DELETE /:id/emergency-contacts/:contactId
router.delete('/:id/emergency-contacts/:contactId', authMiddleware, async (req, res) => {
  const vehicle = await Vehicle.findOne({ _id: req.params.id, user_id: req.user.userId });
  if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });
  vehicle.emergency_contacts.pull({ _id: req.params.contactId });
  await vehicle.save();
  res.json({ success: true, contacts: formatContacts(vehicle.emergency_contacts) });
  refreshPrivacyScore(req.user.userId);
});

export default router;
