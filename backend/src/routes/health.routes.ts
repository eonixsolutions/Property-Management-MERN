import { Router, Request, Response } from 'express';
import { getDBState } from '../config/database';
import { env } from '../config/env';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

/**
 * GET /api/health
 *
 * Public health check — no authentication required.
 * Used by Docker HEALTHCHECK, load balancers, and uptime monitors.
 *
 * Response 200 — system healthy:
 * {
 *   "status": "ok",
 *   "timestamp": "2026-02-22T10:00:00.000Z",
 *   "uptime": 3600.123,
 *   "environment": "production",
 *   "version": "1.0.0",
 *   "services": {
 *     "database": "connected"
 *   }
 * }
 *
 * Response 503 — system degraded (database disconnected):
 * {
 *   "status": "degraded",
 *   ...
 *   "services": {
 *     "database": "disconnected"
 *   }
 * }
 */
router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    const dbState = getDBState();
    const isHealthy = dbState === 'connected';

    const body = {
      status: isHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      environment: env.NODE_ENV,
      version: env.APP_VERSION,
      services: {
        database: dbState,
      },
    };

    res.status(isHealthy ? 200 : 503).json(body);
  }),
);

/**
 * GET /api/health/ping
 *
 * Lightweight liveness probe — just confirms the process is running.
 * Does not check database connectivity.
 * Useful for Kubernetes liveness probes (cheap, no DB required).
 */
router.get('/ping', (_req: Request, res: Response) => {
  res.status(200).json({ pong: true, ts: Date.now() });
});

export { router as healthRouter };
