import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    phone_hash:      { type: String, unique: true, index: true, required: true },
    phone_encrypted: { type: String, required: true },
    name:            { type: String, default: null },
    email:           { type: String, default: null },
    is_verified:     { type: Boolean, default: false },
    profile_complete:{ type: Boolean, default: false },
    role:            { type: String, enum: ['user', 'admin'], default: 'user' },
    avatar_url:      { type: String, default: null },
    language:        { type: String, enum: ['en', 'hi'], default: 'en' },
    notification_preferences: {
      missed_calls:       { type: Boolean, default: true },
      messages:           { type: Boolean, default: true },
      emergency:          { type: Boolean, default: true },
      payment_reminders:  { type: Boolean, default: true },
      qr_expiry:          { type: Boolean, default: true },
      order_updates:      { type: Boolean, default: true },
    },
    // Set when the user changes their phone number — JWT issued before this timestamp are invalid
    token_invalidated_at: { type: Date, default: null },
    // Soft delete
    deleted_at: { type: Date, default: null },
    // Privacy score (cached, refreshed by trigger events)
    privacy_score:     { type: Number, default: null },
    privacy_breakdown: { type: mongoose.Schema.Types.Mixed, default: null },
    privacy_score_at:  { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export default mongoose.model('User', userSchema);
