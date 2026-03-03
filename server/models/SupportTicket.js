import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    sender:      { type: String, enum: ['user', 'admin', 'system'], required: true },
    sender_id:   { type: mongoose.Schema.Types.ObjectId, default: null },
    sender_name: { type: String, required: true },
    text:        { type: String, maxlength: 2000, required: true },
    attachments: { type: [String], default: [] },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

const supportTicketSchema = new mongoose.Schema(
  {
    user_id:       { type: mongoose.Schema.Types.ObjectId, ref: 'User',    index: true, required: true },
    vehicle_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', default: null },
    ticket_number: { type: String, unique: true, required: true },
    subject:       { type: String, maxlength: 200, required: true },
    category: {
      type: String,
      enum: ['account', 'vehicle', 'payment', 'qr', 'calling', 'messaging', 'emergency', 'order', 'technical', 'other'],
      required: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'awaiting_user', 'resolved', 'closed'],
      default: 'open',
    },
    messages:             { type: [messageSchema], default: [] },
    resolved_at:          { type: Date, default: null },
    closed_at:            { type: Date, default: null },
    satisfaction_rating:  { type: Number, min: 1, max: 5, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export default mongoose.model('SupportTicket', supportTicketSchema);
