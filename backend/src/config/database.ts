import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../utils/logger';

/**
 * MongoDB connection manager.
 *
 * Mirrors the PHP config/database.php connection-reuse pattern but
 * uses Mongoose's built-in connection pool instead of a manual singleton.
 *
 * Connection lifecycle:
 *  - connectDB() on server startup
 *  - Mongoose handles reconnection automatically
 *  - Graceful disconnect via SIGTERM / SIGINT handlers (registered in server.ts)
 */

mongoose.set('strictQuery', true);

/** Mongoose event handlers — wired once at module level */
function registerMongooseEvents(): void {
  mongoose.connection.on('connected', () => {
    logger.info({ uri: sanitizeUri(env.MONGODB_URI) }, 'MongoDB connected');
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });

  mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB reconnected');
  });

  mongoose.connection.on('error', (err: Error) => {
    logger.error({ err }, 'MongoDB connection error');
  });
}

let eventsRegistered = false;

/**
 * Establish the Mongoose connection. Call once in server.ts before starting Express.
 * Idempotent — safe to call multiple times (no-op if already connected).
 */
export async function connectDB(): Promise<void> {
  if (mongoose.connection.readyState === 1) {
    logger.debug('MongoDB already connected — skipping');
    return;
  }

  if (!eventsRegistered) {
    registerMongooseEvents();
    eventsRegistered = true;
  }

  await mongoose.connect(env.MONGODB_URI, {
    maxPoolSize: env.MONGODB_MAX_POOL_SIZE,
    serverSelectionTimeoutMS: env.MONGODB_SERVER_SELECTION_TIMEOUT_MS,
    socketTimeoutMS: env.MONGODB_SOCKET_TIMEOUT_MS,
    // Enforce UTF-8 (matches PHP: $conn->set_charset("utf8mb4"))
    family: 4,
  });
}

/**
 * Gracefully close the Mongoose connection.
 * Called by SIGTERM/SIGINT handlers in server.ts.
 */
export async function disconnectDB(): Promise<void> {
  if (mongoose.connection.readyState === 0) {
    return;
  }
  await mongoose.connection.close();
  logger.info('MongoDB connection closed');
}

/**
 * Returns the current connection state as a human-readable string.
 * Used by the health check route.
 */
export function getDBState(): 'connected' | 'disconnected' | 'connecting' | 'disconnecting' {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  } as const;
  return states[mongoose.connection.readyState as keyof typeof states] ?? 'disconnected';
}

/** Strip credentials from URI for safe logging */
function sanitizeUri(uri: string): string {
  try {
    const url = new URL(uri);
    url.password = '***';
    return url.toString();
  } catch {
    return uri.replace(/:\/\/[^@]+@/, '://***@');
  }
}
