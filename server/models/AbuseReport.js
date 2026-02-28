import mongoose from 'mongoose';

const abuseReportSchema = new mongoose.Schema(
  {
    call_log_id:        { type: mongoose.Schema.Types.ObjectId, ref: 'CallLog', required: true },
    vehicle_id:         { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true, index: true },
    reported_by_user_id:{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: {
      type: String,
      enum: ['harassment', 'spam', 'threatening', 'other'],
      required: true,
    },
    status: { type: String, enum: ['open', 'reviewed'], default: 'open' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export default mongoose.model('AbuseReport', abuseReportSchema);
