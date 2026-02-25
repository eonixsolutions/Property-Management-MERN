import type { RequestHandler } from 'express';
import { UserRole } from '@models/user.model';
import { ApiError } from '@utils/ApiError';

/**
 * Role-based access control middleware factory.
 *
 * Must be used AFTER `authMiddleware` (which populates req.user).
 *
 * Usage:
 *   // Allow admin and super-admin only
 *   router.delete('/users/:id', authMiddleware, isAdmin, handler);
 *
 *   // Allow any authenticated user with one of the given roles
 *   router.post('/reports', authMiddleware, requireRole('ADMIN', 'SUPER_ADMIN'), handler);
 */

/**
 * Returns a middleware that allows only users with one of the specified roles.
 *
 * @param roles - One or more `UserRole` values that are permitted
 */
export function requireRole(...roles: UserRole[]): RequestHandler {
  return (req, _res, next): void => {
    if (!req.user) {
      // authMiddleware should always run before this, but guard defensively
      next(ApiError.unauthorized('Authentication required'));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(
        ApiError.forbidden(`This action requires one of the following roles: ${roles.join(', ')}`),
      );
      return;
    }

    next();
  };
}

/**
 * Shorthand: allows ADMIN and SUPER_ADMIN.
 *
 * Example: router.get('/users', authMiddleware, isAdmin, listUsersHandler);
 */
export const isAdmin: RequestHandler = requireRole(UserRole.ADMIN, UserRole.SUPER_ADMIN);

/**
 * Shorthand: allows SUPER_ADMIN only.
 *
 * Example: router.delete('/users/:id', authMiddleware, isSuperAdmin, deleteUserHandler);
 */
export const isSuperAdmin: RequestHandler = requireRole(UserRole.SUPER_ADMIN);
