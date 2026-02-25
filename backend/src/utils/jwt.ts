import jwt, { TokenExpiredError, JsonWebTokenError } from 'jsonwebtoken';
import { env } from '@config/env';
import type { UserRole } from '@models/user.model';
import { ApiError } from '@utils/ApiError';

// ── Token payload shapes ────────────────────────────────────────────────────

/**
 * Access token payload (short-lived, 15 min).
 *
 * Role is embedded so routes can check permissions without a DB lookup.
 * `sub` is the User._id as a string (standard JWT "subject" claim).
 */
export interface JwtAccessPayload {
  sub: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

/**
 * Refresh token payload (long-lived, 7 days).
 *
 * Does NOT embed the role — role is fetched from DB during the refresh
 * endpoint to always reflect the current stored role (in case it changed).
 */
export interface JwtRefreshPayload {
  sub: string;
  iat?: number;
  exp?: number;
}

// ── Token generation ────────────────────────────────────────────────────────

/**
 * Issue a short-lived access token.
 *
 * @param payload - Must include at minimum `sub` (user id) and `role`
 */
export function generateAccessToken(payload: JwtAccessPayload): string {
  const { sub, role } = payload;
  return jwt.sign({ sub, role }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRY,
  } as jwt.SignOptions);
}

/**
 * Issue a long-lived refresh token.
 *
 * The refresh token is stored in an httpOnly cookie — it is never sent
 * in the Authorization header. Used only by POST /api/auth/refresh.
 *
 * @param payload - Must include `sub` (user id)
 */
export function generateRefreshToken(payload: JwtRefreshPayload): string {
  const { sub } = payload;
  return jwt.sign({ sub }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRY,
  } as jwt.SignOptions);
}

// ── Token verification ──────────────────────────────────────────────────────

/**
 * Verify and decode an access token.
 *
 * Throws:
 *  - `ApiError.tokenExpired()` (401, TOKEN_EXPIRED)  when the token is expired
 *    → the frontend should use this code to trigger a silent refresh
 *  - `ApiError.unauthorized()` (401, UNAUTHORIZED) for any other failure
 *    (tampered signature, malformed token, wrong secret)
 */
export function verifyAccessToken(token: string): JwtAccessPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
    if (typeof decoded === 'string') {
      throw new JsonWebTokenError('Unexpected string payload');
    }
    return decoded as JwtAccessPayload;
  } catch (err) {
    if (err instanceof TokenExpiredError) {
      throw ApiError.tokenExpired();
    }
    if (err instanceof ApiError) {
      throw err;
    }
    throw ApiError.unauthorized('Invalid access token');
  }
}

/**
 * Verify and decode a refresh token.
 *
 * Throws `ApiError` with code `REFRESH_TOKEN_INVALID` on any failure.
 * This allows the frontend to distinguish refresh failures (force logout)
 * from access-token expiry (retry with refresh).
 */
export function verifyRefreshToken(token: string): JwtRefreshPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET);
    if (typeof decoded === 'string') {
      throw new JsonWebTokenError('Unexpected string payload');
    }
    return decoded as JwtRefreshPayload;
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(401, 'REFRESH_TOKEN_INVALID', 'Refresh token is invalid or has expired');
  }
}
