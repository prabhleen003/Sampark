import express from 'express';
import { wrapRouter } from '../middleware/asyncHandler.js';
import crypto from 'crypto';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import SupportTicket from '../models/SupportTicket.js';
import Vehicle from '../models/Vehicle.js';
import User from '../models/User.js';
import authMiddleware from '../middleware/auth.js';
import { createNotification } from '../services/notification.js';

const router = express.Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const faqData = JSON.parse(readFileSync(path.join(__dirname, '../data/faq.json'), 'utf8'));

const VALID_CATEGORIES = ['account', 'vehicle', 'payment', 'qr', 'calling', 'messaging', 'emergency', 'order', 'technical', 'other'];

function getDefaultPriority(category) {
  const map = { emergency: 'critical', calling: 'high', payment: 'high', qr: 'medium', vehicle: 'medium', order: 'medium', messaging: 'medium', account: 'low', technical: 'medium', other: 'low' };
  return map[category] || 'medium';
}

function generateTicketNumber() {
  return 'SAM-' + crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 5);
}

// GET /api/v1/support/faq — public, no auth
router.get('/faq', (req, res) => {
  res.json({ success: true, faq: faqData });
});

// POST /api/v1/support — create ticket
router.post('/', authMiddleware, async (req, res) => {
  const { subject, category, message, vehicle_id } = req.body;

  if (!subject?.trim() || !category || !message?.trim()) {
    return res.status(400).json({ success: false, message: 'Subject, category, and message are required' });
  }
  if (subject.trim().length > 200) {
    return res.status(400).json({ success: false, message: 'Subject must be under 200 characters' });
  }
  if (message.trim().length > 2000) {
    return res.status(400).json({ success: false, message: 'Message must be under 2000 characters' });
  }
  if (!VALID_CATEGORIES.includes(category)) {
    return res.status(400).json({ success: false, message: 'Invalid category' });
  }

  if (vehicle_id) {
    const v = await Vehicle.findOne({ _id: vehicle_id, user_id: req.user.userId });
    if (!v) return res.status(400).json({ success: false, message: 'Vehicle not found' });
  }

  const user = await User.findById(req.user.userId).select('name');
  const ticketNumber = generateTicketNumber();

  const ticket = await SupportTicket.create({
    user_id:       req.user.userId,
    vehicle_id:    vehicle_id || null,
    ticket_number: ticketNumber,
    subject:       subject.trim(),
    category,
    priority:      getDefaultPriority(category),
    messages: [{
      sender:      'user',
      sender_id:   req.user.userId,
      sender_name: user?.name || 'User',
      text:        message.trim(),
    }],
  });

  createNotification(
    req.user.userId, 'support_ticket_created',
    'Ticket Created',
    `Your support ticket ${ticketNumber} has been created. We'll respond within 24 hours.`,
    null, '/support/tickets',
    { ticket_id: ticket._id.toString() }
  );

  res.status(201).json({ success: true, ticket });
});

// GET /api/v1/support — list user's tickets
router.get('/', authMiddleware, async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const filter = { user_id: req.user.userId };
  if (status) filter.status = status;

  const skip = (Number(page) - 1) * Number(limit);

  const [tickets, total] = await Promise.all([
    SupportTicket.find(filter).sort({ updated_at: -1 }).skip(skip).limit(Number(limit)),
    SupportTicket.countDocuments(filter),
  ]);

  const withPreview = tickets.map(t => {
    const msgs = t.messages;
    const last = msgs[msgs.length - 1];
    return {
      ...t.toObject(),
      messages: undefined,
      message_count: msgs.length,
      last_message: last ? { text: last.text.slice(0, 100), sender: last.sender, created_at: last.created_at } : null,
      has_unread: last?.sender === 'admin',
    };
  });

  res.json({ success: true, tickets: withPreview, total, page: Number(page), total_pages: Math.ceil(total / Number(limit)) });
});

// GET /api/v1/support/:ticketId — full ticket
router.get('/:ticketId', authMiddleware, async (req, res) => {
  const ticket = await SupportTicket.findOne({ _id: req.params.ticketId, user_id: req.user.userId })
    .populate('vehicle_id', 'plate_number status');
  if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
  res.json({ success: true, ticket });
});

// POST /api/v1/support/:ticketId/message — user adds message
router.post('/:ticketId/message', authMiddleware, async (req, res) => {
  const { text } = req.body;
  if (!text?.trim() || text.trim().length > 2000) {
    return res.status(400).json({ success: false, message: 'Message required, max 2000 characters' });
  }

  const ticket = await SupportTicket.findOne({ _id: req.params.ticketId, user_id: req.user.userId });
  if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
  if (ticket.status === 'closed') {
    return res.status(400).json({ success: false, message: 'Ticket is closed. Reopen it first.' });
  }

  const user = await User.findById(req.user.userId).select('name');

  ticket.messages.push({ sender: 'user', sender_id: req.user.userId, sender_name: user?.name || 'User', text: text.trim() });

  if (ticket.status === 'awaiting_user') ticket.status = 'open';
  if (ticket.status === 'resolved') {
    ticket.status = 'open';
    ticket.resolved_at = null;
    ticket.messages.push({ sender: 'system', sender_id: null, sender_name: 'System', text: 'Ticket reopened by user.' });
  }

  ticket.updated_at = new Date();
  await ticket.save();
  res.json({ success: true, ticket });
});

// PUT /api/v1/support/:ticketId/close — user closes ticket
router.put('/:ticketId/close', authMiddleware, async (req, res) => {
  const { satisfaction_rating } = req.body;
  const ticket = await SupportTicket.findOne({ _id: req.params.ticketId, user_id: req.user.userId });
  if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
  if (ticket.status === 'closed') return res.status(400).json({ success: false, message: 'Ticket is already closed' });

  ticket.status = 'closed';
  ticket.closed_at = new Date();
  if (satisfaction_rating >= 1 && satisfaction_rating <= 5) ticket.satisfaction_rating = satisfaction_rating;
  ticket.messages.push({ sender: 'system', sender_id: null, sender_name: 'System', text: 'Ticket closed by user.' });
  ticket.updated_at = new Date();
  await ticket.save();
  res.json({ success: true, ticket });
});

// POST /api/v1/support/:ticketId/reopen — reopen within 7 days
router.post('/:ticketId/reopen', authMiddleware, async (req, res) => {
  const ticket = await SupportTicket.findOne({ _id: req.params.ticketId, user_id: req.user.userId });
  if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
  if (ticket.status !== 'closed') return res.status(400).json({ success: false, message: 'Only closed tickets can be reopened' });

  const daysSinceClosed = (Date.now() - new Date(ticket.closed_at)) / 86400000;
  if (daysSinceClosed > 7) {
    return res.status(400).json({ success: false, message: 'Ticket can only be reopened within 7 days of closing. Please create a new ticket.' });
  }

  ticket.status = 'open';
  ticket.closed_at = null;
  ticket.messages.push({ sender: 'system', sender_id: null, sender_name: 'System', text: 'Ticket reopened by user.' });
  ticket.updated_at = new Date();
  await ticket.save();
  res.json({ success: true, ticket });
});

export default wrapRouter(router);
