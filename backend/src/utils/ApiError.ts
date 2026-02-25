import { ZodError } from 'zod';

/**
 * Standardized error codes used across the entire API.
 * These are returned in { error.code } of every error response.
 *
 * Frontend can switch on these codes to show appropriate messages
 * without parsing human-readable strings.
 */
export type ApiErrorCode =
  // ── Auth ─────────────────────────────────────────────────────────────────
  | 'UNAUTHORIZED' // No token / token missing
  | 'FORBIDDEN' // Valid token but insufficient role/scope
  | 'TOKEN_EXPIRED' // Access token has expired
  | 'REFRESH_TOKEN_INVALID' // Refresh token invalid or revoked
  | 'INVALID_CREDENTIALS' // Wrong email or password
  | 'ACCOUNT_INACTIVE' // User account is Inactive or Suspended

  // ── Validation ───────────────────────────────────────────────────────────
  | 'VALIDATION_ERROR' // Zod / body schema validation failed
  | 'INVALID_ID' // Malformed ObjectId in URL param

  // ── Resources ────────────────────────────────────────────────────────────
  | 'NOT_FOUND' // Resource does not exist
  | 'DUPLICATE' // Unique constraint violated (e.g. email)
  | 'CONFLICT' // Business rule conflict

  // ── Rate limiting ─────────────────────────────────────────────────────────
  | 'RATE_LIMIT_EXCEEDED'

  // ── Server ───────────────────────────────────────────────────────────────
  | 'INTERNAL_ERROR'
  | 'DB_ERROR'
  | 'UPLOAD_ERROR';

/**
 * Structured field-level validation error.
 * Returned inside { error.fields } when code === 'VALIDATION_ERROR'.
 */
export interface FieldError {
  field: string;
  message: string;
}

/**
 * Custom operational error class.
 *
 * Throw this anywhere in controllers/services to produce a consistent
 * HTTP error response. The centralized error middleware handles it.
 *
 * Examples:
 *   throw ApiError.notFound('Property not found');
 *   throw ApiError.forbidden('Insufficient permissions');
 *   throw new ApiError(409, 'DUPLICATE', 'Email already registered');
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: ApiErrorCode;
  public readonly fields?: FieldError[];
  public readonly isOperational: boolean;

  constructor(statusCode: number, code: ApiErrorCode, message: string, fields?: FieldError[]) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.fields = fields;
    this.isOperational = true;

    // Maintains proper stack trace in V8
    Error.captureStackTrace(this, this.constructor);
  }

  // ── Static factory methods ─────────────────────────────────────────────

  static badRequest(message: string, fields?: FieldError[]): ApiError {
    return new ApiError(400, 'VALIDATION_ERROR', message, fields);
  }

  static unauthorized(message = 'Authentication required'): ApiError {
    return new ApiError(401, 'UNAUTHORIZED', message);
  }

  static tokenExpired(message = 'Access token has expired'): ApiError {
    return new ApiError(401, 'TOKEN_EXPIRED', message);
  }

  static forbidden(message = 'You do not have permission to perform this action'): ApiError {
    return new ApiError(403, 'FORBIDDEN', message);
  }

  static notFound(resource = 'Resource'): ApiError {
    return new ApiError(404, 'NOT_FOUND', `${resource} not found`);
  }

  static duplicate(message: string): ApiError {
    return new ApiError(409, 'DUPLICATE', message);
  }

  static conflict(message: string): ApiError {
    return new ApiError(409, 'CONFLICT', message);
  }

  static rateLimited(message = 'Too many requests. Please try again later.'): ApiError {
    return new ApiError(429, 'RATE_LIMIT_EXCEEDED', message);
  }

  static internal(message = 'An unexpected error occurred'): ApiError {
    return new ApiError(500, 'INTERNAL_ERROR', message);
  }

  // ── Conversion helpers ──────────────────────────────────────────────────

  /**
   * Convert a ZodError into an ApiError with field-level details.
   * Called by the validation middleware.
   */
  static fromZod(zodError: ZodError): ApiError {
    const fields: FieldError[] = zodError.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    return new ApiError(400, 'VALIDATION_ERROR', 'Validation failed', fields);
  }

  /** Serializes to the standard error response shape */
  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        ...(this.fields && this.fields.length > 0 ? { fields: this.fields } : {}),
      },
    };
  }
}
