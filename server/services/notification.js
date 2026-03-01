import Notification from '../models/Notification.js';
import User         from '../models/User.js';

// Map notification types → preference keys.
// null means "always send regardless of preferences" (emergency, verification, abuse).
const PREF_MAP = {
  missed_call:              'missed_calls',
  message_received:         'messages',
  emergency_alert:          null,
  emergency_unresolved:     null,
  emergency_contact_called: null,
  payment_success:          'payment_reminders',
  qr_generated:             'payment_reminders',
  qr_expiring:              'qr_expiry',
  qr_expiring_soon:         'qr_expiry',
  qr_expired:               'qr_expiry',
  order_update:             'order_updates',
  order_shipped:            'order_updates',
  order_delivered:          'order_updates',
  vehicle_verified:         null,
  vehicle_rejected:         null,
  verification_update:      null,
  abuse_report_filed:       null,
  abuse_report_resolved:    null,
};

/**
 * Create a notification for a user.
 * Fire-and-forget safe — errors are logged but never thrown.
 * Respects the user's notification_preferences before creating.
 *
 * @param {string|ObjectId} userId
 * @param {string}          type
 * @param {string}          title
 * @param {string}          body
 * @param {string|null}     vehicleId
 * @param {string|null}     actionUrl
 * @param {object}          metadata
 */
export async function createNotification(
  userId,
  type,
  title,
  body,
  vehicleId  = null,
  actionUrl  = null,
  metadata   = {}
) {
  try {
    const prefKey = PREF_MAP[type];
    const user = await User.findById(userId).select('notification_preferences deleted_at');

    // Skip for deleted accounts
    if (user?.deleted_at) return;

    // If there's a preference key, check if the user has disabled it
    if (prefKey !== undefined && prefKey !== null) {
      if (user?.notification_preferences?.[prefKey] === false) return;
    }

    await Notification.create({
      user_id:    userId,
      type,
      title,
      body,
      vehicle_id: vehicleId,
      action_url: actionUrl,
      metadata,
    });
  } catch (err) {
    console.error('Failed to create notification:', err.message);
  }
}
