import express from 'express';
import { wrapRouter } from '../middleware/asyncHandler.js';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { generateOtp, storeOtp, verifyOtp, canSendOtp, recordOtpSend } from '../utils/otp.js';
import { hashPhone, encryptPhone } from '../utils/encrypt.js';
import { adminAuth } from '../utils/firebaseAdmin.js';

const router = express.Router();

const INDIAN_PHONE_REGEX = /^[6-9]\d{9}$/;

// POST /api/v1/auth/send-otp
router.post('/send-otp', async (req, res) => {
  const { phone } = req.body;

  if (!phone || !INDIAN_PHONE_REGEX.test(phone)) {
    return res.status(400).json({ success: false, message: 'Enter a valid 10-digit Indian mobile number' });
  }

  // Check rate-limit
  const rateLimitCheck = canSendOtp(phone);
  if (!rateLimitCheck.allowed) {
    return res.status(429).json({ success: false, message: rateLimitCheck.reason });
  }

  const otp = generateOtp();
  storeOtp(phone, otp);
  recordOtpSend(phone);

  // Log OTP to console for dev testing
  console.log(`OTP for ${phone}: ${otp}`);

  const response = { success: true, message: 'OTP sent' };

  // Return OTP in dev mode so frontend can auto-fill
  if (process.env.NODE_ENV !== 'production') {
    response.otp = otp;
  }

  res.json(response);
});

// POST /api/v1/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
  const { phone, otp } = req.body;

  if (!phone || !otp) {
    return res.status(400).json({ success: false, message: 'Phone and OTP are required' });
  }

  const result = verifyOtp(phone, otp);
  if (!result.valid) {
    return res.status(400).json({ success: false, message: result.reason });
  }

  // Hash the phone for database storage
  const phoneHash = hashPhone(phone);

  // Find or create user
  let user = await User.findOne({ phone_hash: phoneHash });
  const isNewUser = !user;

  if (isNewUser) {
    user = await User.create({
      phone_hash: phoneHash,
      phone_encrypted: encryptPhone(phone),
      is_verified: true,
    });
  } else {
    user.is_verified = true;
    await user.save();
  }

  const token = jwt.sign(
    { userId: user._id, phone },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );

  res.json({ success: true, token, isNewUser });
});

// POST /api/v1/auth/firebase-verify — verify Firebase ID token, return our JWT
router.post('/firebase-verify', async (req, res) => {
  const { id_token } = req.body;
  if (!id_token) {
    return res.status(400).json({ success: false, message: 'Firebase ID token required' });
  }
  if (!adminAuth) {
    return res.status(503).json({ success: false, message: 'Firebase Auth is not configured on this server' });
  }

  let decodedToken;
  try {
    decodedToken = await adminAuth.verifyIdToken(id_token);
  } catch (err) {
    console.error('Firebase token verify failed:', err.message);
    return res.status(401).json({ success: false, message: 'Invalid or expired Firebase token' });
  }

  const firebasePhone = decodedToken.phone_number; // e.g. "+919876543210"
  if (!firebasePhone) {
    return res.status(400).json({ success: false, message: 'No phone number in token' });
  }

  // Strip +91 country code
  const phone = firebasePhone.replace(/^\+91/, '');
  if (!INDIAN_PHONE_REGEX.test(phone)) {
    return res.status(400).json({ success: false, message: 'Only Indian numbers (+91) are supported' });
  }

  const phoneHash = hashPhone(phone);
  let user = await User.findOne({ phone_hash: phoneHash });
  const isNewUser = !user;

  if (isNewUser) {
    user = await User.create({
      phone_hash: phoneHash,
      phone_encrypted: encryptPhone(phone),
      is_verified: true,
    });
  } else {
    user.is_verified = true;
    await user.save();
  }

  const token = jwt.sign(
    { userId: user._id, phone },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );

  res.json({ success: true, token, isNewUser });
});

export default wrapRouter(router);
