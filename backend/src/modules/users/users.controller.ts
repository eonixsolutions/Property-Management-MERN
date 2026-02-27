import mongoose from 'mongoose';
import type { RequestHandler } from 'express';
import { ApiError } from '@utils/ApiError';
import { ApiResponse } from '@utils/ApiResponse';
import { asyncHandler } from '@utils/asyncHandler';
import { User, UserRole, UserStatus } from '@models/user.model';
import { Settings } from '@models/settings.model';
import { createUserSchema, updateUserSchema } from './users.validation';

// ── Helpers ─────────────────────────────────────────────────────────────────

function validateObjectId(id: string): void {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, 'INVALID_ID', 'Invalid user ID format');
  }
}

// ── Controllers ─────────────────────────────────────────────────────────────

/**
 * GET /api/users
 *
 * Returns a paginated list of all users.  Password is never included
 * (field has select:false in schema; .lean() still respects this).
 *
 * Query params:
 *   ?page  — 1-based page number (default: 1)
 *   ?limit — items per page (default: 25, max: 100)
 */
export const listUsers: RequestHandler = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt((req.query['page'] as string) || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt((req.query['limit'] as string) || '25', 10)));
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    User.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit).lean({ virtuals: true }),
    User.countDocuments(),
  ]);

  return ApiResponse.paginated(res, users, { total, page, limit });
});

/**
 * POST /api/users
 *
 * Creates a new user account.  Only ADMIN and SUPER_ADMIN can call this
 * endpoint (enforced by isAdmin middleware on the route).
 *
 * Business rules:
 *  - Only SUPER_ADMIN can create a SUPER_ADMIN account
 *  - A default Settings document is created alongside the user (1:1)
 *  - New accounts are always created with status ACTIVE
 *  - Password is auto-hashed by the pre-save hook; never stored in plain text
 */
export const createUser: RequestHandler = asyncHandler(async (req, res) => {
  const { email, password, role, phone, firstName, lastName } =
  createUserSchema.parse(req.body);

  // Only SUPER_ADMIN may create another SUPER_ADMIN
  if (role === UserRole.SUPER_ADMIN && req.user!.role !== UserRole.SUPER_ADMIN) {
    throw ApiError.forbidden('Only a Super Admin can create a Super Admin account');
  }

  // Explicit duplicate check for a clear 409 rather than a cryptic Mongoose error
  const existing = await User.findOne({ email }).lean();
  if (existing) {
    throw ApiError.duplicate('An account with this email already exists');
  }

  const user = await User.create({
    email,
    password,
    role: role ?? UserRole.STAFF,
    status: UserStatus.ACTIVE,
    phone,
    firstName,
    lastName,
  });

  // Create default settings (1:1 with user, mirrors register endpoint)
  await Settings.create({
    userId: user._id,
    currency: 'QAR',
    timezone: 'Asia/Qatar',
  });

  // toJSON transform strips password before serialization
  return ApiResponse.created(res, { user }, 'User created successfully');
});

/**
 * PUT /api/users/:id
 *
 * Partial update — only the provided fields are changed.
 * Only ADMIN and SUPER_ADMIN can call this endpoint.
 *
 * Business rules:
 *  - Only SUPER_ADMIN can change a user's role
 *  - Password, if provided, is hashed by the pre-save hook on `.save()`
 *    We use findById + save (not findByIdAndUpdate) so the hook fires
 */
export const updateUser: RequestHandler = asyncHandler(async (req, res) => {
  const id = req.params['id'] as string;
  validateObjectId(id);

  const updates = updateUserSchema.parse(req.body);

  // Only SUPER_ADMIN may change roles
  if (updates.role !== undefined && req.user!.role !== UserRole.SUPER_ADMIN) {
    throw ApiError.forbidden('Only a Super Admin can change a user role');
  }

  // Use .findById() + .save() so the pre-save bcrypt hook fires when password changes
  const user = await User.findById(id);
  if (!user) throw ApiError.notFound('User');

  if (updates.firstName !== undefined) user.firstName = updates.firstName;
  if (updates.lastName !== undefined) user.lastName = updates.lastName;
  if (updates.email !== undefined) user.email = updates.email;
  if (updates.role !== undefined) user.role = updates.role;
  if (updates.status !== undefined) user.status = updates.status;
  if (updates.phone !== undefined) user.phone = updates.phone ?? undefined;
  if (updates.password !== undefined) user.password = updates.password;

  await user.save();

  // Re-fetch as plain object so toJSON transform strips password
  const updated = await User.findById(id).lean({ virtuals: true });
  return ApiResponse.ok(res, { user: updated }, 'User updated successfully');
});

/**
 * DELETE /api/users/:id
 *
 * Hard-deletes a user.  Only SUPER_ADMIN can call this endpoint.
 *
 * Business rules:
 *  - Cannot delete your own account
 *  - Cannot delete the last SUPER_ADMIN (system would become inaccessible)
 */
export const deleteUser: RequestHandler = asyncHandler(async (req, res) => {
  const id = req.params['id'] as string;
  validateObjectId(id);

  // Prevent self-deletion
  if (id === req.user!.id) {
    throw ApiError.conflict('You cannot delete your own account');
  }

  // Find the target user first to check their role
  const target = await User.findById(id).lean();
  if (!target) throw ApiError.notFound('User');

  // Prevent deleting the last SUPER_ADMIN
  if (target.role === UserRole.SUPER_ADMIN) {
    const superAdminCount = await User.countDocuments({ role: UserRole.SUPER_ADMIN });
    if (superAdminCount <= 1) {
      throw ApiError.conflict('Cannot delete the last Super Admin account');
    }
  }

  await User.findByIdAndDelete(id);

  return ApiResponse.noContent(res);
});
