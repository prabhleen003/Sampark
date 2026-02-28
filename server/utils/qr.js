import crypto from 'crypto';

function getSecret() {
  return process.env.QR_SECRET || 'sampark_qr_hmac_secret_change_in_production';
}

export function generateSignedUrl(vehicleId) {
  const sig = crypto
    .createHmac('sha256', getSecret())
    .update(vehicleId.toString())
    .digest('hex');

  const appUrl = process.env.APP_URL || 'http://localhost:5173';
  return { url: `${appUrl}/v/${vehicleId}?sig=${sig}`, sig };
}

export function verifySignature(vehicleId, sig) {
  const expected = crypto
    .createHmac('sha256', getSecret())
    .update(vehicleId.toString())
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(sig, 'hex')
    );
  } catch {
    return false;
  }
}
