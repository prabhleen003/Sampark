import crypto from 'crypto';
import Vehicle from '../models/Vehicle.js';

/**
 * Generate a signed URL for a vehicle. If a token value is supplied it is used
 * directly; otherwise we generate a random 16‑byte hex string. Caller should
 * persist `sig` on the vehicle record. Rotating the token invalidates previous
 * links once `verifySignature` checks against stored value.
 */
export function generateSignedUrl(vehicleId, token) {
  const sig = token || crypto.randomBytes(16).toString('hex');
  const appUrl = process.env.APP_URL || 'http://localhost:5173';
  return { url: `${appUrl}/v/${vehicleId}?sig=${sig}`, sig };
}

/**
 * Verify by fetching vehicle record and comparing the provided signature to
 * the stored qr_token. Uses constant‑time comparison to avoid timing attacks.
 */
export async function verifySignature(vehicleId, sig) {
  if (!sig) return false;
  try {
    const vehicle = await Vehicle.findById(vehicleId).select('qr_token');
    if (!vehicle || !vehicle.qr_token) return false;
    return crypto.timingSafeEqual(
      Buffer.from(vehicle.qr_token, 'hex'),
      Buffer.from(sig, 'hex')
    );
  } catch {
    return false;
  }
}
