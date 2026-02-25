import mongoose from 'mongoose';
import type { RequestHandler } from 'express';
import { ApiError } from '@utils/ApiError';
import { ApiResponse } from '@utils/ApiResponse';
import { asyncHandler } from '@utils/asyncHandler';
import { UserRole } from '@models/user.model';
import { Property } from '@models/property.model';
import { TenantCheque } from '@models/tenant-cheque.model';
import { OwnerCheque } from '@models/owner-cheque.model';
import {
  createTenantChequeSchema,
  updateTenantChequeStatusSchema,
  createOwnerChequeSchema,
  updateOwnerChequeStatusSchema,
  createOwnerChequesBulkSchema,
} from './cheques.validation';

// ── Helpers ────────────────────────────────────────────────────────────────────

function validateObjectId(id: string, label = 'ID'): void {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, 'INVALID_ID', `Invalid ${label} format`);
  }
}

async function getScopedPropertyIds(
  role: UserRole,
  userId: string,
): Promise<mongoose.Types.ObjectId[] | undefined> {
  if (role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN) return undefined;
  const props = await Property.find({ userId }).select('_id').lean();
  return props.map((p) => p._id as mongoose.Types.ObjectId);
}

function buildPropertyFilter(
  scopedIds: mongoose.Types.ObjectId[] | undefined,
  reqQuery: Record<string, unknown>,
): Record<string, unknown> {
  const filter: Record<string, unknown> = {};
  if (scopedIds !== undefined) {
    filter['propertyId'] = { $in: scopedIds };
  }
  if (reqQuery['propertyId']) {
    filter['propertyId'] = new mongoose.Types.ObjectId(reqQuery['propertyId'] as string);
  }
  if (reqQuery['status']) {
    filter['status'] = reqQuery['status'];
  }
  if (reqQuery['tenantId']) {
    filter['tenantId'] = new mongoose.Types.ObjectId(reqQuery['tenantId'] as string);
  }
  return filter;
}

/**
 * Increments the trailing numeric portion of a cheque number.
 * e.g. "CHQ001" → "CHQ002", "000099" → "000100"
 */
function incrementChequeNumber(num: string): string {
  const match = num.match(/^(.*?)(\d+)(\D*)$/);
  if (!match) return `${num}1`;
  const prefix = match[1] ?? '';
  const digits = match[2] ?? '';
  const suffix = match[3] ?? '';
  const incremented = String(Number(digits) + 1).padStart(digits.length, '0');
  return `${prefix}${incremented}${suffix}`;
}

function addMonths(d: Date, n: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, d.getUTCDate()));
}

function addWeeks(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 7 * 24 * 60 * 60 * 1000);
}

// ── TENANT CHEQUES ─────────────────────────────────────────────────────────────

/**
 * GET /api/cheques/tenant
 */
export const listTenantCheques: RequestHandler = asyncHandler(async (req, res) => {
  const { role, id: userId } = req.user!;
  const page = Math.max(1, Number(req.query['page'] ?? 1));
  const limit = Math.min(100, Math.max(1, Number(req.query['limit'] ?? 25)));
  const skip = (page - 1) * limit;

  const scopedIds = await getScopedPropertyIds(role, userId);
  const filter = buildPropertyFilter(scopedIds, req.query as Record<string, unknown>);

  if (req.query['search']) {
    const re = new RegExp(String(req.query['search']).trim(), 'i');
    filter['chequeNumber'] = re;
  }

  const [cheques, total] = await Promise.all([
    TenantCheque.find(filter).sort({ chequeDate: -1 }).skip(skip).limit(limit).lean(),
    TenantCheque.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(total / limit);
  return ApiResponse.ok(res, {
    cheques,
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
 * POST /api/cheques/tenant
 */
export const createTenantCheque: RequestHandler = asyncHandler(async (req, res) => {
  const { id: userId, role } = req.user!;
  const parsed = createTenantChequeSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(
      422,
      'VALIDATION_ERROR',
      parsed.error.errors[0]?.message ?? 'Validation failed',
    );
  }

  const data = parsed.data;
  validateObjectId(data.tenantId, 'tenantId');
  validateObjectId(data.propertyId, 'propertyId');

  // Verify property access for STAFF
  if (role !== UserRole.ADMIN && role !== UserRole.SUPER_ADMIN) {
    const prop = await Property.findOne({ _id: data.propertyId, userId }).select('_id').lean();
    if (!prop) throw ApiError.forbidden('You do not have access to this property');
  }

  const cheque = await TenantCheque.create({
    userId,
    tenantId: data.tenantId,
    propertyId: data.propertyId,
    rentPaymentId: data.rentPaymentId ?? null,
    chequeNumber: data.chequeNumber,
    bankName: data.bankName,
    chequeAmount: data.chequeAmount,
    chequeDate: new Date(data.chequeDate),
    depositDate: data.depositDate ? new Date(data.depositDate) : undefined,
    status: data.status ?? 'Pending',
    notes: data.notes,
  });

  return ApiResponse.created(res, { cheque });
});

/**
 * PATCH /api/cheques/tenant/:id/status
 */
export const updateTenantChequeStatus: RequestHandler = asyncHandler(async (req, res) => {
  const { id: userId, role } = req.user!;
  const id = req.params['id'] as string;
  validateObjectId(id, 'tenant cheque ID');

  const cheque = await TenantCheque.findById(id).lean();
  if (!cheque) throw ApiError.notFound('Tenant cheque');

  if (role !== UserRole.ADMIN && role !== UserRole.SUPER_ADMIN) {
    if (cheque.userId.toString() !== userId) throw ApiError.forbidden('Access denied');
  }

  const parsed = updateTenantChequeStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(
      422,
      'VALIDATION_ERROR',
      parsed.error.errors[0]?.message ?? 'Validation failed',
    );
  }

  const data = parsed.data;
  const update: Record<string, unknown> = { status: data.status };
  if (data.depositDate) update['depositDate'] = new Date(data.depositDate);
  if (data.notes !== undefined) update['notes'] = data.notes ?? null;

  const updated = await TenantCheque.findByIdAndUpdate(
    id,
    { $set: update },
    { new: true, runValidators: true },
  ).lean();

  return ApiResponse.ok(res, { cheque: updated });
});

/**
 * DELETE /api/cheques/tenant/:id
 */
export const deleteTenantCheque: RequestHandler = asyncHandler(async (req, res) => {
  const { id: userId, role } = req.user!;
  const id = req.params['id'] as string;
  validateObjectId(id, 'tenant cheque ID');

  const cheque = await TenantCheque.findById(id).lean();
  if (!cheque) throw ApiError.notFound('Tenant cheque');

  if (role !== UserRole.ADMIN && role !== UserRole.SUPER_ADMIN) {
    if (cheque.userId.toString() !== userId) throw ApiError.forbidden('Access denied');
  }

  await TenantCheque.findByIdAndDelete(id);
  return ApiResponse.ok(res, { message: 'Tenant cheque deleted' });
});

// ── OWNER CHEQUES ──────────────────────────────────────────────────────────────

/**
 * GET /api/cheques/owner
 */
export const listOwnerCheques: RequestHandler = asyncHandler(async (req, res) => {
  const { role, id: userId } = req.user!;
  const page = Math.max(1, Number(req.query['page'] ?? 1));
  const limit = Math.min(100, Math.max(1, Number(req.query['limit'] ?? 25)));
  const skip = (page - 1) * limit;

  const scopedIds = await getScopedPropertyIds(role, userId);
  const filter = buildPropertyFilter(scopedIds, req.query as Record<string, unknown>);

  // Upcoming: cheques due in next 7 days that are still Issued
  if (req.query['upcoming'] === 'true') {
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    filter['status'] = 'Issued';
    filter['chequeDate'] = { $gte: now, $lte: in7Days };
  }

  if (req.query['search']) {
    const re = new RegExp(String(req.query['search']).trim(), 'i');
    filter['chequeNumber'] = re;
  }

  const [cheques, total] = await Promise.all([
    OwnerCheque.find(filter).sort({ chequeDate: 1 }).skip(skip).limit(limit).lean(),
    OwnerCheque.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(total / limit);
  return ApiResponse.ok(res, {
    cheques,
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
 * POST /api/cheques/owner
 */
export const createOwnerCheque: RequestHandler = asyncHandler(async (req, res) => {
  const { id: userId, role } = req.user!;
  const parsed = createOwnerChequeSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(
      422,
      'VALIDATION_ERROR',
      parsed.error.errors[0]?.message ?? 'Validation failed',
    );
  }

  const data = parsed.data;
  validateObjectId(data.propertyId, 'propertyId');

  if (role !== UserRole.ADMIN && role !== UserRole.SUPER_ADMIN) {
    const prop = await Property.findOne({ _id: data.propertyId, userId }).select('_id').lean();
    if (!prop) throw ApiError.forbidden('You do not have access to this property');
  }

  const cheque = await OwnerCheque.create({
    userId,
    propertyId: data.propertyId,
    ownerPaymentId: data.ownerPaymentId ?? null,
    chequeNumber: data.chequeNumber,
    bankName: data.bankName,
    chequeAmount: data.chequeAmount,
    chequeDate: new Date(data.chequeDate),
    issueDate: data.issueDate ? new Date(data.issueDate) : new Date(),
    status: data.status ?? 'Issued',
    notes: data.notes,
  });

  return ApiResponse.created(res, { cheque });
});

/**
 * POST /api/cheques/owner/bulk
 *
 * Creates multiple owner cheques with sequential dates and auto-incremented numbers.
 */
export const createOwnerChequesBulk: RequestHandler = asyncHandler(async (req, res) => {
  const { id: userId, role } = req.user!;
  const parsed = createOwnerChequesBulkSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(
      422,
      'VALIDATION_ERROR',
      parsed.error.errors[0]?.message ?? 'Validation failed',
    );
  }

  const data = parsed.data;
  validateObjectId(data.propertyId, 'propertyId');

  if (role !== UserRole.ADMIN && role !== UserRole.SUPER_ADMIN) {
    const prop = await Property.findOne({ _id: data.propertyId, userId }).select('_id').lean();
    if (!prop) throw ApiError.forbidden('You do not have access to this property');
  }

  let startingNumber: string;
  let amount = data.chequeAmount;
  let bankName = data.bankName;

  if (data.chequeMode === 'copy_from') {
    validateObjectId(data.sourceChequeId!, 'sourceChequeId');
    const source = await OwnerCheque.findById(data.sourceChequeId).lean();
    if (!source) throw ApiError.notFound('Source cheque');
    startingNumber = incrementChequeNumber(source.chequeNumber);
    // Override amount and bank from source unless explicitly provided
    amount = data.chequeAmount > 0 ? data.chequeAmount : source.chequeAmount;
    bankName = data.bankName ?? source.bankName;
  } else {
    startingNumber = data.startingChequeNumber!;
  }

  const startDate = new Date(data.startDate);
  const toCreate: Array<{
    userId: mongoose.Types.ObjectId;
    propertyId: string;
    chequeNumber: string;
    bankName?: string;
    chequeAmount: number;
    chequeDate: Date;
    issueDate: Date;
    status: string;
    notes?: string;
  }> = [];

  let currentChequeNumber = startingNumber;
  const now = new Date();

  for (let i = 0; i < data.numCheques; i++) {
    const chequeDate =
      data.frequency === 'Monthly' ? addMonths(startDate, i) : addWeeks(startDate, i);

    toCreate.push({
      userId: new mongoose.Types.ObjectId(userId),
      propertyId: data.propertyId,
      chequeNumber: currentChequeNumber,
      bankName,
      chequeAmount: amount,
      chequeDate,
      issueDate: now,
      status: 'Issued',
      notes: data.notes,
    });

    currentChequeNumber = incrementChequeNumber(currentChequeNumber);
  }

  const cheques = await OwnerCheque.insertMany(toCreate);

  return ApiResponse.created(res, {
    cheques,
    message: `Created ${cheques.length} owner cheque${cheques.length !== 1 ? 's' : ''}`,
    count: cheques.length,
  });
});

/**
 * PATCH /api/cheques/owner/:id/status
 */
export const updateOwnerChequeStatus: RequestHandler = asyncHandler(async (req, res) => {
  const { id: userId, role } = req.user!;
  const id = req.params['id'] as string;
  validateObjectId(id, 'owner cheque ID');

  const cheque = await OwnerCheque.findById(id).lean();
  if (!cheque) throw ApiError.notFound('Owner cheque');

  if (role !== UserRole.ADMIN && role !== UserRole.SUPER_ADMIN) {
    if (cheque.userId.toString() !== userId) throw ApiError.forbidden('Access denied');
  }

  const parsed = updateOwnerChequeStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(
      422,
      'VALIDATION_ERROR',
      parsed.error.errors[0]?.message ?? 'Validation failed',
    );
  }

  const data = parsed.data;
  const update: Record<string, unknown> = { status: data.status };
  if (data.notes !== undefined) update['notes'] = data.notes ?? null;

  const updated = await OwnerCheque.findByIdAndUpdate(
    id,
    { $set: update },
    { new: true, runValidators: true },
  ).lean();

  return ApiResponse.ok(res, { cheque: updated });
});

/**
 * DELETE /api/cheques/owner/:id
 */
export const deleteOwnerCheque: RequestHandler = asyncHandler(async (req, res) => {
  const { id: userId, role } = req.user!;
  const id = req.params['id'] as string;
  validateObjectId(id, 'owner cheque ID');

  const cheque = await OwnerCheque.findById(id).lean();
  if (!cheque) throw ApiError.notFound('Owner cheque');

  if (role !== UserRole.ADMIN && role !== UserRole.SUPER_ADMIN) {
    if (cheque.userId.toString() !== userId) throw ApiError.forbidden('Access denied');
  }

  await OwnerCheque.findByIdAndDelete(id);
  return ApiResponse.ok(res, { message: 'Owner cheque deleted' });
});
