import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { tokenStore } from '@api/tokenStore';
import { authApi } from '@api/auth.api';
import type { UserRole } from '@api/auth.types';

/**
 * AuthContext — Phase 1 implementation.
 *
 * Session lifecycle:
 *  1. On mount: attempt silent restore via POST /auth/refresh (reads httpOnly cookie).
 *     Decodes the new access token (base64) to extract id + role without a round-trip.
 *  2. login(token, user): called by LoginPage after a successful POST /auth/login.
 *     Stores token in tokenStore and user in React state.
 *  3. logout(): calls POST /auth/logout (clears cookie), then wipes local state.
 *  4. Axios interceptor calls tokenStore.triggerLogout() on REFRESH_TOKEN_INVALID,
 *     which invokes the callback registered in the useEffect below.
 *
 * Token storage:
 *  - Access token: tokenStore (module-level variable, memory-only, no localStorage)
 *  - Refresh token: httpOnly cookie managed entirely by the browser
 *
 * isAuthenticated: true only when BOTH accessToken AND user are non-null.
 *   (accessToken alone is not enough — user may be null during the restore window.)
 */

export interface AuthUser {
  id: string;
  role: UserRole;
  email?: string; // present after login; not available from JWT payload alone
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /**
   * Sync — called by LoginPage after a successful /auth/login response.
   * Stores the token in tokenStore and the user in React state.
   */
  login: (accessToken: string, user: AuthUser) => void;
  /** Async — calls /auth/logout then clears all local auth state. */
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ── JWT base64 decode (no library) ────────────────────────────────────────────

interface JwtPayload {
  sub: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const [, payloadB64] = token.split('.');
    if (!payloadB64) return null;
    // Fix base64url → base64 padding
    const padded = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(padded);
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true); // true until restore attempt completes

  // Stable reference — avoids re-registering the logout callback on every render
  const logoutRef = useRef<() => Promise<void>>();

  // ── logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(async (): Promise<void> => {
    // Fire-and-forget: even if the server call fails the client state is cleared
    try {
      await authApi.logout();
    } catch {
      // intentionally swallowed — we still clear local state
    } finally {
      tokenStore.clearToken();
      setUser(null);
    }
  }, []);

  // Keep the ref in sync so the tokenStore callback always calls the latest version
  logoutRef.current = logout;

  // ── login ──────────────────────────────────────────────────────────────────
  const login = useCallback((accessToken: string, authUser: AuthUser): void => {
    tokenStore.setToken(accessToken);
    setUser(authUser);
  }, []);

  // ── Session restore on mount ───────────────────────────────────────────────
  useEffect(() => {
    // Register the logout trigger so Axios interceptor can force a React logout
    tokenStore.onLogout(() => {
      void logoutRef.current?.();
    });

    let cancelled = false;

    async function restoreSession(): Promise<void> {
      try {
        const { accessToken } = await authApi.refresh();
        if (cancelled) return;

        const payload = decodeJwtPayload(accessToken);
        if (!payload) {
          // Malformed token — treat as logged out
          return;
        }

        tokenStore.setToken(accessToken);
        setUser({ id: payload.sub, role: payload.role });
      } catch {
        // No valid refresh token cookie — user is not logged in, which is fine
        tokenStore.clearToken();
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void restoreSession();

    return () => {
      cancelled = true;
    };
  }, []); // runs once on mount

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: user !== null && tokenStore.getToken() !== null,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}
