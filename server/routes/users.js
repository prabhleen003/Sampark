import express from 'express';
import User from '../models/User.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// GET /api/v1/users/me  (protected)
router.get('/me', authMiddleware, async (req, res) => {
  const user = await User.findById(req.user.userId).select('-__v');
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }
  res.json({ success: true, user });
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
