import mongoose from 'mongoose';

const STAGES = [
  'calling_owner',
  'calling_contact_1',
  'calling_contact_2',
  'calling_contact_3',
  'connected',
  'all_failed',
];

const emergencySessionSchema = new mongoose.Schema(
  {
    vehicle_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', index: true, required: true },
    caller_phone_encrypted: { type: String, required: true },
    description:  { type: String, default: null },
    stage:        { type: String, enum: STAGES, default: 'calling_owner' },
    connected_to: { type: String, default: null }, // 'owner' | 'contact_1' | 'contact_2' | 'contact_3'
    blocked_caller_emergency: { type: Boolean, default: false }, // true if caller was blocked but emergency bypassed
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export default mongoose.model('EmergencySession', emergencySessionSchema);
