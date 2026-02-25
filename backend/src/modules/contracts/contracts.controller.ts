import mongoose from 'mongoose';
import type { RequestHandler } from 'express';
import { ApiResponse } from '@utils/ApiResponse';
import { ApiError } from '@utils/ApiError';
import { asyncHandler } from '@utils/asyncHandler';
import { UserRole } from '@models/user.model';
import { User } from '@models/user.model';
import { Tenant } from '@models/tenant.model';
import { Property } from '@models/property.model';
import { Contract } from '@models/contract.model';
import { upsertContractSchema } from './contracts.validation';

// ── Access middleware ─────────────────────────────────────────────────────────

/**
 * Loads the contract by :id, verifies ownership for STAFF users,
 * and attaches req.contractDoc.
 */
export const contractAccessMiddleware: RequestHandler = asyncHandler(async (req, _res, next) => {
  const { id: userId, role } = req.user!;
  const isAdmin = role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;

  const contract = await Contract.findById(req.params['id']).lean();
  if (!contract) throw ApiError.notFound('Contract not found');

  if (!isAdmin && contract.userId.toString() !== userId) {
    throw ApiError.forbidden('Access denied');
  }

  req.contractDoc = contract;
  next();
});

// ── GET /contracts ─────────────────────────────────────────────────────────

export const listContracts: RequestHandler = asyncHandler(async (req, res) => {
  const { id: userId, role } = req.user!;
  const isAdmin = role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;

  const page = Math.max(1, Number(req.query['page']) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query['limit']) || 20));
  const skip = (page - 1) * limit;

  const ownerFilter = isAdmin ? {} : { userId: new mongoose.Types.ObjectId(userId) };

  const [contracts, total] = await Promise.all([
    Contract.find(ownerFilter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Contract.countDocuments(ownerFilter),
  ]);

  return ApiResponse.paginated(res, contracts, { total, page, limit });
});

// ── GET /contracts/defaults ────────────────────────────────────────────────

/**
 * Returns pre-filled defaults for the contract editor:
 * - Landlord info from the logged-in user
 * - Tenant + property info if ?tenantId=X is provided
 */
export const getContractDefaults: RequestHandler = asyncHandler(async (req, res) => {
  const { id: userId } = req.user!;

  // Landlord from user record
  const user = await User.findById(userId).select('email phone').lean();

  const defaults: Record<string, unknown> = {
    landlordEmail: user?.email ?? '',
    landlordPhone: user?.phone ?? '',
    landlordName: '',
    governingLaw: 'Qatar',
    utilitiesResponsible: 'Tenant',
    petsAllowed: false,
  };

  // Tenant + property info if tenantId provided
  const tenantId = req.query['tenantId'] as string | undefined;
  if (tenantId && mongoose.isValidObjectId(tenantId)) {
    const tenant = await Tenant.findById(tenantId).lean();
    if (tenant) {
      defaults.tenantId = tenantId;
      defaults.tenantName = `${tenant.firstName} ${tenant.lastName}`.trim();
      defaults.tenantPhone = tenant.phone ?? '';
      defaults.tenantEmail = tenant.email ?? '';
      defaults.tenantAlternatePhone = tenant.alternatePhone ?? '';
      defaults.tenantQatarId = tenant.qatarId ?? '';
      defaults.leaseStart = tenant.leaseStart?.toISOString().slice(0, 10) ?? '';
      defaults.leaseEnd = tenant.leaseEnd?.toISOString().slice(0, 10) ?? '';
      defaults.monthlyRent = tenant.monthlyRent ?? 0;
      defaults.securityDeposit = tenant.securityDeposit ?? 0;
      defaults.emergencyContactName = tenant.emergencyContact?.name ?? '';
      defaults.emergencyContactPhone = tenant.emergencyContact?.phone ?? '';

      // Property from tenant.propertyId
      const property = await Property.findById(tenant.propertyId).lean();
      if (property) {
        defaults.propertyName = property.propertyName ?? '';
        defaults.propertyAddress = property.address ?? '';
        defaults.propertyCity = property.city ?? '';
        defaults.propertyState = property.state ?? '';
        defaults.propertyZip = property.zipCode ?? '';
        defaults.propertyType = property.propertyType ?? '';
        defaults.propertyBedrooms = property.bedrooms ?? 0;
        defaults.propertyBathrooms = property.bathrooms ?? 0;
        defaults.propertySquareFeet = property.squareFeet ?? 0;
      }
    }
  }

  return ApiResponse.ok(res, { defaults });
});

// ── POST /contracts ────────────────────────────────────────────────────────

export const createContract: RequestHandler = asyncHandler(async (req, res) => {
  const { id: userId } = req.user!;
  const parsed = upsertContractSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(
      422,
      'VALIDATION_ERROR',
      parsed.error.errors[0]?.message ?? 'Validation failed',
    );
  }

  const data = parsed.data;

  const contract = await Contract.create({
    userId: new mongoose.Types.ObjectId(userId),
    ...(data.tenantId ? { tenantId: new mongoose.Types.ObjectId(data.tenantId) } : {}),
    ...data,
    ...(data.leaseStart ? { leaseStart: new Date(data.leaseStart) } : {}),
    ...(data.leaseEnd ? { leaseEnd: new Date(data.leaseEnd) } : {}),
    ...(data.agreementDate ? { agreementDate: new Date(data.agreementDate) } : {}),
  });

  return ApiResponse.created(res, { contract });
});

// ── GET /contracts/:id ────────────────────────────────────────────────────

export const getContract: RequestHandler = asyncHandler(async (_req, res) => {
  return ApiResponse.ok(res, { contract: _req.contractDoc });
});

// ── PUT /contracts/:id ────────────────────────────────────────────────────

export const updateContract: RequestHandler = asyncHandler(async (req, res) => {
  const parsed = upsertContractSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(
      422,
      'VALIDATION_ERROR',
      parsed.error.errors[0]?.message ?? 'Validation failed',
    );
  }

  const data = parsed.data;

  const updated = await Contract.findByIdAndUpdate(
    req.contractDoc!._id,
    {
      $set: {
        ...data,
        ...(data.tenantId ? { tenantId: new mongoose.Types.ObjectId(data.tenantId) } : {}),
        ...(data.leaseStart ? { leaseStart: new Date(data.leaseStart) } : {}),
        ...(data.leaseEnd ? { leaseEnd: new Date(data.leaseEnd) } : {}),
        ...(data.agreementDate ? { agreementDate: new Date(data.agreementDate) } : {}),
      },
    },
    { new: true, runValidators: true },
  ).lean();

  return ApiResponse.ok(res, { contract: updated });
});

// ── DELETE /contracts/:id ─────────────────────────────────────────────────

export const deleteContract: RequestHandler = asyncHandler(async (req, res) => {
  await Contract.findByIdAndDelete(req.contractDoc!._id);
  return ApiResponse.ok(res, { message: 'Contract deleted' });
});
