import mongoose from 'mongoose';

const vehicleSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
    // plate_number unique enforced via partial index below (excludes deactivated vehicles)
    plate_number: { type: String, uppercase: true, index: true, required: true },
    rc_doc_url: { type: String, required: true },
    dl_doc_url: { type: String, required: true },
    plate_photo_url: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'awaiting_digilocker', 'verified', 'verification_failed', 'deactivated', 'suspended', 'needs_reverification'],
      default: 'pending',
    },
    rejection_reason:        { type: String,  default: null },
    suspension_reason:       { type: String,  default: null },
    verification_method:     { type: String,  enum: ['basic', 'digilocker'], default: null },
    verification_confidence: { type: String,  enum: ['low', 'high'], default: null },
    digilocker_verified:     { type: Boolean, default: false },
    verification_failed_count: { type: Number, default: 0 },
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

    // Transfer fields
    transfer_status:       { type: String, enum: ['none', 'pending', 'completed'], default: 'none' },
    transfer_initiated_at: { type: Date,   default: null },
    transfer_token:        { type: String, unique: true, sparse: true, default: null },
    transfer_expires_at:   { type: Date,   default: null },

    // Soft-delete fields
    deactivated_at:      { type: Date,   default: null },
    deactivation_reason: { type: String, enum: ['owner_removed', 'transferred', 'admin_suspended', 'account_deleted', null], default: null },
    previous_owner_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// Partial unique index: plate_number is unique only among active (non-deactivated) vehicles
vehicleSchema.index(
  { plate_number: 1 },
  { unique: true, partialFilterExpression: { deactivated_at: null }, name: 'plate_number_active_unique' }
);

export default mongoose.model('Vehicle', vehicleSchema);
