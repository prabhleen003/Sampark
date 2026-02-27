// In-memory OTP store — replace with Redis in production
const otpStore = new Map();

const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

export function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function storeOtp(phone, otp) {
  otpStore.set(phone, {
    otp,
    expiresAt: Date.now() + OTP_EXPIRY_MS,
  });
}

export function verifyOtp(phone, otp) {
  const record = otpStore.get(phone);
  if (!record) return { valid: false, reason: 'OTP not found' };
  if (Date.now() > record.expiresAt) {
    otpStore.delete(phone);
    return { valid: false, reason: 'OTP expired' };
  }
  if (record.otp !== otp) return { valid: false, reason: 'Invalid OTP' };
  otpStore.delete(phone); // one-time use
  return { valid: true };
}
