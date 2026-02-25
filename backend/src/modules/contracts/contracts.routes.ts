import { Router } from 'express';
import { authMiddleware } from '@middleware/auth.middleware';
import {
  contractAccessMiddleware,
  listContracts,
  createContract,
  getContractDefaults,
  getContract,
  updateContract,
  deleteContract,
} from './contracts.controller';

const router = Router();

// All contract routes require authentication
router.use(authMiddleware);

// ── Literal routes BEFORE param routes ────────────────────────────────────────
router.get('/defaults', getContractDefaults); // GET /contracts/defaults?tenantId=X

router.get('/', listContracts);
router.post('/', createContract);

router.get('/:id', contractAccessMiddleware, getContract);
router.put('/:id', contractAccessMiddleware, updateContract);
router.delete('/:id', contractAccessMiddleware, deleteContract);

export { router as contractsRouter };
