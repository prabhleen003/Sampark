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
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },
    rejection_reason: { type: String, default: null },
    qr_token: { type: String, unique: true, sparse: true, default: null },
    comm_mode: {
      type: String,
      enum: ['all', 'message_only', 'silent'],
      default: 'all',
    },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export default mongoose.model('Vehicle', vehicleSchema);
