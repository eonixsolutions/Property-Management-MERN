import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '@context/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * Wraps protected routes.
 *
 * - While auth is being restored (isLoading), renders nothing (or a spinner).
 * - If not authenticated, redirects to /login, preserving the original path
 *   so the user can be sent back after login.
 * - Phase 0: isAuthenticated is always false, so every route redirects to /login.
 *   This will work correctly once Phase 1 auth is wired up.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading…</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
