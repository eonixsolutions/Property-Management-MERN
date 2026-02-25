import { Router } from 'express';
import { authMiddleware } from '@middleware/auth.middleware';
import { getSettings, updateSettings } from './settings.controller';

const router = Router();

// All /api/settings routes require a valid access token.
// Any authenticated role (STAFF, ADMIN, SUPER_ADMIN) can read/write their own settings.
router.use(authMiddleware);

/**
 * GET /api/settings
 * Returns the authenticated user's settings (currency, timezone).
 */
router.get('/', getSettings);

/**
 * PUT /api/settings
 * Partially updates the authenticated user's settings.
 */
router.put('/', updateSettings);

export { router as settingsRouter };
