import { useEffect, useRef, useCallback } from 'react';

interface UseIdleTimerOptions {
  /** Called at `warnMs` ms of inactivity. Show a "you will be logged out" warning. */
  onWarn: () => void;
  /** Called at `logoutMs` ms of inactivity. Perform the actual logout. */
  onLogout: () => void;
  /** Milliseconds of inactivity before showing the warning. Default: 9 minutes. */
  warnMs?: number;
  /** Milliseconds of inactivity before forcing logout. Default: 10 minutes. */
  logoutMs?: number;
}

interface UseIdleTimerReturn {
  /** Reset both timers — call this when the user dismisses the warning modal. */
  reset: () => void;
}

const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'] as const;

const DEFAULT_WARN_MS = 9 * 60 * 1000; // 9 minutes
const DEFAULT_LOGOUT_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Idle timer hook.
 *
 * Tracks user activity on the window. After `warnMs` of inactivity it calls
 * `onWarn` (typically shows a modal). After `logoutMs` it calls `onLogout`.
 *
 * Any user activity resets both timers.
 *
 * Timers are cleared automatically when the component that uses this hook
 * unmounts (e.g. when the user logs out and AppLayout is torn down).
 *
 * Design notes:
 *  - Uses refs for timer IDs to avoid triggering re-renders on every reset.
 *  - `onWarn` and `onLogout` are captured in refs so changing them (e.g.
 *    because `logout` is a new function reference) does not re-subscribe
 *    the event listeners.
 *  - Does NOT interfere with the Axios token-refresh logic — those are
 *    separate mechanisms operating on different timescales.
 */
export function useIdleTimer({
  onWarn,
  onLogout,
  warnMs = DEFAULT_WARN_MS,
  logoutMs = DEFAULT_LOGOUT_MS,
}: UseIdleTimerOptions): UseIdleTimerReturn {
  const warnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep callbacks in refs so event listeners don't need to re-subscribe
  // when the parent component re-renders with new function references.
  const onWarnRef = useRef(onWarn);
  const onLogoutRef = useRef(onLogout);
  onWarnRef.current = onWarn;
  onLogoutRef.current = onLogout;

  const clearTimers = useCallback(() => {
    if (warnTimerRef.current !== null) {
      clearTimeout(warnTimerRef.current);
      warnTimerRef.current = null;
    }
    if (logoutTimerRef.current !== null) {
      clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }
  }, []);

  const startTimers = useCallback(() => {
    clearTimers();

    warnTimerRef.current = setTimeout(() => {
      onWarnRef.current();
    }, warnMs);

    logoutTimerRef.current = setTimeout(() => {
      onLogoutRef.current();
    }, logoutMs);
  }, [clearTimers, warnMs, logoutMs]);

  // `reset` is the public API — called by "Stay logged in" button
  const reset = useCallback(() => {
    startTimers();
  }, [startTimers]);

  useEffect(() => {
    // Start timers on mount
    startTimers();

    // Handler that resets timers on any user activity
    const handleActivity = () => {
      startTimers();
    };

    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      // Clear timers and remove listeners when the component unmounts
      clearTimers();
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [startTimers, clearTimers]);

  return { reset };
}
