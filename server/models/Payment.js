import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    user_id:             { type: mongoose.Schema.Types.ObjectId, ref: 'User',    index: true, required: true },
    vehicle_id:          { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', index: true, required: true },
    razorpay_order_id:   { type: String, unique: true, required: true },
    razorpay_payment_id: { type: String, default: null },
    razorpay_signature:  { type: String, default: null },
    amount:              { type: Number, required: true }, // in paise
    currency:            { type: String, default: 'INR' },
    status:              { type: String, enum: ['created', 'paid', 'failed'], default: 'created' },
    valid_from:          { type: Date, default: null },
    valid_until:         { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export default mongoose.model('Payment', paymentSchema);
