import User from '../models/User.js';

export default async function adminMiddleware(req, res, next) {
  const user = await User.findById(req.user.userId).select('role');
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
}
