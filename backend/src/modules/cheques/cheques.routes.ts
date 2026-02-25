import { Router } from 'express';
import { authMiddleware } from '@middleware/auth.middleware';
import {
  listTenantCheques,
  createTenantCheque,
  updateTenantChequeStatus,
  deleteTenantCheque,
  listOwnerCheques,
  createOwnerCheque,
  createOwnerChequesBulk,
  updateOwnerChequeStatus,
  deleteOwnerCheque,
} from './cheques.controller';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// ── Tenant cheques ─────────────────────────────────────────────────────────
router.get('/tenant', listTenantCheques);
router.post('/tenant', createTenantCheque);
router.patch('/tenant/:id/status', updateTenantChequeStatus);
router.delete('/tenant/:id', deleteTenantCheque);

// ── Owner cheques ──────────────────────────────────────────────────────────
// NOTE: /owner/bulk must come BEFORE /owner/:id to avoid param collision
router.post('/owner/bulk', createOwnerChequesBulk);
router.get('/owner', listOwnerCheques);
router.post('/owner', createOwnerCheque);
router.patch('/owner/:id/status', updateOwnerChequeStatus);
router.delete('/owner/:id', deleteOwnerCheque);

export { router as chequesRouter };
