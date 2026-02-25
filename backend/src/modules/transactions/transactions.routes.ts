import { Router } from 'express';
import { authMiddleware } from '@middleware/auth.middleware';
import {
  transactionOwnerMiddleware,
  listTransactions,
  createTransaction,
  getTransaction,
  updateTransaction,
  deleteTransaction,
} from './transactions.controller';

const router = Router();

// All transaction routes require authentication
router.use(authMiddleware);

// ── Collection routes ─────────────────────────────────────────────────────────
router.get('/', listTransactions);
router.post('/', createTransaction);

// ── Single-resource routes ────────────────────────────────────────────────────
router.get('/:id', transactionOwnerMiddleware, getTransaction);
router.put('/:id', transactionOwnerMiddleware, updateTransaction);
router.delete('/:id', transactionOwnerMiddleware, deleteTransaction);

export { router as transactionsRouter };
