import { Router } from 'express';
import { authMiddleware } from '@middleware/auth.middleware';
import { documentUpload } from '@middleware/upload.middleware';
import {
  listDocuments,
  uploadDocument,
  getDocument,
  downloadDocument,
  deleteDocument,
  documentAccessMiddleware,
} from './documents.controller';

const router = Router();

router.use(authMiddleware);

router.get('/', listDocuments);
router.post('/', documentUpload, uploadDocument);

router.get('/:id', documentAccessMiddleware, getDocument);
router.get('/:id/download', documentAccessMiddleware, downloadDocument);
router.delete('/:id', documentAccessMiddleware, deleteDocument);

export { router as documentsRouter };
