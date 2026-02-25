import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';

/**
 * 404 catch-all middleware.
 *
 * Registered after all routes in app.ts. Any request that falls through
 * without a matching route handler reaches here and is converted to a
 * structured ApiError so the response format stays consistent.
 */
export function notFoundMiddleware(req: Request, _res: Response, next: NextFunction): void {
  next(ApiError.notFound(`Route ${req.method} ${req.path}`));
}
