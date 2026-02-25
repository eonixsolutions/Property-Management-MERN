import mongoose from 'mongoose';
import type { RequestHandler } from 'express';
import { ApiError } from '@utils/ApiError';
import { ApiResponse } from '@utils/ApiResponse';
import { asyncHandler } from '@utils/asyncHandler';
import { UserRole } from '@models/user.model';
import { Transaction } from '@models/transaction.model';
import type { ITransaction } from '@models/transaction.model';
import { createTransactionSchema, updateTransactionSchema } from './transactions.validation';

// ── Helpers ───────────────────────────────────────────────────────────────────

function validateObjectId(id: string, label = 'ID'): void {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, 'INVALID_ID', `Invalid ${label} format`);
  }
}

/**
 * Base filter for transactions scoped to the authenticated user.
 * STAFF: restricted to their own transactions via userId.
 * ADMIN/SUPER_ADMIN: no restriction (see all transactions).
 */
function getBaseFilter(role: UserRole, userId: string): Record<string, unknown> {
  if (role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN) return {};
  return { userId: new mongoose.Types.ObjectId(userId) };
}

// ── Access middleware ─────────────────────────────────────────────────────────

/**
 * transactionOwnerMiddleware
 *
 * Verifies the authenticated user owns the transaction (or is ADMIN/SUPER_ADMIN).
 * Attaches `req.transactionDoc` for downstream handlers.
 */
export const transactionOwnerMiddleware: RequestHandler = asyncHandler(async (req, _res, next) => {
  const id = req.params['id'] as string;
  validateObjectId(id, 'transaction ID');

  const transaction = await Transaction.findById(id).lean();
  if (!transaction) {
    throw ApiError.notFound('Transaction');
  }

  const { role, id: userId } = req.user!;

  if (role !== UserRole.ADMIN && role !== UserRole.SUPER_ADMIN) {
    if (transaction.userId.toString() !== userId) {
      throw ApiError.forbidden('You do not have permission to access this transaction');
    }
  }

  req.transactionDoc = transaction as unknown as ITransaction & {
    _id: mongoose.Types.ObjectId;
  };
  next();
});

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * GET /api/transactions
 *
 * Paginated list of transactions for the current user.
 *
 * Query params:
 *   ?page            — 1-based (default: 1)
 *   ?limit           — items per page (default: 25, max: 100)
 *   ?type            — 'Income' | 'Expense'
 *   ?category        — exact match (case-insensitive)
 *   ?propertyId      — filter by property
 *   ?tenantId        — filter by tenant
 *   ?from            — ISO date string: transactionDate >= from
 *   ?to              — ISO date string: transactionDate <= to
 *   ?search          — partial match on description or category
 */
export const listTransactions: RequestHandler = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt((req.query['page'] as string) || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt((req.query['limit'] as string) || '25', 10)));
  const skip = (page - 1) * limit;

  const { role, id: userId } = req.user!;
  const filter: Record<string, unknown> = getBaseFilter(role, userId);

  const typeParam = req.query['type'] as string | undefined;
  if (typeParam === 'Income' || typeParam === 'Expense') {
    filter['type'] = typeParam;
  }

  const categoryParam = req.query['category'] as string | undefined;
  if (categoryParam?.trim()) {
    filter['category'] = new RegExp(categoryParam.trim(), 'i');
  }

  const propertyIdParam = req.query['propertyId'] as string | undefined;
  if (propertyIdParam) {
    validateObjectId(propertyIdParam, 'propertyId');
    filter['propertyId'] = new mongoose.Types.ObjectId(propertyIdParam);
  }

  const tenantIdParam = req.query['tenantId'] as string | undefined;
  if (tenantIdParam) {
    validateObjectId(tenantIdParam, 'tenantId');
    filter['tenantId'] = new mongoose.Types.ObjectId(tenantIdParam);
  }

  // Date range filter
  const fromParam = req.query['from'] as string | undefined;
  const toParam = req.query['to'] as string | undefined;
  if (fromParam || toParam) {
    const dateFilter: Record<string, Date> = {};
    if (fromParam) dateFilter['$gte'] = new Date(fromParam);
    if (toParam) dateFilter['$lte'] = new Date(toParam);
    filter['transactionDate'] = dateFilter;
  }

  const searchParam = req.query['search'] as string | undefined;
  if (searchParam?.trim()) {
    const regex = new RegExp(searchParam.trim(), 'i');
    filter['$or'] = [{ description: regex }, { category: regex }];
  }

  const [transactions, total] = await Promise.all([
    Transaction.find(filter).sort({ transactionDate: -1 }).skip(skip).limit(limit).lean(),
    Transaction.countDocuments(filter),
  ]);

  return ApiResponse.paginated(res, transactions, { total, page, limit });
});

/**
 * POST /api/transactions
 *
 * Creates a new transaction. The userId is always set from the authenticated
 * user — clients cannot spoof ownership.
 */
export const createTransaction: RequestHandler = asyncHandler(async (req, res) => {
  const data = createTransactionSchema.parse(req.body);
  const { id: userId } = req.user!;

  if (data.propertyId) validateObjectId(data.propertyId, 'propertyId');
  if (data.tenantId) validateObjectId(data.tenantId, 'tenantId');

  const transaction = await Transaction.create({
    ...data,
    userId: new mongoose.Types.ObjectId(userId),
    propertyId: data.propertyId ? new mongoose.Types.ObjectId(data.propertyId) : undefined,
    tenantId: data.tenantId ? new mongoose.Types.ObjectId(data.tenantId) : undefined,
    transactionDate: new Date(data.transactionDate),
    recurringFrequency: data.isRecurring ? data.recurringFrequency : undefined,
  });

  return ApiResponse.created(res, { transaction }, 'Transaction recorded');
});

/**
 * GET /api/transactions/:id
 */
export const getTransaction: RequestHandler = asyncHandler(async (req, res) => {
  return ApiResponse.ok(res, { transaction: req.transactionDoc });
});

/**
 * PUT /api/transactions/:id
 *
 * Partial update. userId and propertyId/tenantId refs are NOT updatable to
 * prevent ownership reassignment.
 */
export const updateTransaction: RequestHandler = asyncHandler(async (req, res) => {
  const id = req.params['id'] as string;
  const data = updateTransactionSchema.parse(req.body);

  const updateSet: Record<string, unknown> = { ...data };

  if (data.transactionDate) {
    updateSet['transactionDate'] = new Date(data.transactionDate);
  }
  // If switching to non-recurring, clear recurringFrequency
  if (data.isRecurring === false) {
    updateSet['recurringFrequency'] = undefined;
  }

  const updated = await Transaction.findByIdAndUpdate(
    id,
    { $set: updateSet },
    { new: true, runValidators: true },
  ).lean();

  if (!updated) {
    throw ApiError.notFound('Transaction');
  }

  return ApiResponse.ok(res, { transaction: updated });
});

/**
 * DELETE /api/transactions/:id
 *
 * Hard-deletes the transaction.
 */
export const deleteTransaction: RequestHandler = asyncHandler(async (req, res) => {
  const id = req.params['id'] as string;
  await Transaction.findByIdAndDelete(id);
  return ApiResponse.noContent(res);
});
