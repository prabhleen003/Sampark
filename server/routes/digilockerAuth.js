/**
 * DigiLocker OAuth routes.
 * Mounted at /api/v1/auth/digilocker
 *
 * GET  /initiate   (protected) — redirects user to DigiLocker authorization page
 * GET  /callback   (public)    — DigiLocker posts code + state here after consent
 */

import express from 'express';
import Vehicle from '../models/Vehicle.js';
import authMiddleware from '../middleware/auth.js';
import { digilocker } from '../services/verification/index.js';
import { generateSignedUrl } from '../utils/qr.js';
import { createNotification } from '../services/notification.js';
import { refreshPrivacyScore } from '../utils/privacyScore.js';
import QRCode from 'qrcode';

const router = express.Router();

// GET /api/v1/auth/digilocker/initiate?vehicleId=<id>  (protected)
router.get('/initiate', authMiddleware, async (req, res) => {
  const { vehicleId } = req.query;
  if (!vehicleId) {
    return res.status(400).json({ success: false, message: 'vehicleId is required' });
  }

  const vehicle = await Vehicle.findOne({ _id: vehicleId, user_id: req.user.userId });
  if (!vehicle) {
    return res.status(404).json({ success: false, message: 'Vehicle not found' });
  }
  if (vehicle.status !== 'awaiting_digilocker') {
    return res.status(400).json({ success: false, message: 'Vehicle is not awaiting DigiLocker verification' });
  }

  const authUrl = digilocker.buildAuthUrl(req.user.userId, vehicleId);
  res.json({ success: true, auth_url: authUrl });
});

// GET /api/v1/auth/digilocker/callback  (public — DigiLocker redirects here)
router.get('/callback', async (req, res) => {
  const { code, state, error } = req.query;
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

  if (error || !code || !state) {
    return res.redirect(`${FRONTEND_URL}/dashboard?digilocker=error&reason=cancelled`);
  }

  // state = userId_vehicleId
  const [userId, vehicleId] = state.split('_');
  if (!userId || !vehicleId) {
    return res.redirect(`${FRONTEND_URL}/dashboard?digilocker=error&reason=invalid_state`);
  }

  const vehicle = await Vehicle.findOne({ _id: vehicleId, user_id: userId });
  if (!vehicle) {
    return res.redirect(`${FRONTEND_URL}/dashboard?digilocker=error&reason=vehicle_not_found`);
  }

  const result = await digilocker.handleCallback(code, state, vehicle);

  if (!result.verified) {
    vehicle.status             = 'verification_failed';
    vehicle.rejection_reason   = result.reason;
    vehicle.needs_manual_review = true;
    await vehicle.save();

    createNotification(
      userId, 'vehicle_rejected',
      `${vehicle.plate_number} could not be verified`,
      result.reason,
      vehicle._id,
      '/dashboard',
      { plate_number: vehicle.plate_number }
    );
    return res.redirect(`${FRONTEND_URL}/dashboard?digilocker=failed&vehicleId=${vehicleId}`);
  }

  // DigiLocker verified — generate QR
  const signedUrl = generateSignedUrl(vehicle._id.toString());
  const qrDataUrl = await QRCode.toDataURL(signedUrl.url, { width: 300, margin: 2 });
  const validUntil = new Date();
  validUntil.setFullYear(validUntil.getFullYear() + 1);

  vehicle.status                  = 'verified';
  vehicle.verification_method     = result.method;
  vehicle.verification_confidence  = result.confidence;
  vehicle.digilocker_verified      = result.digilockerVerified || false;
  vehicle.needs_manual_review      = false;
  vehicle.qr_token                 = signedUrl.sig;
  vehicle.qr_image_url             = qrDataUrl;
  vehicle.qr_valid_until           = validUntil;
  vehicle.card_code                = Math.random().toString(36).slice(2, 10).toUpperCase();
  await vehicle.save();

  createNotification(
    userId, 'vehicle_verified',
    `${vehicle.plate_number} verified via DigiLocker!`,
    'Your vehicle has been verified with high confidence. Pay ₹499 to activate your QR code.',
    vehicle._id,
    '/dashboard',
    { plate_number: vehicle.plate_number, confidence: 'high' }
  );
  refreshPrivacyScore(userId);

  res.redirect(`${FRONTEND_URL}/dashboard?digilocker=success&vehicleId=${vehicleId}`);
});

export default router;
