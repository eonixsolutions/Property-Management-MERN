import { Router } from 'express';
import { healthRouter } from './health.routes';
import { authRouter } from '../modules/auth/auth.routes';
import { usersRouter } from '../modules/users/users.routes';
import { settingsRouter } from '../modules/settings/settings.routes';
import { propertiesRouter } from '../modules/properties/properties.routes';
import { tenantsRouter } from '../modules/tenants/tenants.routes';
import { rentPaymentsRouter } from '../modules/rent-payments/rent-payments.routes';
import { notificationsRouter } from '../modules/notifications/notifications.routes';
import { transactionsRouter } from '../modules/transactions/transactions.routes';
import { ownerPaymentsRouter } from '../modules/owner-payments/owner-payments.routes';
import { chequesRouter } from '../modules/cheques/cheques.routes';
import { maintenanceRouter } from '../modules/maintenance/maintenance.routes';
import { documentsRouter } from '../modules/documents/documents.routes';
import { dashboardRouter } from '../modules/dashboard/dashboard.routes';
import { accountingRouter } from '../modules/accounting/accounting.routes';
import { reportsRouter } from '../modules/reports/reports.routes';
import { contractsRouter } from '../modules/contracts/contracts.routes';
import { publicListingsRouter } from '../modules/public/listings.routes';

/**
 * Root API router.
 *
 * All route modules are mounted here and this file is imported
 * once in app.ts under the '/api' prefix.
 *
 * Route registration order:
 *   /api/health      → health check (public)
 *   /api/auth        → authentication    (Phase 1) ✅
 *   /api/users       → user management   (Phase 1) ✅
 *   /api/settings    → user settings     (Phase 1) ✅
 *   /api/properties  → properties & units (Phase 2) ✅
 *
 * Future routes to add as each phase is implemented:
 *   /api/properties    → Phase 2 ✅
 *   /api/tenants       → Phase 3 ✅
 *   /api/rent-payments → Phase 4 ✅
 *   /api/notifications → Phase 5 ✅
 *   /api/transactions  → Phase 6 ✅
 *   /api/owner-payments → Phase 7 ✅
 *   /api/cheques       → Phase 7 ✅
 *   /api/maintenance   → Phase 8 ✅
 *   /api/documents     → Phase 9 ✅
 *   /api/accounting    → Phase 10 ✅
 *   /api/reports       → Phase 10 ✅
 *   /api/dashboard     → Phase 10 ✅
 *   /api/contracts     → Phase 11
 */
const router = Router();

router.use('/health', healthRouter);
router.use('/auth', authRouter);
router.use('/users', usersRouter);
router.use('/settings', settingsRouter);
router.use('/properties', propertiesRouter);
router.use('/tenants', tenantsRouter); // Phase 3 ✅
router.use('/rent-payments', rentPaymentsRouter); // Phase 4 ✅
router.use('/notifications', notificationsRouter); // Phase 5 ✅
router.use('/transactions', transactionsRouter); // Phase 6 ✅
router.use('/owner-payments', ownerPaymentsRouter); // Phase 7 ✅
router.use('/cheques', chequesRouter); // Phase 7 ✅
router.use('/maintenance', maintenanceRouter); // Phase 8 ✅
router.use('/documents', documentsRouter); // Phase 9 ✅
router.use('/dashboard', dashboardRouter); // Phase 10 ✅
router.use('/accounting', accountingRouter); // Phase 10 ✅
router.use('/reports', reportsRouter); // Phase 10 ✅
router.use('/contracts', contractsRouter); // Phase 11 ✅
router.use('/public/listings', publicListingsRouter); // Phase 11 ✅ (no auth)

export { router as apiRouter };
