import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    user_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'User',    index: true, required: true },
    vehicle_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', index: true, required: true },
    txnid:      { type: String, unique: true, required: true }, // our transaction ID sent to PayU
    mihpayid:   { type: String, default: null },                // PayU's payment ID
    amount:     { type: Number, required: true },               // in rupees
    status:     { type: String, enum: ['created', 'paid', 'failed'], default: 'created' },
    valid_from:  { type: Date, default: null },
    valid_until: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export default mongoose.model('Payment', paymentSchema);
