import type { RequestHandler } from 'express';
import { verifyAccessToken } from '@utils/jwt';
import { ApiError } from '@utils/ApiError';

/**
 * Authentication middleware — verifies the JWT Bearer access token.
 *
 * Expects:  Authorization: Bearer <access_token>
 *
 * On success: attaches `req.user = { id, role }` and calls `next()`.
 * On failure: calls `next(ApiError)` with 401 status.
 *
 * Usage:
 *   router.get('/protected', authMiddleware, handler);
 *   router.use(authMiddleware);  // protect an entire router
 *
 * Note: refresh-token handling is NOT done here — it belongs in the
 * POST /api/auth/refresh route (Phase 1 Wave 2).
 */
export const authMiddleware: RequestHandler = (req, _res, next): void => {
  try {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Authentication required. Provide a Bearer token.');
    }

    // Slice off "Bearer " prefix (7 chars)
    const token = authHeader.slice(7).trim();

    if (!token) {
      throw ApiError.unauthorized('Bearer token is empty');
    }

    // verifyAccessToken throws ApiError on failure (expired or invalid)
    const payload = verifyAccessToken(token);

    // Attach the minimal user context — routes must not trust payload beyond this
    req.user = {
      id: payload.sub,
      role: payload.role,
    };

    next();
  } catch (err) {
    next(err);
  }
};
