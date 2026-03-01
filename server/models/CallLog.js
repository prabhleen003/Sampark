import mongoose from 'mongoose';

const callLogSchema = new mongoose.Schema(
  {
    vehicle_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', index: true, required: true },
    type: {
      type: String,
      enum: ['message', 'call', 'emergency'],
      required: true,
    },
    sender_phone_hash: { type: String, default: null },
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
