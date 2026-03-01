import express from 'express';
import Notification from '../models/Notification.js';

const router = express.Router();

// GET /api/v1/notifications  (protected)
// Query: ?unread=true  ?page=1  ?limit=20  ?types=missed_call,message_received
router.get('/', async (req, res) => {
  const filter = { user_id: req.user.userId };
  if (req.query.unread === 'true') filter.read = false;
  if (req.query.types) {
    const types = req.query.types.split(',').map(t => t.trim()).filter(Boolean);
    if (types.length) filter.type = { $in: types };
  }

  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 20);
  const skip  = (page - 1) * limit;

  const [notifications, total, unread_count] = await Promise.all([
    Notification.find(filter)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .select('-__v'),
    Notification.countDocuments(filter),
    Notification.countDocuments({ user_id: req.user.userId, read: false }),
  ]);

  res.json({ success: true, notifications, total, page, unread_count });
});

// GET /api/v1/notifications/unread-count  (protected)
// Lightweight endpoint polled every 60 s by the Dashboard bell
router.get('/unread-count', async (req, res) => {
  const count = await Notification.countDocuments({ user_id: req.user.userId, read: false });
  res.json({ success: true, unread_count: count });
});

// PUT /api/v1/notifications/read-all  (protected)
// IMPORTANT: this route must come before /:id/read to avoid param collision
router.put('/read-all', async (req, res) => {
  await Notification.updateMany({ user_id: req.user.userId, read: false }, { read: true });
  res.json({ success: true });
});

// PUT /api/v1/notifications/:id/read  (protected)
router.put('/:id/read', async (req, res) => {
  const notif = await Notification.findOneAndUpdate(
    { _id: req.params.id, user_id: req.user.userId },
    { read: true },
    { new: true }
  );
  if (!notif) return res.status(404).json({ success: false, message: 'Notification not found' });
  res.json({ success: true });
});

export default router;
