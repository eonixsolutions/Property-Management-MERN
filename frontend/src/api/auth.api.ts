import axios from 'axios';
import { apiClient } from './axios';
import type { UserRole } from './auth.types';

/**
 * Typed API wrappers for the /api/auth endpoints.
 *
 * Notes:
 *  - authApi.refresh() uses a raw axios instance (not apiClient) to avoid
 *    re-triggering the response interceptor and causing an infinite loop.
 *  - All other calls use apiClient (which carries withCredentials + Bearer).
 */

// ── Shared types ─────────────────────────────────────────────────────────────

export interface AuthUserPayload {
  id: string;
  role: UserRole;
  email?: string; // present after login; absent when restored from refresh token
}

interface LoginResponse {
  accessToken: string;
  user: { id: string; email: string; role: UserRole };
}

interface RefreshResponse {
  accessToken: string;
}

// Raw axios instance used exclusively for the refresh call.
// Shares the same base URL and credentials flag, but bypasses all interceptors.
const rawAxios = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  timeout: 15_000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

// ── Auth API ──────────────────────────────────────────────────────────────────

export const authApi = {
  /**
   * POST /auth/login
   * Returns access token + user info. The httpOnly refresh token is set
   * automatically by the browser from the Set-Cookie response header.
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    const res = await apiClient.post<{ success: true; data: LoginResponse }>('/auth/login', {
      email,
      password,
    });
    return res.data.data;
  },

  /**
   * POST /auth/logout
   * Clears the httpOnly refresh token cookie server-side.
   * Fire-and-forget — failure is non-critical.
   */
  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  },

  /**
   * POST /auth/refresh  (uses rawAxios — bypasses interceptors)
   * Reads the httpOnly cookie and returns a new access token.
   * Also rotates the refresh token cookie.
   *
   * ⚠️  MUST use rawAxios here.  If apiClient were used, a 401 response
   *     from this endpoint would re-trigger the interceptor which calls
   *     this function again → infinite loop.
   */
  async refresh(): Promise<RefreshResponse> {
    const res = await rawAxios.post<{ success: true; data: RefreshResponse }>('/auth/refresh');
    return res.data.data;
  },

  /**
   * GET /auth/ping
   * Session keepalive. Returns { userId, role }.
   * Requires a valid access token (handled by request interceptor).
   */
  async ping(): Promise<{ userId: string; role: UserRole }> {
    const res = await apiClient.get<{ success: true; data: { userId: string; role: UserRole } }>(
      '/auth/ping',
    );
    return res.data.data;
  },
};
