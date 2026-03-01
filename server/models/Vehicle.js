import mongoose from 'mongoose';

const vehicleSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
    plate_number: { type: String, unique: true, uppercase: true, index: true, required: true },
    rc_doc_url: { type: String, required: true },
    dl_doc_url: { type: String, required: true },
    plate_photo_url: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'awaiting_digilocker', 'verified', 'verification_failed', 'deactivated'],
      default: 'pending',
    },
    rejection_reason:        { type: String,  default: null },
    verification_method:     { type: String,  enum: ['basic', 'digilocker'], default: null },
    verification_confidence: { type: String,  enum: ['low', 'high'], default: null },
    digilocker_verified:     { type: Boolean, default: false },
    needs_manual_review:     { type: Boolean, default: false },
    qr_token: { type: String, unique: true, sparse: true, default: null },
    qr_image_url: { type: String, default: null },
    comm_mode: {
      type: String,
      enum: ['all', 'message_only', 'silent'],
      default: 'all',
    },
    flagged_for_review: { type: Boolean, default: false },
    qr_valid_until:     { type: Date,    default: null },
    card_code:          { type: String,  default: null },
    emergency_contacts: [
      {
        phone_encrypted: { type: String, required: true },
        label:           { type: String, required: true },
        priority:        { type: Number, required: true },
      },
    ],
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export default mongoose.model('Vehicle', vehicleSchema);
