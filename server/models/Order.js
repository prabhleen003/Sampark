import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    user_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'User',    index: true, required: true },
    vehicle_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', index: true, required: true },
    type:       { type: String, enum: ['standard', 'express'], default: 'standard' },
    delivery_address: {
      name:    { type: String, required: true },
      line1:   { type: String, required: true },
      line2:   { type: String, default: '' },
      city:    { type: String, required: true },
      state:   { type: String, required: true },
      pincode: { type: String, required: true },
      phone:   { type: String, required: true },
    },
    amount:    { type: Number, required: true }, // in rupees
    txnid:     { type: String, unique: true, required: true }, // our transaction ID sent to PayU
    mihpayid:  { type: String, default: null },                // PayU's payment ID
    status: {
      type: String,
      enum: ['created', 'paid', 'processing', 'shipped', 'delivered'],
      default: 'created',
    },
    tracking_id: { type: String, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export default mongoose.model('Order', orderSchema);
