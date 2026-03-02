import mongoose from 'mongoose';
import { createHash } from 'crypto';

const INDIAN_PHONE_RE = /^[6-9]\d{9}$/;

function normalizeSenderPhoneHash(value) {
  if (value === null || value === undefined || value === '') return null;
  const raw = String(value).trim();
  // Defensive: if a raw phone slips through, hash it before writing.
  if (INDIAN_PHONE_RE.test(raw)) {
    return createHash('sha256').update(raw).digest('hex');
  }
  return raw;
}

const callLogSchema = new mongoose.Schema(
  {
    vehicle_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', index: true, required: true },
    type: {
      type: String,
      enum: ['message', 'call', 'emergency'],
      required: true,
    },
    sender_phone_hash: { type: String, default: null, set: normalizeSenderPhoneHash },
    template_id:       { type: Number, default: null },
    custom_text:       { type: String, default: null },
    exotel_sid:        { type: String, default: null, index: true },
    status:            { type: String, enum: ['initiated', 'completed', 'no-answer', 'busy', 'failed'], default: null },
    duration_seconds:  { type: Number, default: null },
    fallback_token:      { type: String, default: null },
    fallback_expires:    { type: Date,   default: null },
    fallback_token_used: { type: Boolean, default: false },
    fallback_message:    { type: String, default: null },
    fallback_urgency:    { type: String, enum: ['normal', 'urgent', 'emergency'], default: null },
    anonymized:          { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export default mongoose.model('CallLog', callLogSchema);
