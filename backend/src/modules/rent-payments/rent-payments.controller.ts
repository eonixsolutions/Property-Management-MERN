import mongoose from 'mongoose';
import type { RequestHandler } from 'express';
import { ApiError } from '@utils/ApiError';
import { ApiResponse } from '@utils/ApiResponse';
import { asyncHandler } from '@utils/asyncHandler';
import { UserRole } from '@models/user.model';
import { Property } from '@models/property.model';
import { Tenant } from '@models/tenant.model';
import { RentPayment } from '@models/rent-payment.model';
import { generateRecurringInvoices } from '@services/recurring-invoices.service';
import { createRentPaymentSchema, updateRentPaymentSchema } from './rent-payments.validation';

// ── Helpers ───────────────────────────────────────────────────────────────────

function validateObjectId(id: string, label = 'ID'): void {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, 'INVALID_ID', `Invalid ${label} format`);
  }
}

/**
 * Returns the set of property _ids accessible to the user.
 * STAFF: only properties they own.
 * ADMIN/SUPER_ADMIN: all properties (returns undefined → no filter).
 */
async function getScopedPropertyIds(
  role: UserRole,
  userId: string,
): Promise<mongoose.Types.ObjectId[] | undefined> {
  if (role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN) return undefined;
  const props = await Property.find({ userId }).select('_id').lean();
  return props.map((p) => p._id as mongoose.Types.ObjectId);
}

// ── Access middleware ─────────────────────────────────────────────────────────

/**
 * rentPaymentAccessMiddleware
 *
 * Verifies the authenticated user can access the rent payment by checking
 * ownership of the payment's property. Attaches `req.rentPaymentDoc`.
 */
export const rentPaymentAccessMiddleware: RequestHandler = asyncHandler(async (req, _res, next) => {
  const id = req.params['id'] as string;
  validateObjectId(id, 'rent payment ID');

  const payment = await RentPayment.findById(id).lean();
  if (!payment) {
    throw ApiError.notFound('Rent payment');
  }

  const { role, id: userId } = req.user!;

  if (role !== UserRole.ADMIN && role !== UserRole.SUPER_ADMIN) {
    const property = await Property.findById(payment.propertyId).select('userId').lean();
    if (!property || property.userId.toString() !== userId) {
      throw ApiError.forbidden('You do not have permission to access this rent payment');
    }
  }

  req.rentPaymentDoc = payment;
  next();
});

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * GET /api/rent-payments
 *
 * Paginated list scoped to the user's properties.
 *
 * Query params:
 *   ?page       — 1-based page (default: 1)
 *   ?limit      — items per page (default: 25, max: 100)
 *   ?status     — 'Pending' | 'Paid' | 'Overdue' | 'Partial'
 *   ?propertyId — filter to a specific property
 *   ?tenantId   — filter to a specific tenant
 *   ?month      — YYYY-MM filter (matches dueDate within that calendar month)
 */
export const listRentPayments: RequestHandler = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt((req.query['page'] as string) || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt((req.query['limit'] as string) || '25', 10)));
  const skip = (page - 1) * limit;

  const { role, id: userId } = req.user!;
  const filter: Record<string, unknown> = {};

  // BL-04 data scoping through property
  const scopedIds = await getScopedPropertyIds(role, userId);
  if (scopedIds !== undefined) {
    filter['propertyId'] = { $in: scopedIds };
  }

  const statusParam = req.query['status'] as string | undefined;
  if (['Pending', 'Paid', 'Overdue', 'Partial'].includes(statusParam ?? '')) {
    filter['status'] = statusParam;
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

  // Month filter: ?month=2024-03  → dueDate in March 2024
  const monthParam = req.query['month'] as string | undefined;
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const year = Number(monthParam.slice(0, 4));
    const month = Number(monthParam.slice(5, 7));
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1)); // exclusive
    filter['dueDate'] = { $gte: start, $lt: end };
  }

  const [payments, total] = await Promise.all([
    RentPayment.find(filter).sort({ dueDate: -1 }).skip(skip).limit(limit).lean(),
    RentPayment.countDocuments(filter),
  ]);

  return ApiResponse.paginated(res, payments, { total, page, limit });
});

/**
 * POST /api/rent-payments
 *
 * Creates a new rent payment record (for months not covered by auto-generation,
 * or to record an advance payment).
 */
export const createRentPayment: RequestHandler = asyncHandler(async (req, res) => {
  const data = createRentPaymentSchema.parse(req.body);
  const { role, id: userId } = req.user!;

  validateObjectId(data.tenantId, 'tenantId');
  validateObjectId(data.propertyId, 'propertyId');

  // Verify property access
  const property = await Property.findById(data.propertyId).select('userId').lean();
  if (!property) {
    throw ApiError.notFound('Property');
  }
  if (role !== UserRole.ADMIN && role !== UserRole.SUPER_ADMIN) {
    if (property.userId.toString() !== userId) {
      throw ApiError.forbidden('You do not have permission to add payments to this property');
    }
  }

  const payment = await RentPayment.create({
    ...data,
    tenantId: new mongoose.Types.ObjectId(data.tenantId),
    propertyId: new mongoose.Types.ObjectId(data.propertyId),
    dueDate: new Date(data.dueDate),
    paidDate: data.paidDate ? new Date(data.paidDate) : undefined,
  });

  return ApiResponse.created(res, { payment }, 'Rent payment recorded');
});

/**
 * GET /api/rent-payments/:id
 */
export const getRentPayment: RequestHandler = asyncHandler(async (req, res) => {
  return ApiResponse.ok(res, { payment: req.rentPaymentDoc });
});

/**
 * PUT /api/rent-payments/:id
 *
 * Updates an existing payment record (e.g. mark as Paid, add payment method).
 * When setting status to 'Paid', paidDate defaults to now if not provided.
 */
export const updateRentPayment: RequestHandler = asyncHandler(async (req, res) => {
  const id = req.params['id'] as string;
  const data = updateRentPaymentSchema.parse(req.body);

  const updateSet: Record<string, unknown> = { ...data };

  // Auto-set paidDate when marking as Paid and no date provided
  if (data.status === 'Paid' && !data.paidDate) {
    updateSet['paidDate'] = new Date();
  }
  if (data.paidDate !== undefined) {
    updateSet['paidDate'] = data.paidDate ? new Date(data.paidDate) : null;
  }
  if (data.dueDate) {
    updateSet['dueDate'] = new Date(data.dueDate);
  }

  const updated = await RentPayment.findByIdAndUpdate(
    id,
    { $set: updateSet },
    { new: true, runValidators: true },
  ).lean();

  if (!updated) {
    throw ApiError.notFound('Rent payment');
  }

  return ApiResponse.ok(res, { payment: updated });
});

/**
 * DELETE /api/rent-payments/:id
 *
 * Hard-deletes a rent payment record.
 */
export const deleteRentPayment: RequestHandler = asyncHandler(async (req, res) => {
  const id = req.params['id'] as string;
  await RentPayment.findByIdAndDelete(id);
  return ApiResponse.noContent(res);
});

/**
 * POST /api/rent-payments/generate
 *
 * Manual trigger: generates backfill invoices for all Active tenants accessible
 * to the current user. Returns a summary of the operation.
 *
 * This endpoint is idempotent — duplicate invoices are never created.
 */
export const generateInvoices: RequestHandler = asyncHandler(async (req, res) => {
  const { role, id: userId } = req.user!;

  // Build tenant filter scoped to the user's properties
  const tenantFilter: Record<string, unknown> = { status: 'Active' };
  const scopedIds = await getScopedPropertyIds(role, userId);
  if (scopedIds !== undefined) {
    tenantFilter['propertyId'] = { $in: scopedIds };
  }

  const activeTenants = await Tenant.find(tenantFilter).select('_id').lean();

  let totalGenerated = 0;
  let tenantsProcessed = 0;

  for (const tenant of activeTenants) {
    const count = await generateRecurringInvoices(tenant._id as mongoose.Types.ObjectId);
    totalGenerated += count;
    tenantsProcessed++;
  }

  return ApiResponse.ok(res, {
    tenantsProcessed,
    invoicesGenerated: totalGenerated,
    message:
      totalGenerated === 0
        ? 'All invoices are already up to date.'
        : `Generated ${totalGenerated} invoice${totalGenerated !== 1 ? 's' : ''} across ${tenantsProcessed} tenant${tenantsProcessed !== 1 ? 's' : ''}.`,
  });
});
