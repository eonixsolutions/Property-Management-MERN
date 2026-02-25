import mongoose from 'mongoose';
import type { RequestHandler } from 'express';
import { ApiError } from '@utils/ApiError';
import { ApiResponse } from '@utils/ApiResponse';
import { asyncHandler } from '@utils/asyncHandler';
import { UserRole } from '@models/user.model';
import { Property } from '@models/property.model';
import { Tenant } from '@models/tenant.model';
import { RentPayment } from '@models/rent-payment.model';
import {
  generateRecurringInvoices,
  generateMonthlyInvoices,
} from '@services/recurring-invoices.service';
import { createTenantSchema, updateTenantSchema } from './tenants.validation';

// ── Helpers ───────────────────────────────────────────────────────────────

function validateObjectId(id: string, label = 'ID'): void {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, 'INVALID_ID', `Invalid ${label} format`);
  }
}

/**
 * Returns an array of property _ids owned by the given userId.
 * Used to scope tenant queries for STAFF users (BL-04).
 */
async function getTenantPropertyIds(userId: string): Promise<mongoose.Types.ObjectId[]> {
  const props = await Property.find({ userId }).select('_id').lean();
  return props.map((p) => p._id as mongoose.Types.ObjectId);
}

// ── Access middleware ─────────────────────────────────────────────────────

/**
 * tenantAccessMiddleware
 *
 * Verifies the authenticated user has access to the tenant (directly owns
 * the property the tenant belongs to, or is ADMIN/SUPER_ADMIN).
 * Attaches the found tenant document to `req.tenantDoc` for downstream handlers.
 */
export const tenantAccessMiddleware: RequestHandler = asyncHandler(async (req, _res, next) => {
  const id = req.params['id'] as string;
  validateObjectId(id, 'tenant ID');

  const tenant = await Tenant.findById(id).lean();
  if (!tenant) {
    throw ApiError.notFound('Tenant');
  }

  const { role, id: userId } = req.user!;

  if (role !== UserRole.ADMIN && role !== UserRole.SUPER_ADMIN) {
    // STAFF: verify the tenant's property belongs to this user
    const property = await Property.findById(tenant.propertyId).select('userId').lean();
    if (!property || property.userId.toString() !== userId) {
      throw ApiError.forbidden('You do not have permission to access this tenant');
    }
  }

  req.tenantDoc = tenant;
  next();
});

// ── Controllers ───────────────────────────────────────────────────────────

/**
 * GET /api/tenants/dropdown
 *
 * Returns a minimal list of tenants for dropdown/select components.
 * Optional: ?propertyId= to filter to a single property, ?status= to filter by status.
 */
export const getTenantsDropdown: RequestHandler = asyncHandler(async (req, res) => {
  const { role, id: userId } = req.user!;
  const filter: Record<string, unknown> = {};

  if (role !== UserRole.ADMIN && role !== UserRole.SUPER_ADMIN) {
    const propertyIds = await getTenantPropertyIds(userId);
    filter['propertyId'] = { $in: propertyIds };
  }

  const propertyIdParam = req.query['propertyId'] as string | undefined;
  if (propertyIdParam) {
    validateObjectId(propertyIdParam, 'propertyId');
    filter['propertyId'] = new mongoose.Types.ObjectId(propertyIdParam);
  }

  const statusParam = req.query['status'] as string | undefined;
  if (statusParam === 'Active' || statusParam === 'Past' || statusParam === 'Pending') {
    filter['status'] = statusParam;
  }

  const tenants = await Tenant.find(filter)
    .select('firstName lastName status propertyId')
    .sort({ firstName: 1, lastName: 1 })
    .lean();

  return ApiResponse.ok(res, { items: tenants });
});

/**
 * GET /api/tenants
 *
 * Paginated tenant list, scoped to the authenticated user's properties.
 *
 * Query params:
 *   ?page        — 1-based page (default: 1)
 *   ?limit       — items per page (default: 25, max: 100)
 *   ?status      — 'Active' | 'Past' | 'Pending'
 *   ?propertyId  — filter to a specific property
 *   ?search      — partial match on firstName or lastName (case-insensitive)
 */
export const listTenants: RequestHandler = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt((req.query['page'] as string) || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt((req.query['limit'] as string) || '25', 10)));
  const skip = (page - 1) * limit;

  const { role, id: userId } = req.user!;
  const filter: Record<string, unknown> = {};

  // BL-04: STAFF see only tenants in their own properties
  if (role !== UserRole.ADMIN && role !== UserRole.SUPER_ADMIN) {
    const propertyIds = await getTenantPropertyIds(userId);
    filter['propertyId'] = { $in: propertyIds };
  }

  const statusParam = req.query['status'] as string | undefined;
  if (statusParam === 'Active' || statusParam === 'Past' || statusParam === 'Pending') {
    filter['status'] = statusParam;
  }

  const propertyIdParam = req.query['propertyId'] as string | undefined;
  if (propertyIdParam) {
    validateObjectId(propertyIdParam, 'propertyId');
    filter['propertyId'] = new mongoose.Types.ObjectId(propertyIdParam);
  }

  const searchParam = req.query['search'] as string | undefined;
  if (searchParam?.trim()) {
    const regex = new RegExp(searchParam.trim(), 'i');
    filter['$or'] = [{ firstName: regex }, { lastName: regex }];
  }

  const [tenants, total] = await Promise.all([
    Tenant.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Tenant.countDocuments(filter),
  ]);

  return ApiResponse.paginated(res, tenants, { total, page, limit });
});

/**
 * POST /api/tenants
 *
 * Creates a new tenant. Verifies the target property exists and is accessible
 * to the authenticated user. Triggers invoice generation for Active tenants.
 */
export const createTenant: RequestHandler = asyncHandler(async (req, res) => {
  const data = createTenantSchema.parse(req.body);
  const { role, id: userId } = req.user!;

  validateObjectId(data.propertyId, 'propertyId');

  // Verify property exists and user has access
  const property = await Property.findById(data.propertyId).select('userId').lean();
  if (!property) {
    throw ApiError.notFound('Property');
  }
  if (role !== UserRole.ADMIN && role !== UserRole.SUPER_ADMIN) {
    if (property.userId.toString() !== userId) {
      throw ApiError.forbidden('You do not have permission to add tenants to this property');
    }
  }

  const tenant = await Tenant.create({
    ...data,
    propertyId: new mongoose.Types.ObjectId(data.propertyId),
    leaseStart: data.leaseStart ? new Date(data.leaseStart) : undefined,
    leaseEnd: data.leaseEnd ? new Date(data.leaseEnd) : undefined,
    moveInDate: data.moveInDate ? new Date(data.moveInDate) : undefined,
    moveOutDate: data.moveOutDate ? new Date(data.moveOutDate) : undefined,
  });
  // post-save hook fires: updatePropertyStatus

  // BL-02: generate backfill invoices for Active tenants with a lease start date
  if (tenant.status === 'Active' && tenant.leaseStart) {
    await generateRecurringInvoices(tenant._id as mongoose.Types.ObjectId);
  }

  return ApiResponse.created(res, { tenant }, 'Tenant created successfully');
});

/**
 * GET /api/tenants/:id
 *
 * Returns the tenant attached by tenantAccessMiddleware.
 */
export const getTenant: RequestHandler = asyncHandler(async (req, res) => {
  return ApiResponse.ok(res, { tenant: req.tenantDoc });
});

/**
 * PUT /api/tenants/:id
 *
 * Partial update. Triggers generateMonthlyInvoices if status or lease dates changed.
 */
export const updateTenant: RequestHandler = asyncHandler(async (req, res) => {
  const id = req.params['id'] as string;
  const existing = req.tenantDoc!;
  const data = updateTenantSchema.parse(req.body);

  // Track fields that affect invoice generation
  const statusChanged = data.status !== undefined && data.status !== existing.status;
  const leaseStartChanged =
    data.leaseStart !== undefined &&
    new Date(data.leaseStart).getTime() !== (existing.leaseStart?.getTime() ?? 0);
  const leaseEndChanged =
    data.leaseEnd !== undefined &&
    new Date(data.leaseEnd).getTime() !== (existing.leaseEnd?.getTime() ?? 0);

  const updated = await Tenant.findByIdAndUpdate(
    id,
    {
      $set: {
        ...data,
        ...(data.leaseStart !== undefined ? { leaseStart: new Date(data.leaseStart) } : {}),
        ...(data.leaseEnd !== undefined ? { leaseEnd: new Date(data.leaseEnd) } : {}),
        ...(data.moveInDate !== undefined ? { moveInDate: new Date(data.moveInDate) } : {}),
        ...(data.moveOutDate !== undefined ? { moveOutDate: new Date(data.moveOutDate) } : {}),
      },
    },
    { new: true, runValidators: true },
  ).lean();

  if (!updated) {
    throw ApiError.notFound('Tenant');
  }
  // post-save hook fires: updatePropertyStatus

  // BL-02: regenerate forward invoices if status→Active or lease dates changed
  const newStatusActive = (data.status ?? existing.status) === 'Active';
  if (newStatusActive && (statusChanged || leaseStartChanged || leaseEndChanged)) {
    await generateMonthlyInvoices(new mongoose.Types.ObjectId(id));
  }

  return ApiResponse.ok(res, { tenant: updated });
});

/**
 * DELETE /api/tenants/:id
 *
 * Hard-deletes the tenant. Rent payment history is preserved.
 * post-findOneAndDelete hook fires: updatePropertyStatus.
 */
export const deleteTenant: RequestHandler = asyncHandler(async (req, res) => {
  const id = req.params['id'] as string;
  await Tenant.findByIdAndDelete(id);
  // post-findOneAndDelete hook fires: updatePropertyStatus

  return ApiResponse.noContent(res);
});

/**
 * GET /api/tenants/:id/rent-payments
 *
 * Returns all rent payment records for the tenant, sorted by due date descending.
 */
export const getTenantRentPayments: RequestHandler = asyncHandler(async (req, res) => {
  const id = req.params['id'] as string;

  const payments = await RentPayment.find({ tenantId: new mongoose.Types.ObjectId(id) })
    .sort({ dueDate: -1 })
    .lean();

  return ApiResponse.ok(res, { payments });
});
