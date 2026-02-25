import { z } from 'zod';
import { DOCUMENT_TYPES } from '@models/document.model';

// ── Schemas ───────────────────────────────────────────────────────────────────

/**
 * Validated after Multer processes the multipart upload.
 * The file itself is validated by documentFileFilter in upload.middleware.ts.
 * These are the body fields that accompany the file.
 */
export const createDocumentSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(255),
  documentType: z.enum(DOCUMENT_TYPES, {
    errorMap: () => ({ message: `documentType must be one of: ${DOCUMENT_TYPES.join(', ')}` }),
  }),
  propertyId: z.string().trim().min(1).optional(),
  tenantId: z.string().trim().min(1).optional(),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
