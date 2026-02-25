/**
 * In-memory access token store.
 *
 * Bridges the gap between the Axios interceptor (which needs the token
 * synchronously) and the React AuthContext (which owns auth state).
 *
 * Why NOT use React state or localStorage:
 *  - React state is async and inaccessible outside components/hooks.
 *  - localStorage persists across tabs/restarts and is readable by XSS.
 *  - Module-level variable lives only for the browser session and is
 *    accessible from anywhere without hooks.
 *
 * The AuthContext registers a logout callback here so the Axios
 * interceptor can trigger a full React logout without importing
 * AuthContext (which would create a circular dependency).
 */

let _token: string | null = null;
let _logoutCallback: (() => void) | null = null;

export const tokenStore = {
  /** Read the current access token (null if not authenticated). */
  getToken(): string | null {
    return _token;
  },

  /** Store a new access token after login or refresh. */
  setToken(token: string): void {
    _token = token;
  },

  /** Clear the access token on logout or refresh failure. */
  clearToken(): void {
    _token = null;
  },

  /**
   * Register the AuthContext logout function.
   * Called once during AuthProvider mount.
   * Replaces any previously registered callback.
   */
  onLogout(callback: () => void): void {
    _logoutCallback = callback;
  },

  /**
   * Trigger the registered logout callback.
   * Called by the Axios interceptor when the refresh token is invalid.
   * Safe to call even if no callback is registered yet.
   */
  triggerLogout(): void {
    _logoutCallback?.();
  },
};
