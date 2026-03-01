/**
 * Basic verifier — instant structural checks, no external API calls.
 *
 * Checks:
 *  1. Plate number matches regex
 *  2. All 3 files are present
 *  3. Each file is JPEG, PNG, or PDF
 *  4. Each file is between 50 KB and 5 MB
 *
 * Returns:
 *  { verified: true,  method: 'basic', confidence: 'low' }
 *  { verified: false, reason: '<human-readable message>' }
 */

const PLATE_REGEX = /^[A-Z]{2}\d{2}[A-Z]{1,2}\d{4}$/;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'application/pdf']);
const MIN_SIZE = 50 * 1024;       // 50 KB
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

export async function verify(vehicle, files) {
  // 1. Plate format
  if (!PLATE_REGEX.test(vehicle.plate_number)) {
    return { verified: false, reason: 'Invalid plate number format.' };
  }

  // 2. All three documents present
  const rc    = files?.rc_doc?.[0];
  const dl    = files?.dl_doc?.[0];
  const plate = files?.plate_photo?.[0];
  if (!rc || !dl || !plate) {
    return { verified: false, reason: 'All three documents are required.' };
  }

  // 3 & 4. Type + size for each file
  for (const [name, file] of [['RC document', rc], ['DL document', dl], ['Plate photo', plate]]) {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return { verified: false, reason: `${name} must be a JPEG, PNG, or PDF.` };
    }
    if (file.size < MIN_SIZE) {
      return { verified: false, reason: `${name} is too small (minimum 50 KB).` };
    }
    if (file.size > MAX_SIZE) {
      return { verified: false, reason: `${name} exceeds 5 MB limit.` };
    }
  }

  return { verified: true, method: 'basic', confidence: 'low' };
}
