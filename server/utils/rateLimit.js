/**
 * In-memory rate limiter for call/SMS attempts.
 * No Redis required — sufficient for single-server dev/demo.
 * NOTE: resets on restart; replace Maps with Redis for multi-instance production.
 *
 * Limits:
 *   - Per caller+vehicle: max 3 calls per hour
 *   - Per vehicle (all callers): max 15 calls per calendar day
 *   - Per IP+vehicle: max 5 calls per hour (bypass-resistant secondary check)
 *   - Per IP sms-lookup: max 10 attempts per hour (brute-force guard on card_code lookup)
 */

// key: `${callerPhone}:${vehicleId}` → [timestamp, ...]
const callerMap = new Map();

// key: `${vehicleId}:${YYYY-MM-DD}` → count
const vehicleMap = new Map();

// key: `${ip}:${vehicleId}` → [timestamp, ...]  — IP-based secondary limiter
const ipMap = new Map();

// key: `sms-lookup:${ip}` → [timestamp, ...]  — brute-force guard on card_code lookup
const smsLookupMap = new Map();

const CALLER_LIMIT      = 3;
const VEHICLE_LIMIT     = 15;
const IP_LIMIT          = 5;   // slightly higher than phone limit to allow shared IPs (offices)
const SMS_LOOKUP_LIMIT  = 10;  // per-IP per-hour cap on card_code lookups
const ONE_HOUR_MS       = 60 * 60 * 1000;

function todayKey() {
  return new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
}

/**
 * Returns true if the IP has hit the per-IP per-vehicle rate limit.
 * Registers the attempt if not blocked.
 * Call this alongside checkCallerRateLimit — either can independently block.
 */
export function checkIpRateLimit(ip, vehicleId) {
  if (!ip) return false; // no IP available — don't block, just skip
  const key = `${ip}:${vehicleId}`;
  const now = Date.now();
  const timestamps = (ipMap.get(key) || []).filter(t => now - t < ONE_HOUR_MS);

  if (timestamps.length >= IP_LIMIT) return true;

  timestamps.push(now);
  ipMap.set(key, timestamps);
  return false;
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
 * Returns limiter state for per-vehicle daily cap.
 * - blocked: whether call should be rejected
 * - shouldFlagForReview: true only on the first blocked attempt (16th call)
 */
export function checkVehicleRateLimit(vehicleId) {
  const key = `${vehicleId}:${todayKey()}`;
  const count = vehicleMap.get(key) || 0;

  if (count >= VEHICLE_LIMIT) {
    const shouldFlagForReview = count === VEHICLE_LIMIT;
    // Track blocked attempts so "first blocked" is emitted once.
    vehicleMap.set(key, count + 1);
    return {
      blocked: true,
      shouldFlagForReview,
      count: count + 1,
      limit: VEHICLE_LIMIT,
    };
  }

  vehicleMap.set(key, count + 1);
  return {
    blocked: false,
    shouldFlagForReview: false,
    count: count + 1,
    limit: VEHICLE_LIMIT,
  };
}

/**
 * Returns true if the IP has hit the sms-lookup rate limit.
 * Registers the attempt if not blocked.
 */
export function checkSmsLookupRateLimit(ip) {
  if (!ip) return false;
  const key = `sms-lookup:${ip}`;
  const now = Date.now();
  const timestamps = (smsLookupMap.get(key) || []).filter(t => now - t < ONE_HOUR_MS);

  if (timestamps.length >= SMS_LOOKUP_LIMIT) return true;

  timestamps.push(now);
  smsLookupMap.set(key, timestamps);
  return false;
}
