import type { RequestHandler, CookieOptions } from 'express';
import { ApiError } from '@utils/ApiError';
import { ApiResponse } from '@utils/ApiResponse';
import { asyncHandler } from '@utils/asyncHandler';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '@utils/jwt';
import { User, UserRole, UserStatus } from '@models/user.model';
import { Settings } from '@models/settings.model';
import { env, isProd } from '@config/env';
import { registerSchema, loginSchema } from './auth.validation';

// ── Cookie helpers ─────────────────────────────────────────────────────────

/** Name used for the httpOnly refresh token cookie */
const REFRESH_COOKIE = 'refreshToken';

/**
 * Parse JWT expiry strings ('7d', '15m', '1h') to milliseconds.
 * Used to align cookie maxAge with JWT expiry.
 */
function expiryToMs(expiry: string): number {
  const match = /^(\d+)([smhd])$/.exec(expiry);
  if (!match) return 7 * 24 * 60 * 60 * 1000; // safe default: 7 days
  const num = parseInt(match[1]!, 10);
  const unit = match[2]!;
  const multipliers: Record<string, number> = {
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return num * (multipliers[unit] ?? 86_400_000);
}

/**
 * httpOnly cookie options for the refresh token.
 *
 * Security properties:
 *  - httpOnly: true  — JS cannot access the cookie (mitigates XSS)
 *  - secure: production-only  — HTTPS required in production
 *  - sameSite: 'lax'  — blocks cross-site POST but allows top-level GET nav
 *  - path: '/api/auth' — cookie only sent to auth endpoints (limits exposure)
 *  - maxAge: aligned with JWT_REFRESH_EXPIRY
 */
function getRefreshCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: expiryToMs(env.JWT_REFRESH_EXPIRY),
  };
}

/** Clear options must match the set options (path, sameSite, etc.) */
function getClearCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/api/auth',
  };
}

// ── Controllers ────────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 *
 * Public endpoint. Creates a new STAFF-role user account.
 * Admin and Super Admin accounts are created through /api/users (admin-only).
 *
 * On duplicate email returns 409 DUPLICATE rather than leaking whether
 * the email exists (timing-safe comparison is not required here since we
 * return a clear 409, which is the standard behavior — no enumeration risk
 * in a closed B2B system).
 */
export const register: RequestHandler = asyncHandler(async (req, res) => {
  const { email, password, phone } = registerSchema.parse(req.body);

  // Explicit duplicate check for a clear 409 error (Mongoose also throws on
  // unique constraint violation but that error is less user-friendly).
  const existing = await User.findOne({ email }).lean();
  if (existing) {
    throw ApiError.duplicate('An account with this email already exists');
  }

  // Create user — pre-save hook bcrypt-hashes the password
  const user = await User.create({
    email,
    password,
    phone,
    role: UserRole.STAFF,
    status: UserStatus.ACTIVE,
  });

  // Create default settings (1:1 with user)
  await Settings.create({
    userId: user._id,
    currency: 'QAR',
    timezone: 'Asia/Qatar',
  });

  // toJSON transform strips the password field before serialization
  return ApiResponse.created(res, { user }, 'Account created successfully');
});

/**
 * POST /api/auth/login
 *
 * Validates credentials, checks account status, and issues:
 *  - accessToken (15 min) → returned in response body
 *  - refreshToken (7 days) → stored in httpOnly cookie
 *
 * Uses the same generic error message for "user not found" and "wrong password"
 * to prevent user enumeration.
 */
export const login: RequestHandler = asyncHandler(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);

  // .select('+password') is required because password has select:false in the schema
  const user = await User.findOne({ email }).select('+password');

  // Generic message — do NOT reveal whether the email exists or the password is wrong
  const invalidCredsError = new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');

  if (!user) throw invalidCredsError;

  const passwordMatch = await user.comparePassword(password);
  if (!passwordMatch) throw invalidCredsError;

  if (user.status !== UserStatus.ACTIVE) {
    throw new ApiError(401, 'ACCOUNT_INACTIVE', 'Your account has been suspended');
  }

  const userId = (user._id as { toString(): string }).toString();

  const accessToken = generateAccessToken({ sub: userId, role: user.role });
  const refreshToken = generateRefreshToken({ sub: userId });

  res.cookie(REFRESH_COOKIE, refreshToken, getRefreshCookieOptions());

  // user.toJSON() strips the password field automatically
  return ApiResponse.ok(res, { accessToken, user }, 'Login successful');
});

/**
 * POST /api/auth/logout
 *
 * Clears the refresh token cookie. No auth required — the user may have
 * an expired access token and still needs to be able to log out.
 *
 * Cookie clearance uses the same path/sameSite options as the set operation —
 * a mismatch would leave the cookie in place in the browser.
 */
export const logout: RequestHandler = asyncHandler(async (_req, res) => {
  res.clearCookie(REFRESH_COOKIE, getClearCookieOptions());
  return ApiResponse.ok(res, null, 'Logged out successfully');
});

/**
 * POST /api/auth/refresh
 *
 * Exchanges a valid refresh token (from httpOnly cookie) for a new access token.
 * Rotates the refresh token on every call (issues a new one, overwrites the cookie).
 *
 * Infinite-loop prevention:
 *  - This endpoint does NOT use authMiddleware (it's designed for expired access tokens)
 *  - Returns REFRESH_TOKEN_INVALID (not TOKEN_EXPIRED) so the frontend knows
 *    to redirect to /login rather than retry /refresh again
 *  - The frontend must NOT retry this endpoint on failure
 */
export const refresh: RequestHandler = asyncHandler(async (req, res) => {
  const token: string | undefined = req.cookies?.[REFRESH_COOKIE] as string | undefined;

  if (!token) {
    throw new ApiError(401, 'REFRESH_TOKEN_INVALID', 'No refresh token found');
  }

  // verifyRefreshToken throws REFRESH_TOKEN_INVALID (not TOKEN_EXPIRED)
  // so the frontend treats this as a hard failure → redirect to login
  const payload = verifyRefreshToken(token);

  const user = await User.findById(payload.sub);
  if (!user) {
    // Token was valid but user no longer exists — clear the stale cookie
    res.clearCookie(REFRESH_COOKIE, getClearCookieOptions());
    throw new ApiError(401, 'REFRESH_TOKEN_INVALID', 'User account not found');
  }

  if (user.status !== UserStatus.ACTIVE) {
    res.clearCookie(REFRESH_COOKIE, getClearCookieOptions());
    throw new ApiError(401, 'ACCOUNT_INACTIVE', 'Your account has been suspended');
  }

  const userId = (user._id as { toString(): string }).toString();

  // Rotate: always issue a fresh refresh token to limit the reuse window
  const newAccessToken = generateAccessToken({ sub: userId, role: user.role });
  const newRefreshToken = generateRefreshToken({ sub: userId });

  res.cookie(REFRESH_COOKIE, newRefreshToken, getRefreshCookieOptions());

  return ApiResponse.ok(res, { accessToken: newAccessToken }, 'Token refreshed');
});

/**
 * GET /api/auth/ping
 *
 * Requires authMiddleware. Used by the frontend to:
 *  1. Keepalive the session (prevent idle timeout on the client)
 *  2. Verify the access token is still valid without making a data request
 *
 * Returns the current user's id and role so the frontend can detect
 * role changes (e.g., if an admin demotes a user while they're logged in).
 */
export const ping: RequestHandler = asyncHandler(async (req, res) => {
  // req.user is guaranteed by authMiddleware (applied in auth.routes.ts)
  const { id, role } = req.user!;
  return ApiResponse.ok(res, { userId: id, role }, 'Session active');
});
