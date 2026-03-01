import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export default async function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  const token = header.split(' ')[1];
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }

  // Check if the token was invalidated by a phone-number change
  const user = await User.findById(payload.userId).select('token_invalidated_at deleted_at');
  if (!user || user.deleted_at) {
    return res.status(401).json({ success: false, message: 'Account not found' });
  }
  if (user.token_invalidated_at) {
    const tokenIat = new Date(payload.iat * 1000);
    if (tokenIat < user.token_invalidated_at) {
      return res.status(401).json({ success: false, message: 'Session expired. Please login again.' });
    }
  }

  req.user = payload;
  next();
}
