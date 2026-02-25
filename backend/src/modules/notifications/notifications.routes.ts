import { Router } from 'express';
import { authMiddleware } from '@middleware/auth.middleware';
import { getNotifications } from './notifications.controller';

const router = Router();

// All notification routes require authentication
router.use(authMiddleware);

// GET /api/notifications — returns the notification summary for the current user
router.get('/', getNotifications);

export { router as notificationsRouter };
