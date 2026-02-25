import { Router } from 'express';
import { authMiddleware } from '@middleware/auth.middleware';
import { isSuperAdmin } from '@middleware/role.middleware';
import {
  ownerPaymentAccessMiddleware,
  listOwnerPayments,
  getOwnerPaymentsDropdown,
  getOwnerPayment,
  createOwnerPayment,
  updateOwnerPayment,
  deleteOwnerPayment,
  generateOwnerPayments,
} from './owner-payments.controller';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Literal paths must precede :id
router.get('/dropdown', getOwnerPaymentsDropdown);
router.post('/generate', isSuperAdmin, generateOwnerPayments);

router.get('/', listOwnerPayments);
router.post('/', createOwnerPayment);

router.get('/:id', ownerPaymentAccessMiddleware, getOwnerPayment);
router.put('/:id', ownerPaymentAccessMiddleware, updateOwnerPayment);
router.delete('/:id', ownerPaymentAccessMiddleware, deleteOwnerPayment);

export { router as ownerPaymentsRouter };
