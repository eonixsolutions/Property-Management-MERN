import { Request, Response, NextFunction } from 'express';
import { Error as MongooseError } from 'mongoose';
import { MongoServerError } from 'mongodb';
import { ZodError } from 'zod';
import multer from 'multer';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger';
import { isProd, env } from '../config/env';

/**
 * Centralized Express error middleware.
 *
 * Must be registered LAST in app.ts (after all routes).
 * Signature must include all four parameters for Express to recognize it
 * as an error handler (even if `_next` is unused).
 *
 * Handled error types:
 *   ApiError          → operational errors thrown by the application
 *   ZodError          → request body validation failures
 *   multer.MulterError → file upload errors (LIMIT_FILE_SIZE, LIMIT_UNEXPECTED_FILE, etc.)
 *   CastError         → invalid MongoDB ObjectId in URL param
 *   ValidationError   → Mongoose model validation failure
 *   MongoServerError  → duplicate key (11000), connection errors
 *   Error             → unexpected / programming errors → 500
 */

export function errorMiddleware(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // ── 1. Already structured ApiError ──────────────────────────────────────
  if (err instanceof ApiError) {
    if (err.statusCode >= 500) {
      logger.error({ err, req: { method: req.method, url: req.url } }, err.message);
    } else {
      logger.warn({ code: err.code, url: req.url, status: err.statusCode }, err.message);
    }
    res.status(err.statusCode).json(err.toJSON());
    return;
  }

  // ── 2. Multer file upload errors ─────────────────────────────────────────
  if (err instanceof multer.MulterError) {
    const maxMb = Math.round(env.UPLOAD_MAX_FILE_SIZE / 1024 / 1024);
    const message =
      err.code === 'LIMIT_FILE_SIZE' ? `File too large. Maximum size is ${maxMb} MB` : err.message;
    const apiError = new ApiError(400, 'UPLOAD_ERROR', message);
    logger.warn({ code: err.code, url: req.url }, 'Multer upload error');
    res.status(400).json(apiError.toJSON());
    return;
  }

  // ── 3. Zod validation error (schema not caught by validate middleware) ───
  if (err instanceof ZodError) {
    const apiError = ApiError.fromZod(err);
    logger.warn({ fields: apiError.fields, url: req.url }, 'Validation failed');
    res.status(400).json(apiError.toJSON());
    return;
  }

  // ── 3. Mongoose CastError — invalid ObjectId ─────────────────────────────
  if (err instanceof MongooseError.CastError) {
    const apiError = ApiError.badRequest(
      `Invalid value for field '${err.path}': ${String(err.value)}`,
      [{ field: err.path, message: 'Must be a valid ID' }],
    );
    logger.warn({ err: err.message, url: req.url }, 'CastError — invalid ObjectId');
    res.status(400).json(apiError.toJSON());
    return;
  }

  // ── 4. Mongoose ValidationError ──────────────────────────────────────────
  if (err instanceof MongooseError.ValidationError) {
    const fields = Object.entries(err.errors).map(([field, e]) => ({
      field,
      message: e.message,
    }));
    const apiError = new ApiError(400, 'VALIDATION_ERROR', 'Model validation failed', fields);
    logger.warn({ fields, url: req.url }, 'Mongoose ValidationError');
    res.status(400).json(apiError.toJSON());
    return;
  }

  // ── 5. MongoDB duplicate key error ───────────────────────────────────────
  if (err instanceof MongoServerError && err.code === 11000) {
    const duplicatedField = Object.keys(err.keyPattern ?? {})[0] ?? 'field';
    const apiError = ApiError.duplicate(`A record with this ${duplicatedField} already exists`);
    logger.warn({ field: duplicatedField, url: req.url }, 'Duplicate key error');
    res.status(409).json(apiError.toJSON());
    return;
  }

  // ── 6. Unknown / programming errors → 500 ────────────────────────────────
  const message = err instanceof Error ? err.message : 'An unexpected error occurred';

  logger.error(
    {
      err,
      req: { method: req.method, url: req.url, body: req.body },
    },
    'Unhandled error',
  );

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      // Never expose internal error details in production
      message: isProd ? 'An unexpected error occurred' : message,
      ...(isProd ? {} : { stack: err instanceof Error ? err.stack : undefined }),
    },
  });
}
