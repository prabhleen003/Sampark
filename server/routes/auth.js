import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { generateOtp, storeOtp, verifyOtp } from '../utils/otp.js';

const router = express.Router();

const INDIAN_PHONE_REGEX = /^[6-9]\d{9}$/;

// POST /api/v1/auth/send-otp
router.post('/send-otp', async (req, res) => {
  const { phone } = req.body;

  if (!phone || !INDIAN_PHONE_REGEX.test(phone)) {
    return res.status(400).json({ success: false, message: 'Enter a valid 10-digit Indian mobile number' });
  }

  const otp = generateOtp();
  storeOtp(phone, otp);

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

  // Find or create user
  let user = await User.findOne({ phone_hash: phone });
  const isNewUser = !user;

  if (isNewUser) {
    user = await User.create({
      phone_hash: phone,
      phone_encrypted: phone, // plain for now — encrypt with AES-256 later
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

export default router;
