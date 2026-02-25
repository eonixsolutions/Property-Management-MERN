import { Router } from 'express';
import { authMiddleware } from '@middleware/auth.middleware';
import { getDashboard } from './dashboard.controller';

const router = Router();

router.use(authMiddleware);

router.get('/', getDashboard);

export { router as dashboardRouter };
