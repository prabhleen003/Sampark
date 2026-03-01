import mongoose from 'mongoose';

const NOTIF_TYPES = [
  // Calls
  'missed_call',
  // Messages
  'message_received',
  // Emergency
  'emergency_alert',
  'emergency_unresolved',
  'emergency_contact_called',
  // Vehicle verification
  'vehicle_verified',
  'vehicle_rejected',
  'verification_update',
  // QR lifecycle
  'qr_generated',
  'qr_expiring',
  'qr_expiring_soon',
  'qr_expired',
  // Payments
  'payment_success',
  // Orders
  'order_update',
  'order_shipped',
  'order_delivered',
  // Abuse
  'abuse_report_filed',
  'abuse_report_resolved',
];

const notificationSchema = new mongoose.Schema(
  {
    user_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'User',    index: true, required: true },
    vehicle_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', default: null },
    type:       { type: String, enum: NOTIF_TYPES, required: true },
    title:      { type: String, required: true },
    body:       { type: String, required: true },
    read:       { type: Boolean, default: false, index: true },
    action_url: { type: String, default: null },
    metadata:   { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export default mongoose.model('Notification', notificationSchema);
