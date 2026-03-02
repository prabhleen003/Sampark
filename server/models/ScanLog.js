import mongoose from 'mongoose';

const scanLogSchema = new mongoose.Schema(
  {
    vehicle_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', index: true, required: true },
    user_agent: { type: String, default: null },
    ip_hash:    { type: String, default: null },
  },
  { timestamps: { createdAt: 'scanned_at', updatedAt: false } }
);

// TTL index — auto-delete scan logs older than 2 years
scanLogSchema.index({ scanned_at: 1 }, { expireAfterSeconds: 63072000 });

export default mongoose.model('ScanLog', scanLogSchema);
