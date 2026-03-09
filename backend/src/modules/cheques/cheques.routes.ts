import { Router } from 'express';
import { authMiddleware } from '@middleware/auth.middleware';
import {
  listTenantCheques,
  createTenantCheque,
  updateTenantCheque,
  updateTenantChequeStatus,
  deleteTenantCheque,
  listOwnerCheques,
  createOwnerCheque,
  createOwnerChequesBulk,
  updateOwnerCheque,
  updateOwnerChequeStatus,
  deleteOwnerCheque,
} from './cheques.controller';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// ── Tenant cheques ─────────────────────────────────────────────────────────
router.get('/tenant', listTenantCheques);
router.post('/tenant', createTenantCheque);
router.put('/tenant/:id', updateTenantCheque);
router.patch('/tenant/:id/status', updateTenantChequeStatus);
router.delete('/tenant/:id', deleteTenantCheque);

// ── Owner cheques ──────────────────────────────────────────────────────────
// NOTE: /owner/bulk must come BEFORE /owner/:id to avoid param collision
router.post('/owner/bulk', createOwnerChequesBulk);
router.get('/owner', listOwnerCheques);
router.post('/owner', createOwnerCheque);
router.put('/owner/:id', updateOwnerCheque);
router.patch('/owner/:id/status', updateOwnerChequeStatus);
router.delete('/owner/:id', deleteOwnerCheque);

export { router as chequesRouter };
