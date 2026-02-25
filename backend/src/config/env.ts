import { z } from 'zod';

/**
 * Centralized, Zod-validated environment configuration.
 *
 * All process.env access in the application must go through this module.
 * Any missing or invalid variable causes the process to exit on startup
 * rather than failing silently at runtime.
 */

const envSchema = z.object({
  // ── Runtime ───────────────────────────────────────────────────────────────
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),

  // ── Database ──────────────────────────────────────────────────────────────
  MONGODB_URI: z
    .string()
    .min(1, 'MONGODB_URI is required')
    .default('mongodb://127.0.0.1:27017/property_db'),

  MONGODB_MAX_POOL_SIZE: z.coerce.number().int().min(1).max(100).default(10),
  MONGODB_SERVER_SELECTION_TIMEOUT_MS: z.coerce.number().int().default(5000),
  MONGODB_SOCKET_TIMEOUT_MS: z.coerce.number().int().default(45000),

  // ── Auth / JWT ────────────────────────────────────────────────────────────
  /**
   * Must be a long random secret — min 32 chars.
   * Generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   */
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),

  /** Duration strings accepted by jsonwebtoken: '15m', '1h', '7d' */
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  /** Secret used to sign the refresh token httpOnly cookie */
  COOKIE_SECRET: z.string().min(32, 'COOKIE_SECRET must be at least 32 characters'),

  // ── CORS ──────────────────────────────────────────────────────────────────
  /**
   * Comma-separated list of allowed origins.
   * e.g. "http://localhost:5173,https://www.yourdomain.com"
   */
  CORS_ORIGINS: z.string().default('http://localhost:5173'),

  // ── Rate Limiting ─────────────────────────────────────────────────────────
  /** Time window in milliseconds for rate limiter (default: 15 min) */
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().default(900_000),
  /** Max requests per window per IP (default: 5 for auth routes) */
  RATE_LIMIT_MAX_AUTH: z.coerce.number().int().default(5),
  /** Max requests per window per IP for general routes */
  RATE_LIMIT_MAX_GENERAL: z.coerce.number().int().default(300),

  // ── File Uploads ──────────────────────────────────────────────────────────
  UPLOAD_DEST: z.string().default('uploads'),
  /** Maximum file size in bytes (default: 10 MB) */
  UPLOAD_MAX_FILE_SIZE: z.coerce
    .number()
    .int()
    .default(10 * 1024 * 1024),

  // ── AWS S3 (optional — only required when USE_S3=true) ───────────────────
  USE_S3: z
    .string()
    .transform((v) => v === 'true')
    .default('false'),
  AWS_REGION: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),

  // ── Logging ───────────────────────────────────────────────────────────────
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent']).default('info'),

  // ── Application ───────────────────────────────────────────────────────────
  APP_NAME: z.string().default('Property Management API'),
  APP_VERSION: z.string().default('1.0.0'),

  // ── Cron ─────────────────────────────────────────────────────────────────
  /** Cron schedule for recurring invoice generation. Default: 00:05 on 1st of each month */
  CRON_INVOICE_SCHEDULE: z.string().default('5 0 1 * *'),
});

/** Inferred TypeScript type for env — use this for typed access throughout the app */
export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  • ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    console.error('❌ Invalid environment variables:\n' + formatted);
    process.exit(1);
  }

  return result.data;
}

/** Validated, typed environment. Import this everywhere instead of process.env directly. */
export const env = validateEnv();

/** Derived helpers */
export const isDev = env.NODE_ENV === 'development';
export const isTest = env.NODE_ENV === 'test';
export const isProd = env.NODE_ENV === 'production';

/** Parsed CORS origins array */
export const corsOrigins = env.CORS_ORIGINS.split(',').map((o) => o.trim());
