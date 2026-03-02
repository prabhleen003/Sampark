// In-memory OTP store — replace with Redis in production
const otpStore = new Map();
const otpSendLog = new Map(); // phone -> array of send timestamps

const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const OTP_SEND_LIMIT = 3; // max sends
const OTP_SEND_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

export function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Check if phone can send OTP (rate-limit check)
 * Max 3 sends per 10 minutes
 */
export function canSendOtp(phone) {
  const now = Date.now();
  const sendLog = otpSendLog.get(phone) || [];
  
  // Remove old timestamps outside the 10-minute window
  const recentSends = sendLog.filter(timestamp => now - timestamp < OTP_SEND_WINDOW_MS);
  
  if (recentSends.length >= OTP_SEND_LIMIT) {
    return {
      allowed: false,
      reason: `Too many OTP requests. Try again in ${Math.ceil((recentSends[0] + OTP_SEND_WINDOW_MS - now) / 1000)} seconds`,
    };
  }
  
  return { allowed: true };
}

/**
 * Record OTP send attempt
 */
export function recordOtpSend(phone) {
  const now = Date.now();
  const sendLog = otpSendLog.get(phone) || [];
  
  // Add new timestamp
  sendLog.push(now);
  
  // Keep only recent timestamps
  const recentSends = sendLog.filter(timestamp => now - timestamp < OTP_SEND_WINDOW_MS);
  otpSendLog.set(phone, recentSends);
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
