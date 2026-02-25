import { Router } from 'express';
import { authMiddleware } from '@middleware/auth.middleware';
import { isSuperAdmin } from '@middleware/role.middleware';
import {
  rentPaymentAccessMiddleware,
  listRentPayments,
  createRentPayment,
  getRentPayment,
  updateRentPayment,
  deleteRentPayment,
  generateInvoices,
} from './rent-payments.controller';

const router = Router();

// All rent-payment routes require authentication
router.use(authMiddleware);

// ── IMPORTANT: /generate MUST be registered before /:id ──────────────────
// POST /api/rent-payments/generate — manual trigger (admins only)
router.post('/generate', isSuperAdmin, generateInvoices);

// ── Collection routes ─────────────────────────────────────────────────────
router.get('/', listRentPayments);
router.post('/', createRentPayment);

// ── Single-resource routes ────────────────────────────────────────────────
router.get('/:id', rentPaymentAccessMiddleware, getRentPayment);
router.put('/:id', rentPaymentAccessMiddleware, updateRentPayment);
router.delete('/:id', rentPaymentAccessMiddleware, deleteRentPayment);

export { router as rentPaymentsRouter };
