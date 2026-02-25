import { Router } from 'express';
import { authMiddleware } from '@middleware/auth.middleware';
import {
  tenantAccessMiddleware,
  getTenantsDropdown,
  listTenants,
  createTenant,
  getTenant,
  updateTenant,
  deleteTenant,
  getTenantRentPayments,
} from './tenants.controller';

const router = Router();

// All tenant routes require authentication
router.use(authMiddleware);

// ── IMPORTANT: /dropdown MUST be registered before /:id ─────────────────
router.get('/dropdown', getTenantsDropdown);

// ── Collection routes ────────────────────────────────────────────────────
router.get('/', listTenants);
router.post('/', createTenant);

// ── Single-resource routes ───────────────────────────────────────────────
router.get('/:id', tenantAccessMiddleware, getTenant);
router.put('/:id', tenantAccessMiddleware, updateTenant);
router.delete('/:id', tenantAccessMiddleware, deleteTenant);

// ── Sub-resource routes ──────────────────────────────────────────────────
router.get('/:id/rent-payments', tenantAccessMiddleware, getTenantRentPayments);

export { router as tenantsRouter };
