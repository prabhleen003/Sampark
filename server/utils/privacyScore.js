/**
 * Privacy Score Utility
 * ---------------------
 * Calculates a 0-100 score reflecting how well-protected a user's account is.
 * Results are cached on the User document and refreshed via refreshPrivacyScore()
 * which is called at key trigger events (vehicle registered, payment complete, etc.).
 */

import User         from '../models/User.js';
import Vehicle      from '../models/Vehicle.js';
import AbuseReport  from '../models/AbuseReport.js';
import Payment      from '../models/Payment.js';

/**
 * Calculate the privacy score for a user.
 * Returns { score, breakdown } without writing to the database.
 */
export async function calculatePrivacyScore(userId) {
  const [user, vehicles] = await Promise.all([
    User.findById(userId).select('name email is_verified notification_preferences created_at'),
    Vehicle.find({ user_id: userId }).select('status emergency_contacts comm_mode qr_valid_until'),
  ]);

  if (!user) return { score: 0, breakdown: [] };

  const verifiedVehicles = vehicles.filter(v => v.status === 'verified');
  const now = new Date();

  // ── Active QR check: every verified vehicle must have a valid (paid) QR ──
  const allHaveActiveQr = verifiedVehicles.length > 0 &&
    verifiedVehicles.every(v => v.qr_valid_until && v.qr_valid_until > now);

  // ── Emergency contacts: does every verified vehicle have ≥ 2 contacts? ──
  const hasAnyContact    = verifiedVehicles.some(v => v.emergency_contacts.length >= 1);
  const allHave2Contacts = verifiedVehicles.length > 0 &&
    verifiedVehicles.every(v => v.emergency_contacts.length >= 2);

  // ── Privacy mode: at least one verified vehicle is NOT 'all' (default) ──
  const hasPrivacyMode = verifiedVehicles.some(v => v.comm_mode !== 'all');

  // ── Notification preferences customised: at least one toggle changed ──
  const defaultPrefs = { missed_calls: true, messages: true, emergency: true, payment_reminders: true, qr_expiry: true, order_updates: true };
  const prefs = user.notification_preferences || {};
  const prefsCustomised = Object.keys(defaultPrefs).some(k => prefs[k] !== undefined && prefs[k] !== defaultPrefs[k]);

  // ── No abuse reports against any of the user's vehicles ──
  const vehicleIds = vehicles.map(v => v._id);
  const abuseCount = vehicleIds.length
    ? await AbuseReport.countDocuments({ vehicle_id: { $in: vehicleIds }, status: 'open' })
    : 0;

  // ── Account age + active usage (30+ days) ──
  const ageDays = (now - new Date(user.created_at)) / (1000 * 60 * 60 * 24);
  const matureAccount = ageDays >= 30 && verifiedVehicles.length > 0;

  // ── Score factors ──
  const factors = [
    {
      factor:    'Phone verified',
      points:    15,
      completed: !!user.is_verified,
      action:    null,
    },
    {
      factor:    'Profile name set',
      points:    5,
      completed: !!(user.name?.trim()),
      action:    '/settings',
    },
    {
      factor:    'Email added',
      points:    5,
      completed: !!(user.email?.trim()),
      action:    '/settings',
    },
    {
      factor:    'At least 1 vehicle verified',
      points:    10,
      completed: verifiedVehicles.length >= 1,
      action:    '/vehicles/register',
    },
    {
      factor:    'Active QR on all vehicles',
      points:    10,
      completed: allHaveActiveQr,
      action:    '/dashboard',
    },
    {
      factor:    'Emergency contacts added',
      points:    15,
      completed: hasAnyContact,
      action:    '/dashboard',
    },
    {
      factor:    'All vehicles have 2+ emergency contacts',
      points:    5,
      completed: allHave2Contacts,
      action:    '/dashboard',
    },
    {
      factor:    'Privacy mode enabled',
      points:    10,
      completed: hasPrivacyMode,
      action:    '/dashboard',
    },
    {
      factor:    'Notification preferences configured',
      points:    5,
      completed: prefsCustomised,
      action:    '/settings',
    },
    {
      factor:    'No abuse reports',
      points:    10,
      completed: abuseCount === 0,
      action:    null,
    },
    {
      factor:    'Active account (30+ days)',
      points:    10,
      completed: matureAccount,
      action:    null,
    },
  ];

  const score = factors.reduce((sum, f) => sum + (f.completed ? f.points : 0), 0);

  return { score, breakdown: factors };
}

/**
 * Recalculate and persist the privacy score for a user.
 * Fire-and-forget safe — errors are logged but never thrown.
 */
export async function refreshPrivacyScore(userId) {
  try {
    const { score, breakdown } = await calculatePrivacyScore(userId);
    await User.findByIdAndUpdate(userId, {
      privacy_score:     score,
      privacy_breakdown: breakdown,
      privacy_score_at:  new Date(),
    });
    return score;
  } catch (err) {
    console.error('refreshPrivacyScore error:', err.message);
    return null;
  }
}
