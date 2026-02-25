import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { env } from '@config/env';
import { ApiError } from '@utils/ApiError';

// Ensure the upload directories exist on startup.
// These run once when the module is first imported.
const propertiesUploadDir = path.join(env.UPLOAD_DEST, 'properties');
const documentsUploadDir = path.join(env.UPLOAD_DEST, 'documents');
fs.mkdirSync(propertiesUploadDir, { recursive: true });
fs.mkdirSync(documentsUploadDir, { recursive: true });

// ── Disk storage ──────────────────────────────────────────────────────────

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, propertiesUploadDir);
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    // Random name: timestamp + 8-char random hex + original extension
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
    cb(null, name);
  },
});

// ── File type filter ──────────────────────────────────────────────────────

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    // Passing an Error here causes multer to abort and forward to errorMiddleware
    cb(
      new ApiError(
        400,
        'UPLOAD_ERROR',
        'Only JPEG, PNG, and WebP images are allowed',
      ) as unknown as null,
      false,
    );
  }
};

// ── Multer instance ───────────────────────────────────────────────────────

/**
 * Multer middleware for property image uploads.
 *
 * Field name: 'image' (single file per request).
 * Max size: controlled by env.UPLOAD_MAX_FILE_SIZE (default 10 MB).
 * Accepted types: JPEG, PNG, WebP.
 *
 * Usage in routes:
 *   router.post('/:id/images', propertyOwnerMiddleware, propertyImageUpload, uploadImage);
 *
 * On success: `req.file` is populated with the uploaded file info.
 * On failure: error is forwarded to errorMiddleware.
 */
export const propertyImageUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: env.UPLOAD_MAX_FILE_SIZE },
}).single('image');

// ── Document upload ────────────────────────────────────────────────────────────

const ALLOWED_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'text/plain',
];

const documentStorage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, documentsUploadDir);
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
    cb(null, name);
  },
});

const documentFileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (ALLOWED_DOCUMENT_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new ApiError(
        400,
        'UPLOAD_ERROR',
        'Invalid file type. Allowed: PDF, Word, Excel, JPEG, PNG, TXT',
      ) as unknown as null,
      false,
    );
  }
};

/**
 * Multer middleware for document uploads.
 *
 * Field name: 'document' (single file per request).
 * Max size: 10 MB.
 * Accepted types: PDF, DOC/DOCX, XLS/XLSX, JPEG, PNG, TXT.
 */
export const documentUpload = multer({
  storage: documentStorage,
  fileFilter: documentFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
}).single('document');
