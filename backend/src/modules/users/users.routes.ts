import { Router } from 'express';
import { authMiddleware } from '@middleware/auth.middleware';
import { isAdmin, isSuperAdmin } from '@middleware/role.middleware';
import { listUsers, createUser, updateUser, deleteUser } from './users.controller';

const router = Router();

// All /api/users routes require a valid access token
router.use(authMiddleware);

/**
 * GET /api/users
 * ADMIN & SUPER_ADMIN only. Returns a paginated list of all users.
 */
router.get('/', isAdmin, listUsers);

/**
 * POST /api/users
 * ADMIN & SUPER_ADMIN only. Creates a new user account.
 * Only SUPER_ADMIN can create SUPER_ADMIN accounts (enforced in controller).
 */
router.post('/', isAdmin, createUser);

/**
 * PUT /api/users/:id
 * ADMIN & SUPER_ADMIN only. Partially updates a user.
 * Only SUPER_ADMIN can change the role field (enforced in controller).
 */
router.put('/:id', isAdmin, updateUser);

/**
 * DELETE /api/users/:id
 * SUPER_ADMIN only. Hard-deletes a user account.
 * Cannot delete self or the last SUPER_ADMIN (enforced in controller).
 */
router.delete('/:id', isSuperAdmin, deleteUser);

export { router as usersRouter };
