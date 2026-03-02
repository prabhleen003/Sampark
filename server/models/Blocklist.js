import mongoose from 'mongoose';

const blocklistSchema = new mongoose.Schema(
  {
    vehicle_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', index: true, default: null },
    caller_hash: { type: String, required: true, index: true },
    reason:      { type: String, required: true },
    blocked_by:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // null = system action
    block_type:  { type: String, enum: ['vehicle_specific', 'global'], required: true },
    expires_at:  { type: Date, default: null }, // null = permanent
    created_at:  { type: Date, default: Date.now },
  },
  { timestamps: false }
);

// Fast lookup during call initiation
blocklistSchema.index({ vehicle_id: 1, caller_hash: 1 });

export default mongoose.model('Blocklist', blocklistSchema);
