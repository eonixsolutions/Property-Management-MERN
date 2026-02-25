import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { tokenStore } from './tokenStore';

/**
 * Axios instance pre-configured for the Property Management API.
 *
 * Request interceptor  → attaches Authorization: Bearer <accessToken>
 * Response interceptor → on 401 TOKEN_EXPIRED: silently refreshes, retries once
 *                        on 401 REFRESH_TOKEN_INVALID: forces logout
 *
 * Race-condition prevention:
 *   Multiple simultaneous 401s only trigger ONE refresh call.
 *   All other failing requests queue up and resolve when refresh completes.
 */

const baseURL = import.meta.env.VITE_API_URL ?? '/api';

export const apiClient = axios.create({
  baseURL,
  timeout: 30_000,
  withCredentials: true, // Sends httpOnly refresh-token cookie on every request
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ── Refresh race-condition state ───────────────────────────────────────────────

/** True while a refresh request is in flight. */
let isRefreshing = false;

/**
 * Callbacks for requests that arrived during an in-flight refresh.
 * Each callback resolves/rejects the queued request once the refresh settles.
 */
let pendingRequests: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function resolvePending(token: string): void {
  pendingRequests.forEach((cb) => cb.resolve(token));
  pendingRequests = [];
}

function rejectPending(err: unknown): void {
  pendingRequests.forEach((cb) => cb.reject(err));
  pendingRequests = [];
}

// ── Request interceptor ────────────────────────────────────────────────────────

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenStore.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

// ── Response interceptor ───────────────────────────────────────────────────────

/**
 * Extended request config that carries a `_retry` flag so we never attempt
 * more than one refresh per original request.
 */
interface RetryableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ error?: { code?: string } }>) => {
    const originalConfig = error.config as RetryableConfig | undefined;

    // Only intercept 401 responses that have a config (i.e. real HTTP errors)
    if (error.response?.status !== 401 || !originalConfig) {
      return Promise.reject(error);
    }

    const code = error.response.data?.error?.code;

    // ── REFRESH_TOKEN_INVALID → force logout, do NOT retry ─────────────────
    if (code === 'REFRESH_TOKEN_INVALID') {
      tokenStore.clearToken();
      tokenStore.triggerLogout();
      return Promise.reject(error);
    }

    // ── TOKEN_EXPIRED → attempt silent refresh ──────────────────────────────
    if (code !== 'TOKEN_EXPIRED') {
      // Other 401 codes (e.g. UNAUTHORIZED on protected resources) — pass through
      return Promise.reject(error);
    }

    // Already retried this request — do not retry again
    if (originalConfig._retry) {
      tokenStore.clearToken();
      tokenStore.triggerLogout();
      return Promise.reject(error);
    }

    // ── Queue if a refresh is already in flight ─────────────────────────────
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        pendingRequests.push({ resolve, reject });
      }).then((newToken) => {
        originalConfig.headers.Authorization = `Bearer ${newToken}`;
        originalConfig._retry = true;
        return apiClient(originalConfig);
      });
    }

    // ── This request triggers the refresh ──────────────────────────────────
    isRefreshing = true;
    originalConfig._retry = true;

    try {
      // Import lazily to avoid module initialisation cycle.
      // authApi.refresh() uses rawAxios — it will NOT re-enter this interceptor.
      const { authApi } = await import('./auth.api');
      const { accessToken } = await authApi.refresh();

      tokenStore.setToken(accessToken);
      resolvePending(accessToken);

      originalConfig.headers.Authorization = `Bearer ${accessToken}`;
      return apiClient(originalConfig);
    } catch (refreshErr) {
      tokenStore.clearToken();
      rejectPending(refreshErr);
      tokenStore.triggerLogout();
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  },
);

export default apiClient;
