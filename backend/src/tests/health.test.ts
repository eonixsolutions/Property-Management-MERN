import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';

/**
 * Health route integration test.
 *
 * Uses the createApp() factory — no actual server port bound, no real DB needed.
 * Mongoose connection is in 'disconnected' state (0) so the health endpoint
 * returns 503 "degraded" — which is the correct behaviour in an isolated test.
 */
const app = createApp();

describe('GET /api/health', () => {
  it('responds with valid health body', async () => {
    const res = await request(app).get('/api/health');

    // Status is either 200 (connected) or 503 (degraded — expected in test env)
    expect([200, 503]).toContain(res.status);
    expect(res.body).toMatchObject({
      timestamp: expect.any(String),
      uptime: expect.any(Number),
      environment: 'test',
      version: expect.any(String),
      services: {
        database: expect.stringMatching(/^(connected|disconnected|connecting)$/),
      },
    });
  });

  it('returns status "degraded" when database is not connected', async () => {
    const res = await request(app).get('/api/health');
    // In isolated test environment, Mongoose is not connected
    expect(res.body.services.database).not.toBe('connected');
    expect(res.body.status).toBe('degraded');
  });
});

describe('GET /api/health/ping', () => {
  it('returns 200 with pong', async () => {
    const res = await request(app).get('/api/health/ping');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      pong: true,
      ts: expect.any(Number),
    });
  });
});

describe('404 handler', () => {
  it('returns structured error for unknown routes', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: expect.stringContaining('not found'),
      },
    });
  });

  it('returns 404 for non-API routes', async () => {
    const res = await request(app).get('/random-path');
    expect(res.status).toBe(404);
  });
});
