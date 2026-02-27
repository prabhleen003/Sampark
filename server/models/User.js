import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    phone_hash: { type: String, unique: true, index: true, required: true },
    phone_encrypted: { type: String, required: true },
    name: { type: String, default: null },
    is_verified: { type: Boolean, default: false },
    profile_complete: { type: Boolean, default: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export default mongoose.model('User', userSchema);
