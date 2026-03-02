import CallLog    from '../models/CallLog.js';
import AbuseReport from '../models/AbuseReport.js';
import Blocklist   from '../models/Blocklist.js';

function calculateRiskLevel(totalCalls, reports, vehicleCount) {
  if (reports >= 3) return 'high';
  if (reports >= 1 && totalCalls > 20) return 'high';
  if (reports >= 1 || totalCalls > 30) return 'medium';
  if (vehicleCount > 10) return 'medium';
  return 'low';
}

export async function getCallerProfile(callerHash) {
  const [
    totalCalls,
    callsByType,
    vehiclesContacted,
    firstSeen,
    lastSeen,
    isBlocked,
  ] = await Promise.all([
    CallLog.countDocuments({ sender_phone_hash: callerHash }),

    CallLog.aggregate([
      { $match: { sender_phone_hash: callerHash } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]),

    CallLog.aggregate([
      { $match: { sender_phone_hash: callerHash } },
      { $group: { _id: '$vehicle_id' } },
    ]),

    CallLog.findOne({ sender_phone_hash: callerHash }).sort({ created_at: 1 }).select('created_at'),

    CallLog.findOne({ sender_phone_hash: callerHash }).sort({ created_at: -1 }).select('created_at'),

    Blocklist.findOne({
      caller_hash: callerHash,
      $and: [
        { $or: [{ block_type: 'global' }, { block_type: 'vehicle_specific' }] },
        { $or: [{ expires_at: null }, { expires_at: { $gt: new Date() } }] },
      ],
    }),
  ]);

  // Count reports against this caller via their call log IDs
  const callerLogIds = await CallLog.find({ sender_phone_hash: callerHash }).distinct('_id');
  const reportsAgainst = await AbuseReport.countDocuments({ call_log_id: { $in: callerLogIds } });

  const uniqueVehicleCount = vehiclesContacted.length;

  return {
    caller_hash:              callerHash,
    total_interactions:       totalCalls,
    calls_by_type:            callsByType,
    unique_vehicles_contacted: uniqueVehicleCount,
    reports_against:          reportsAgainst,
    first_seen:               firstSeen?.created_at || null,
    last_seen:                lastSeen?.created_at  || null,
    is_currently_blocked:     !!isBlocked,
    risk_level:               calculateRiskLevel(totalCalls, reportsAgainst, uniqueVehicleCount),
  };
}

/**
 * Check if a caller is blocked from contacting a vehicle.
 * Returns true if any active block (global or vehicle-specific) exists.
 */
export async function isCallerBlocked(callerHash, vehicleId) {
  const block = await Blocklist.findOne({
    caller_hash: callerHash,
    $and: [
      {
        $or: [
          { block_type: 'global' },
          { block_type: 'vehicle_specific', vehicle_id: vehicleId },
        ],
      },
      {
        $or: [
          { expires_at: null },
          { expires_at: { $gt: new Date() } },
        ],
      },
    ],
  });
  return !!block;
}
