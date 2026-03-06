import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

const ALGORITHM = 'aes-256-ctr';

// PHONE_ENCRYPT_KEY must be set — no silent fallback to a known default.
// A missing or weak key would leave all encrypted phone numbers decryptable
// by anyone with access to the source code.
if (!process.env.PHONE_ENCRYPT_KEY) {
  throw new Error('[encrypt] PHONE_ENCRYPT_KEY env var is not set. Refusing to start with no encryption key.');
}

// Build a stable 32-byte key (pad / truncate to exactly 256 bits)
const KEY = Buffer.alloc(32);
Buffer.from(process.env.PHONE_ENCRYPT_KEY, 'utf8').copy(KEY, 0, 0, 32);

/**
 * Encrypt a plain phone number.
 * Returns a hex string in the format  "<iv_hex>:<ciphertext_hex>"
 */
export function encryptPhone(phone) {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(phone, 'utf8'), cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

/**
 * Decrypt a phone encrypted with encryptPhone().
 * Falls back to returning the input unchanged if it doesn't look encrypted
 * (e.g. legacy plain-text phone_encrypted values on User model).
 */
export function decryptPhone(ciphertext) {
  try {
    const parts = ciphertext.split(':');
    if (parts.length !== 2) return ciphertext;       // plain-text fallback
    const [ivHex, dataHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    if (iv.length !== 16) return ciphertext;          // invalid — fallback
    const data = Buffer.from(dataHex, 'hex');
    const decipher = createDecipheriv(ALGORITHM, KEY, iv);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  } catch {
    return ciphertext;
  }
}

/**
 * Return a masked version for display (last 4 digits visible).
 * Accepts either an encrypted string or a plain phone.
 */
export function maskPhone(phoneOrEncrypted) {
  const plain = decryptPhone(phoneOrEncrypted);
  if (plain.length < 4) return plain;
  return 'xxxxxx' + plain.slice(-4);
}

/**
 * Hash a phone number for database storage.
 * Uses SHA-256 for deterministic, one-way hashing.
 * Consistent across calls — safe for uniqueness indexes.
 */
export function hashPhone(phone) {
  return createHash('sha256').update(phone).digest('hex');
}
