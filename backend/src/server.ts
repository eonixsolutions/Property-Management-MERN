/**
 * server.ts — HTTP server entry point.
 *
 * Responsibilities:
 *  1. Load and validate environment variables (via env.ts import)
 *  2. Connect to MongoDB
 *  3. Start cron jobs
 *  4. Create the Express app
 *  5. Start the HTTP server
 *  6. Register graceful shutdown handlers (SIGTERM, SIGINT)
 *
 * This file is intentionally kept minimal. All Express configuration
 * lives in app.ts so tests can import createApp() without starting
 * the HTTP server or opening a DB connection.
 */

import 'dotenv/config'; // Must be first — loads .env before any other import
import { env } from './config/env';
import { connectDB, disconnectDB } from './config/database';
import { createApp } from './app';
import { logger } from './utils/logger';
import { startInvoiceJobs } from './jobs/invoice.job';
import http from 'http';

async function bootstrap(): Promise<void> {
  // ── 1. Connect to MongoDB ─────────────────────────────────────────────────
  logger.info('Connecting to MongoDB...');
  await connectDB();

  // ── 2. Start cron jobs (after DB is ready) ───────────────────────────────
  startInvoiceJobs();

  // ── 3. Create Express application ────────────────────────────────────────
  const app = createApp();

  // ── 3. Start HTTP server ──────────────────────────────────────────────────
  const server = http.createServer(app);

  server.listen(env.PORT, () => {
    logger.info(
      {
        port: env.PORT,
        env: env.NODE_ENV,
        version: env.APP_VERSION,
      },
      `🚀 ${env.APP_NAME} running on port ${env.PORT}`,
    );
  });

  // ── 4. Graceful shutdown ──────────────────────────────────────────────────
  async function shutdown(signal: string): Promise<void> {
    logger.info({ signal }, 'Shutdown signal received — closing gracefully');

    // Stop accepting new connections
    server.close(async () => {
      logger.info('HTTP server closed');

      try {
        await disconnectDB();
        logger.info('Graceful shutdown complete');
        process.exit(0);
      } catch (err) {
        logger.error({ err }, 'Error during shutdown');
        process.exit(1);
      }
    });

    // Force exit if graceful shutdown takes too long (10s)
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000).unref();
  }

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  // ── 5. Unhandled rejection / exception safety nets ───────────────────────
  process.on('unhandledRejection', (reason: unknown) => {
    logger.error({ reason }, 'Unhandled promise rejection');
    // Do not exit — let the request fail via asyncHandler → errorMiddleware
  });

  process.on('uncaughtException', (err: Error) => {
    logger.fatal({ err }, 'Uncaught exception — shutting down');
    void shutdown('uncaughtException');
  });
}

bootstrap().catch((err: unknown) => {
  logger.fatal({ err }, 'Failed to start server');
  process.exit(1);
});
