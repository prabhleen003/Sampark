import mongoose from 'mongoose';

const abuseReportSchema = new mongoose.Schema(
  {
    call_log_id:         { type: mongoose.Schema.Types.ObjectId, ref: 'CallLog', required: true },
    vehicle_id:          { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true, index: true },
    reported_by_user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    caller_hash:         { type: String, default: null }, // denormalized from CallLog.sender_phone_hash
    reason: {
      type: String,
      enum: ['harassment', 'spam', 'threatening', 'other'],
      required: true,
    },
    status:      { type: String, enum: ['open', 'reviewed', 'resolved'], default: 'open' },
    resolution:  { type: String, default: null }, // dismissed | caller_warned | caller_blocked_vehicle | caller_blocked_global | vehicle_suspended
    admin_notes: { type: String, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export default mongoose.model('AbuseReport', abuseReportSchema);
