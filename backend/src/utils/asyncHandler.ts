import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wraps an async route handler so that any rejected promise or thrown error
 * is forwarded to Express's next(err) — which triggers the centralized
 * error middleware — instead of causing an unhandled promise rejection.
 *
 * Without this wrapper every async handler would need:
 *   router.get('/path', async (req, res, next) => {
 *     try { ... } catch (err) { next(err); }
 *   });
 *
 * With this wrapper:
 *   router.get('/path', asyncHandler(async (req, res) => {
 *     ...  // throw freely; errors propagate to errorMiddleware
 *   }));
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
