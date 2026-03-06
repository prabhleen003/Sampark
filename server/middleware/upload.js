import multer from 'multer';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

// Extension is derived from validated MIME — never from the client's filename.
// This prevents an attacker naming a file "evil.html" with Content-Type: image/png
// from getting an executable extension stored on disk.
const MIME_TO_EXT = {
  'image/jpeg':    '.jpg',
  'image/png':     '.png',
  'application/pdf': '.pdf',
};

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${MIME_TO_EXT[file.mimetype] ?? '.bin'}`);
  },
});

function fileFilter(req, file, cb) {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, and PDF files are allowed'));
  }
}

export const uploadVehicleDocs = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE },
}).fields([
  { name: 'rc_doc', maxCount: 1 },
  { name: 'dl_doc', maxCount: 1 },
  { name: 'plate_photo', maxCount: 1 },
]);

// Avatar upload — JPEG/PNG only, 2 MB max
const AVATAR_TYPES = ['image/jpeg', 'image/png'];
const AVATAR_SIZE  = 2 * 1024 * 1024;

export const uploadAvatar = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (AVATAR_TYPES.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPEG and PNG images are allowed for avatars'));
  },
  limits: { fileSize: AVATAR_SIZE },
}).single('avatar');
