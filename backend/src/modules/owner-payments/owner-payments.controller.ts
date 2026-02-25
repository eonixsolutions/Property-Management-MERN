import mongoose from 'mongoose';
import type { RequestHandler } from 'express';
import { ApiError } from '@utils/ApiError';
import { ApiResponse } from '@utils/ApiResponse';
import { asyncHandler } from '@utils/asyncHandler';
import { UserRole } from '@models/user.model';
import { Property } from '@models/property.model';
import { OwnerPayment } from '@models/owner-payment.model';
import type { IOwnerPayment } from '@models/owner-payment.model';
import { generateMonthlyOwnerPayments } from '@services/owner-payment.service';
import { createOwnerPaymentSchema, updateOwnerPaymentSchema } from './owner-payments.validation';

// ── Helpers ───────────────────────────────────────────────────────────────────

function validateObjectId(id: string, label = 'ID'): void {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, 'INVALID_ID', `Invalid ${label} format`);
  }
}

function toMonthStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

/**
 * Returns scoped property IDs for STAFF users.
 * Returns undefined for ADMIN/SUPER_ADMIN (no filter).
 */
async function getScopedPropertyIds(
  role: UserRole,
  userId: string,
): Promise<mongoose.Types.ObjectId[] | undefined> {
  if (role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN) return undefined;
  const props = await Property.find({ userId }).select('_id').lean();
  return props.map((p) => p._id as mongoose.Types.ObjectId);
}

// ── Access middleware ──────────────────────────────────────────────────────────

/**
 * ownerPaymentAccessMiddleware
 *
 * Verifies the user has access to the owner payment (via property ownership or admin).
 * Attaches the document to `req.ownerPaymentDoc`.
 */
export const ownerPaymentAccessMiddleware: RequestHandler = asyncHandler(
  async (req, _res, next) => {
    const id = req.params['id'] as string;
    validateObjectId(id, 'owner payment ID');

    const payment = await OwnerPayment.findById(id).lean();
    if (!payment) {
      throw ApiError.notFound('Owner payment');
    }

    const { role, id: userId } = req.user!;

    if (role !== UserRole.ADMIN && role !== UserRole.SUPER_ADMIN) {
      if (payment.userId.toString() !== userId) {
        throw ApiError.forbidden('You do not have permission to access this owner payment');
      }
    }

    req.ownerPaymentDoc = payment as unknown as IOwnerPayment & {
      _id: mongoose.Types.ObjectId;
    };
    next();
  },
);

// ── Controllers ────────────────────────────────────────────────────────────────

/**
 * GET /api/owner-payments
 *
 * Query params: page, limit, propertyId, status, month (YYYY-MM)
 */
export const listOwnerPayments: RequestHandler = asyncHandler(async (req, res) => {
  const { role, id: userId } = req.user!;
  const page = Math.max(1, Number(req.query['page'] ?? 1));
  const limit = Math.min(100, Math.max(1, Number(req.query['limit'] ?? 25)));
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {};

  // BL-04 scoping
  const scopedIds = await getScopedPropertyIds(role, userId);
  if (scopedIds !== undefined) {
    filter['propertyId'] = { $in: scopedIds };
  }

  if (req.query['propertyId']) {
    filter['propertyId'] = new mongoose.Types.ObjectId(req.query['propertyId'] as string);
  }
  if (req.query['status']) {
    filter['status'] = req.query['status'];
  }
  if (req.query['month']) {
    const monthStr = req.query['month'] as string; // YYYY-MM
    const year = Number(monthStr.slice(0, 4));
    const month = Number(monthStr.slice(5, 7)) - 1;
    const monthStart = new Date(Date.UTC(year, month, 1));
    const monthEnd = new Date(Date.UTC(year, month + 1, 1));
    filter['paymentMonth'] = { $gte: monthStart, $lt: monthEnd };
  }

  const [payments, total] = await Promise.all([
    OwnerPayment.find(filter).sort({ paymentMonth: -1 }).skip(skip).limit(limit).lean(),
    OwnerPayment.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(total / limit);

  return ApiResponse.ok(res, {
    payments,
    meta: {
      total,
      page,
      limit,
      totalPages,
      hasPrevPage: page > 1,
      hasNextPage: page < totalPages,
    },
  });
});

/**
 * GET /api/owner-payments/dropdown
 *
 * Returns minimal list for linking cheques to owner payments.
 * Optional: ?propertyId= to scope to a single property.
 */
export const getOwnerPaymentsDropdown: RequestHandler = asyncHandler(async (req, res) => {
  const { role, id: userId } = req.user!;

  const filter: Record<string, unknown> = {};

  const scopedIds = await getScopedPropertyIds(role, userId);
  if (scopedIds !== undefined) {
    filter['propertyId'] = { $in: scopedIds };
  }

  if (req.query['propertyId']) {
    filter['propertyId'] = new mongoose.Types.ObjectId(req.query['propertyId'] as string);
  }

  const payments = await OwnerPayment.find(filter)
    .select('_id propertyId amount paymentMonth status')
    .sort({ paymentMonth: -1 })
    .limit(200)
    .lean();

  return ApiResponse.ok(res, { payments });
});

/**
 * GET /api/owner-payments/:id
 */
export const getOwnerPayment: RequestHandler = asyncHandler(async (req, res) => {
  return ApiResponse.ok(res, { payment: req.ownerPaymentDoc });
});

/**
 * POST /api/owner-payments
 */
export const createOwnerPayment: RequestHandler = asyncHandler(async (req, res) => {
  const { id: userId, role } = req.user!;
  const parsed = createOwnerPaymentSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(
      422,
      'VALIDATION_ERROR',
      parsed.error.errors[0]?.message ?? 'Validation failed',
    );
  }

  const data = parsed.data;
  validateObjectId(data.propertyId, 'propertyId');

  // Verify property access
  const propFilter: Record<string, unknown> = { _id: data.propertyId };
  if (role !== UserRole.ADMIN && role !== UserRole.SUPER_ADMIN) {
    propFilter['userId'] = userId;
  }
  const property = await Property.findOne(propFilter).select('_id').lean();
  if (!property) {
    throw ApiError.forbidden('You do not have access to this property');
  }

  const paymentMonth = toMonthStart(new Date(data.paymentMonth));

  const payment = await OwnerPayment.create({
    propertyId: data.propertyId,
    userId,
    amount: data.amount,
    paymentMonth,
    status: data.status ?? 'Pending',
    paidDate: data.paidDate ? new Date(data.paidDate) : undefined,
    paymentMethod: data.paymentMethod,
    chequeNumber: data.chequeNumber,
    referenceNumber: data.referenceNumber,
    notes: data.notes,
  });

  return ApiResponse.created(res, { payment });
});

/**
 * PUT /api/owner-payments/:id
 */
export const updateOwnerPayment: RequestHandler = asyncHandler(async (req, res) => {
  const parsed = updateOwnerPaymentSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(
      422,
      'VALIDATION_ERROR',
      parsed.error.errors[0]?.message ?? 'Validation failed',
    );
  }

  const data = parsed.data;
  const update: Record<string, unknown> = {};

  if (data.amount !== undefined) update['amount'] = data.amount;
  if (data.paymentMonth !== undefined)
    update['paymentMonth'] = toMonthStart(new Date(data.paymentMonth));
  if (data.status !== undefined) update['status'] = data.status;
  if (data.paidDate !== undefined)
    update['paidDate'] = data.paidDate ? new Date(data.paidDate) : null;
  if (data.paymentMethod !== undefined) update['paymentMethod'] = data.paymentMethod ?? null;
  if (data.chequeNumber !== undefined) update['chequeNumber'] = data.chequeNumber ?? null;
  if (data.referenceNumber !== undefined) update['referenceNumber'] = data.referenceNumber ?? null;
  if (data.notes !== undefined) update['notes'] = data.notes ?? null;

  const payment = await OwnerPayment.findByIdAndUpdate(
    req.ownerPaymentDoc!._id,
    { $set: update },
    { new: true, runValidators: true },
  ).lean();

  return ApiResponse.ok(res, { payment });
});

/**
 * DELETE /api/owner-payments/:id
 */
export const deleteOwnerPayment: RequestHandler = asyncHandler(async (req, res) => {
  await OwnerPayment.findByIdAndDelete(req.ownerPaymentDoc!._id);
  return ApiResponse.ok(res, { message: 'Owner payment deleted' });
});

/**
 * POST /api/owner-payments/generate
 *
 * SUPER_ADMIN only. Generates current-month payments for all configured properties.
 */
export const generateOwnerPayments: RequestHandler = asyncHandler(async (_req, res) => {
  const count = await generateMonthlyOwnerPayments();
  return ApiResponse.ok(res, {
    message: `Generated ${count} owner payment${count !== 1 ? 's' : ''} for the current month.`,
    count,
  });
});
