import { Router } from 'express';
import { authMiddleware } from '@middleware/auth.middleware';
import { getBalanceSheet, getProfitLoss, getTrialBalance } from './accounting.controller';

const router = Router();

router.use(authMiddleware);

router.get('/balance-sheet', getBalanceSheet);
router.get('/profit-loss', getProfitLoss);
router.get('/trial-balance', getTrialBalance);

export { router as accountingRouter };
