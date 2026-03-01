import express from 'express';
import User from '../models/User.js';
import authMiddleware from '../middleware/auth.js';
import { checkQrExpiry }      from '../utils/expiryChecker.js';
import { refreshPrivacyScore } from '../utils/privacyScore.js';

const router = express.Router();

// GET /api/v1/users/me  (protected)
router.get('/me', authMiddleware, async (req, res) => {
  const user = await User.findById(req.user.userId).select('-__v');
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }
  res.json({ success: true, user });

  // Fire-and-forget background tasks after response is sent
  checkQrExpiry(req.user.userId);
  // Only refresh score if it hasn't been calculated recently (within 5 min) to avoid spam
  if (!user.privacy_score_at || (Date.now() - new Date(user.privacy_score_at).getTime()) > 5 * 60 * 1000) {
    refreshPrivacyScore(req.user.userId);
  }
});

// PUT /api/v1/users/me  (protected)
router.put('/me', authMiddleware, async (req, res) => {
  const { name } = req.body;
  if (!name || name.trim().length < 2) {
    return res.status(400).json({ success: false, message: 'Name must be at least 2 characters' });
  }

  const user = await User.findByIdAndUpdate(
    req.user.userId,
    { name: name.trim(), profile_complete: true },
    { new: true }
  ).select('-__v');

  res.json({ success: true, user });
});

export default router;
