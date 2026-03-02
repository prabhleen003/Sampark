import mongoose from 'mongoose';

const publicReportSchema = new mongoose.Schema(
  {
    vehicle_id:          { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', index: true, required: true },
    reporter_phone_hash: { type: String, default: null },
    reason: {
      type: String,
      enum: ['fake_qr', 'vehicle_mismatch', 'suspicious_activity', 'other'],
      required: true,
    },
    description: { type: String, maxlength: 500, default: null },
    status:      { type: String, enum: ['open', 'reviewed', 'dismissed'], default: 'open' },
    admin_notes: { type: String, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export default mongoose.model('PublicReport', publicReportSchema);
