import { Router } from 'express';
import { authMiddleware } from '@middleware/auth.middleware';
import { getReports } from './reports.controller';

const router = Router();

router.use(authMiddleware);

router.get('/', getReports);

export { router as reportsRouter };
