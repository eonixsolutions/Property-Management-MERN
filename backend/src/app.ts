import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { corsOrigins, env } from './config/env';
import { requestLogger } from './middleware/requestLogger.middleware';
import { notFoundMiddleware } from './middleware/notFound.middleware';
import { errorMiddleware } from './middleware/error.middleware';
import { apiRouter } from './routes/index';

/**
 * Factory function that creates and configures the Express application.
 *
 * Exported as a function (not a singleton) so tests can call createApp()
 * to get a fresh instance without starting the HTTP server.
 *
 * Middleware registration order (matters in Express):
 *  1. Security headers (Helmet)
 *  2. CORS
 *  3. Rate limiting
 *  4. Body parsers
 *  5. Request logger
 *  6. Application routes
 *  7. 404 handler
 *  8. Centralized error handler  ← must be last
 */
export function createApp(): Application {
  const app = express();

  // ── 1. Security headers ──────────────────────────────────────────────────
  // Replicates PHP .htaccess security headers:
  //   X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy
  app.use(
    helmet({
      contentSecurityPolicy: env.NODE_ENV === 'production',
      crossOriginEmbedderPolicy: false,
    }),
  );

  // ── 2. CORS ──────────────────────────────────────────────────────────────
  app.use(
    cors({
      origin(origin, callback) {
        // Allow requests with no origin (curl, Postman, server-to-server)
        if (!origin) {
          callback(null, true);
          return;
        }
        if (corsOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`CORS policy: origin '${origin}' not allowed`));
        }
      },
      credentials: true, // Required for httpOnly cookie (refresh token)
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      exposedHeaders: ['X-Total-Count'],
    }),
  );

  // ── 3. Rate limiting ─────────────────────────────────────────────────────
  // General rate limit for all /api/* routes.
  // Auth routes get a tighter limit — applied separately in auth.routes.ts.
  app.use(
    '/api',
    rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      max: env.RATE_LIMIT_MAX_GENERAL,
      standardHeaders: true, // Return RateLimit-* headers (RFC 6585)
      legacyHeaders: false,
      message: {
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
        },
      },
      skip: (req) => req.path === '/health' || req.path === '/health/ping',
    }),
  );

  // ── 4. Body parsers + cookie parser ─────────────────────────────────────
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  // Parses Cookie header into req.cookies — required for the refresh token flow.
  // The refresh token is a self-signing JWT; we do not use cookie-parser signing
  // (COOKIE_SECRET) here because the JWT provides its own tamper-evidence.
  app.use(cookieParser());

  // ── 5. Request logger ────────────────────────────────────────────────────
  app.use(requestLogger);

  // ── 6. Static file serving (uploads) ────────────────────────────────────
  // Serve uploaded property images and documents.
  // In production this should be replaced with S3 signed URLs.
  app.use(
    '/uploads',
    express.static(env.UPLOAD_DEST, {
      maxAge: '7d',
      etag: true,
      // Never execute files — only serve static assets
      index: false,
    }),
  );

  // ── 7. Application routes ────────────────────────────────────────────────
  app.use('/api', apiRouter);

  // ── 8. 404 catch-all ─────────────────────────────────────────────────────
  app.use(notFoundMiddleware);

  // ── 9. Centralized error handler ─────────────────────────────────────────
  // Must be the last middleware registered.
  app.use(errorMiddleware);

  return app;
}
