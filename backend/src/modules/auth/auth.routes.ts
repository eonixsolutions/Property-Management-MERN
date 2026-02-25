import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '@config/env';
import { authMiddleware } from '@middleware/auth.middleware';
import { register, login, logout, refresh, ping } from './auth.controller';

const router = Router();

// ── Auth-specific rate limiter ─────────────────────────────────────────────
//
// Applied only to register and login — the endpoints most vulnerable to
// brute-force and credential-stuffing attacks.
//
// RATE_LIMIT_MAX_AUTH defaults to 5 requests per 15-minute window per IP.
// This is intentionally tight: a real user will not need to attempt login
// more than 5 times in 15 minutes.
const authRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_AUTH,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Count ALL requests, including successful ones
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many attempts. Please wait before trying again.',
    },
  },
});

// ── Routes ─────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 * Rate-limited. Creates a new STAFF account.
 */
router.post('/register', authRateLimiter, register);

/**
 * POST /api/auth/login
 * Rate-limited. Returns accessToken in body + refreshToken in httpOnly cookie.
 */
router.post('/login', authRateLimiter, login);

/**
 * POST /api/auth/logout
 * No auth required — clears the refresh token cookie.
 * A user with an expired access token must still be able to log out.
 */
router.post('/logout', logout);

/**
 * POST /api/auth/refresh
 * No authMiddleware — this is the endpoint for renewing an expired access token.
 * Reads the refresh token from the httpOnly cookie and issues a new access token.
 * Also rotates the refresh token to limit the reuse window.
 *
 * ⚠️  Frontend must NOT retry this endpoint on failure (infinite loop risk).
 *     On REFRESH_TOKEN_INVALID → clear local state and redirect to /login.
 */
router.post('/refresh', refresh);

/**
 * GET /api/auth/ping
 * Requires a valid access token. Used as a session keepalive and role-change detector.
 * Resets the frontend idle timer on success.
 */
router.get('/ping', authMiddleware, ping);

export { router as authRouter };
