/**
 * QR Expiry Checker
 * -----------------
 * Fire-and-forget helper called from GET /api/v1/users/me.
 * Checks if any of the user's active vehicles have QRs expiring within 30 days
 * and creates a single qr_expiring_soon notification per vehicle per 7-day window
 * (deduplication is done via metadata.notified_window).
 */
import Vehicle      from '../models/Vehicle.js';
import Notification from '../models/Notification.js';
import { createNotification } from '../services/notification.js';

const WARN_DAYS    = 30;  // fire warning if expiry is within this many days
const DEDUP_DAYS   = 7;   // only re-notify once per 7-day window

export async function checkQrExpiry(userId) {
  try {
    const now     = new Date();
    const cutoff  = new Date(now.getTime() + WARN_DAYS * 24 * 60 * 60 * 1000);
    const dedupMs = DEDUP_DAYS * 24 * 60 * 60 * 1000;

    // Find verified vehicles belonging to this user whose QR is expiring soon
    const vehicles = await Vehicle.find({
      user_id:       userId,
      status:        'approved',
      qr_valid_until: { $gt: now, $lt: cutoff },
    }).select('_id plate_number qr_valid_until');

    for (const v of vehicles) {
      // Check if we already sent a qr_expiring_soon notification in the last DEDUP_DAYS
      const recent = await Notification.findOne({
        user_id:    userId,
        vehicle_id: v._id,
        type:       'qr_expiring_soon',
        created_at: { $gt: new Date(now.getTime() - dedupMs) },
      });

      if (recent) continue; // already notified this week

      const daysLeft = Math.ceil((v.qr_valid_until - now) / (24 * 60 * 60 * 1000));

      await createNotification(
        userId,
        'qr_expiring_soon',
        `QR expiring in ${daysLeft} day${daysLeft === 1 ? '' : 's'} — ${v.plate_number}`,
        `Your QR code for ${v.plate_number} expires on ${v.qr_valid_until.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}. Renew now to keep your vehicle contactable.`,
        v._id,
        '/dashboard',
        { plate_number: v.plate_number, days_left: daysLeft, expires_at: v.qr_valid_until }
      );
    }
  } catch (err) {
    console.error('checkQrExpiry error:', err.message);
  }
}
