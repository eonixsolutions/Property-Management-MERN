import mongoose from 'mongoose';
import type { RequestHandler } from 'express';
import { ApiError } from '@utils/ApiError';
import { ApiResponse } from '@utils/ApiResponse';
import { asyncHandler } from '@utils/asyncHandler';
import { UserRole } from '@models/user.model';
import { Property } from '@models/property.model';
import { MaintenanceRequest } from '@models/maintenance-request.model';
import type { IMaintenanceRequest } from '@models/maintenance-request.model';
import { createMaintenanceSchema, updateMaintenanceSchema } from './maintenance.validation';

// ── Helpers ───────────────────────────────────────────────────────────────────

function validateObjectId(id: string, label = 'ID'): void {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, 'INVALID_ID', `Invalid ${label} format`);
  }
}

// ── Access middleware ──────────────────────────────────────────────────────────

/**
 * maintenanceAccessMiddleware
 *
 * Verifies the user has access to the maintenance request.
 * ADMIN / SUPER_ADMIN: always allowed.
 * STAFF: allowed only if maintenanceRequest.userId matches their own id
 *        (userId is denormalized from property.userId at creation time).
 * Attaches `req.maintenanceDoc`.
 */
export const maintenanceAccessMiddleware: RequestHandler = asyncHandler(async (req, _res, next) => {
  const id = req.params['id'] as string;
  validateObjectId(id, 'maintenance request ID');

  const doc = await MaintenanceRequest.findById(id).lean();
  if (!doc) throw ApiError.notFound('Maintenance request');

  const { role, id: userId } = req.user!;

  if (role !== UserRole.ADMIN && role !== UserRole.SUPER_ADMIN) {
    if (doc.userId.toString() !== userId) {
      throw ApiError.forbidden('You do not have permission to access this maintenance request');
    }
  }

  req.maintenanceDoc = doc as unknown as IMaintenanceRequest & {
    _id: mongoose.Types.ObjectId;
  };
  next();
});

// ── Controllers ────────────────────────────────────────────────────────────────

/**
 * GET /api/maintenance
 *
 * Query params: page, limit, propertyId, status, priority, search (title)
 */
export const listMaintenanceRequests: RequestHandler = asyncHandler(async (req, res) => {
  const { role, id: userId } = req.user!;
  const page = Math.max(1, Number(req.query['page'] ?? 1));
  const limit = Math.min(100, Math.max(1, Number(req.query['limit'] ?? 20)));
  const skip = (page - 1) * limit;

  // BL-04 data scoping — maintenance userId = property.userId (denormalized at create)
  const filter: Record<string, unknown> = {};
  if (role !== UserRole.ADMIN && role !== UserRole.SUPER_ADMIN) {
    filter['userId'] = new mongoose.Types.ObjectId(userId);
  }

  if (req.query['propertyId']) {
    const pid = req.query['propertyId'] as string;
    validateObjectId(pid, 'propertyId');
    filter['propertyId'] = new mongoose.Types.ObjectId(pid);
  }
  if (req.query['status']) {
    filter['status'] = req.query['status'];
  }
  if (req.query['priority']) {
    filter['priority'] = req.query['priority'];
  }
  if (req.query['search']) {
    filter['title'] = { $regex: req.query['search'], $options: 'i' };
  }

  const [requests, total] = await Promise.all([
    MaintenanceRequest.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    MaintenanceRequest.countDocuments(filter),
  ]);

  return ApiResponse.paginated(res, requests, { page, limit, total });
});

/**
 * GET /api/maintenance/:id
 */
export const getMaintenanceRequest: RequestHandler = asyncHandler(async (_req, res) => {
  return ApiResponse.ok(res, { request: _req.maintenanceDoc });
});

/**
 * POST /api/maintenance
 */
export const createMaintenanceRequest: RequestHandler = asyncHandler(async (req, res) => {
  const { id: userId, role } = req.user!;
  const parsed = createMaintenanceSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(
      422,
      'VALIDATION_ERROR',
      parsed.error.errors[0]?.message ?? 'Validation failed',
    );
  }

  const data = parsed.data;
  validateObjectId(data.propertyId, 'propertyId');
  if (data.tenantId) validateObjectId(data.tenantId, 'tenantId');

  // Verify property access and look up the property's userId for denormalization
  const propFilter: Record<string, unknown> = { _id: data.propertyId };
  if (role !== UserRole.ADMIN && role !== UserRole.SUPER_ADMIN) {
    propFilter['userId'] = userId;
  }
  const property = await Property.findOne(propFilter).select('_id userId').lean();
  if (!property) {
    throw ApiError.forbidden('Property not found or access denied');
  }

  const request = await MaintenanceRequest.create({
    userId: property.userId, // denormalized — always the property owner
    propertyId: data.propertyId,
    tenantId: data.tenantId ?? undefined,
    title: data.title,
    description: data.description,
    priority: data.priority,
    status: data.status,
    cost: data.cost,
    completedDate: data.completedDate ? new Date(data.completedDate) : undefined,
    notes: data.notes,
  });

  return ApiResponse.created(res, { request });
});

/**
 * PUT /api/maintenance/:id
 */
export const updateMaintenanceRequest: RequestHandler = asyncHandler(async (req, res) => {
  const parsed = updateMaintenanceSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(
      422,
      'VALIDATION_ERROR',
      parsed.error.errors[0]?.message ?? 'Validation failed',
    );
  }

  const data = parsed.data;
  const update: Record<string, unknown> = {};

  if (data.title !== undefined) update['title'] = data.title;
  if (data.description !== undefined) update['description'] = data.description ?? null;
  if (data.priority !== undefined) update['priority'] = data.priority;
  if (data.status !== undefined) update['status'] = data.status;
  if (data.cost !== undefined) update['cost'] = data.cost ?? null;
  if (data.completedDate !== undefined) {
    update['completedDate'] = data.completedDate ? new Date(data.completedDate) : null;
  }
  if (data.notes !== undefined) update['notes'] = data.notes ?? null;

  const updated = await MaintenanceRequest.findByIdAndUpdate(
    req.maintenanceDoc!._id,
    { $set: update },
    { new: true, runValidators: true },
  ).lean();

  return ApiResponse.ok(res, { request: updated });
});

/**
 * DELETE /api/maintenance/:id
 */
export const deleteMaintenanceRequest: RequestHandler = asyncHandler(async (req, res) => {
  await MaintenanceRequest.findByIdAndDelete(req.maintenanceDoc!._id);
  return ApiResponse.noContent(res);
});
