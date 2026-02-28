/**
 * In-memory rate limiter for call attempts.
 * No Redis required — sufficient for single-server dev/demo.
 *
 * Limits:
 *   - Per caller+vehicle: max 3 calls per hour
 *   - Per vehicle (all callers): max 15 calls per calendar day
 */

// key: `${callerPhone}:${vehicleId}` → [timestamp, ...]
const callerMap = new Map();

// key: `${vehicleId}:${YYYY-MM-DD}` → count
const vehicleMap = new Map();

const CALLER_LIMIT  = 3;
const VEHICLE_LIMIT = 15;
const ONE_HOUR_MS   = 60 * 60 * 1000;

function todayKey() {
  return new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
}

/**
 * Returns true if the caller has hit their rate limit for this vehicle.
 * Registers the call attempt if not blocked.
 */
export function checkCallerRateLimit(callerPhone, vehicleId) {
  const key = `${callerPhone}:${vehicleId}`;
  const now = Date.now();
  const timestamps = (callerMap.get(key) || []).filter(t => now - t < ONE_HOUR_MS);

  if (timestamps.length >= CALLER_LIMIT) return true;

  timestamps.push(now);
  callerMap.set(key, timestamps);
  return false;
}

/**
 * Returns true if the vehicle has hit its daily call cap.
 * Registers the call attempt if not blocked.
 */
export function checkVehicleRateLimit(vehicleId) {
  const key = `${vehicleId}:${todayKey()}`;
  const count = vehicleMap.get(key) || 0;

  if (count >= VEHICLE_LIMIT) return true;

  vehicleMap.set(key, count + 1);
  return false;
}
