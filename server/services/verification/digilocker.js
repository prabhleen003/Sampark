/**
 * DigiLocker verifier — OAuth 2.0 flow.
 *
 * Exports:
 *   buildAuthUrl(userId, vehicleId)  → string (redirect the user here)
 *   handleCallback(code, state)      → { verified, method, confidence, digilockerVerified, reason? }
 *
 * Environment variables required:
 *   DIGILOCKER_CLIENT_ID
 *   DIGILOCKER_CLIENT_SECRET
 *   DIGILOCKER_REDIRECT_URI   (e.g. https://app.sampark.in/api/v1/auth/digilocker/callback)
 */

import axios from 'axios';

const {
  DIGILOCKER_CLIENT_ID,
  DIGILOCKER_CLIENT_SECRET,
  DIGILOCKER_REDIRECT_URI,
} = process.env;

const DIGILOCKER_AUTH_URL  = 'https://api.digitallocker.gov.in/public/oauth2/1/authorize';
const DIGILOCKER_TOKEN_URL = 'https://api.digitallocker.gov.in/public/oauth2/1/token';
const VAHAN_DOC_TYPE       = 'VAHAN';  // Vehicle Registration Certificate
const SARATHI_DOC_TYPE     = 'DRVLC';  // Driving Licence

/**
 * Step 1 — build the DigiLocker authorization URL.
 * The `state` encodes userId_vehicleId so the callback can find the right vehicle.
 */
export function buildAuthUrl(userId, vehicleId) {
  const state = `${userId}_${vehicleId}`;
  const params = new URLSearchParams({
    response_type: 'code',
    client_id:     DIGILOCKER_CLIENT_ID,
    redirect_uri:  DIGILOCKER_REDIRECT_URI,
    state,
    scope:         'openid profile',
  });
  return `${DIGILOCKER_AUTH_URL}?${params.toString()}`;
}

/**
 * Step 2 — exchange code for token and pull documents.
 * Returns a result object compatible with the verifier interface.
 */
export async function handleCallback(code, state, vehicle) {
  try {
    // Exchange code for access token
    const tokenRes = await axios.post(DIGILOCKER_TOKEN_URL, new URLSearchParams({
      code,
      grant_type:    'authorization_code',
      client_id:     DIGILOCKER_CLIENT_ID,
      client_secret: DIGILOCKER_CLIENT_SECRET,
      redirect_uri:  DIGILOCKER_REDIRECT_URI,
    }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });

    const { access_token } = tokenRes.data;
    if (!access_token) {
      return { verified: false, reason: 'Failed to obtain DigiLocker access token.' };
    }

    // Fetch issued documents list
    const docsRes = await axios.get(
      'https://api.digitallocker.gov.in/public/oauth2/1/xml/issueddoc/all',
      { headers: { Authorization: `Bearer ${access_token}` } }
    );

    const docs = docsRes.data?.items || [];
    const hasRC = docs.some(d => d.type === VAHAN_DOC_TYPE);
    const hasDL = docs.some(d => d.type === SARATHI_DOC_TYPE);

    if (!hasRC) {
      return { verified: false, reason: 'Vehicle Registration Certificate not found in DigiLocker.' };
    }
    if (!hasDL) {
      return { verified: false, reason: 'Driving Licence not found in DigiLocker.' };
    }

    // Fetch RC details for plate match
    const rcDoc  = docs.find(d => d.type === VAHAN_DOC_TYPE);
    const rcData = await axios.get(
      `https://api.digitallocker.gov.in/public/oauth2/1/xml/issueddoc/${rcDoc.uri}`,
      { headers: { Authorization: `Bearer ${access_token}` } }
    );

    const digiPlate = (rcData.data?.vehicleNumber || '').toUpperCase().replace(/\s/g, '');
    const ourPlate  = vehicle.plate_number.toUpperCase().replace(/\s/g, '');

    if (digiPlate && digiPlate !== ourPlate) {
      return {
        verified: false,
        reason: `Plate mismatch: DigiLocker shows ${digiPlate}, submitted ${ourPlate}.`,
      };
    }

    return { verified: true, method: 'digilocker', confidence: 'high', digilockerVerified: true };
  } catch (err) {
    console.error('[DigiLocker] callback error:', err.message);
    return { verified: false, reason: 'DigiLocker verification failed. Please try again.' };
  }
}
