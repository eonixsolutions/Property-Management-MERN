import type { RequestHandler } from 'express';
import { UserRole } from '@models/user.model';
import { ApiError } from '@utils/ApiError';

/**
 * Data scope middleware — injects a Mongoose query filter into `req.dataScope`.
 *
 * Must be used AFTER `authMiddleware` (which populates req.user).
 *
 * This mirrors the PHP system's data isolation pattern where admins see all
 * records while regular users (staff) see only records linked to their account.
 *
 * Scoping rules:
 *   SUPER_ADMIN  →  req.dataScope = {}            (no filter — see ALL data)
 *   ADMIN        →  req.dataScope = {}            (no filter — see ALL data)
 *   STAFF        →  req.dataScope = { userId: id } (own data only)
 *
 * Usage in route handlers:
 *   const invoices = await Invoice.find({ ...req.dataScope, status: 'pending' });
 *
 * Usage on a router:
 *   router.use(authMiddleware, dataScopeMiddleware);
 *   router.get('/invoices', listInvoicesHandler); // dataScope already injected
 */
export const dataScopeMiddleware: RequestHandler = (req, _res, next): void => {
  if (!req.user) {
    next(ApiError.unauthorized('Authentication required'));
    return;
  }

  const { role, id } = req.user;

  if (role === UserRole.SUPER_ADMIN || role === UserRole.ADMIN) {
    // Admins see everything — empty filter merges transparently into any query
    req.dataScope = {};
  } else {
    // Staff are scoped to records where userId matches their own id
    req.dataScope = { userId: id };
  }

  next();
};
