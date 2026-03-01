/**
 * Verification strategy picker.
 *
 * Reads VERIFICATION_MODE env var:
 *   'basic'       → instant structural check (default)
 *   'digilocker'  → OAuth flow (returns next_step instead of verified)
 *
 * Usage:
 *   import { runVerifier, VERIFICATION_MODE } from '../services/verification/index.js';
 *   const result = await runVerifier(vehicle, files);
 *   // { verified, method, confidence, digilockerVerified?, reason?, nextStep? }
 */

import * as basic      from './basic.js';
import * as digilocker from './digilocker.js';

export const VERIFICATION_MODE = process.env.VERIFICATION_MODE || 'basic';

/**
 * Run the configured verifier.
 *
 * In digilocker mode: returns { nextStep: 'digilocker', authUrl }
 * In basic mode:      returns { verified, method, confidence } or { verified: false, reason }
 */
export async function runVerifier(vehicle, files, userId) {
  if (VERIFICATION_MODE === 'digilocker') {
    const authUrl = digilocker.buildAuthUrl(userId, vehicle._id.toString());
    return { nextStep: 'digilocker', authUrl };
  }

  // Default: basic
  return basic.verify(vehicle, files);
}

export { digilocker };
