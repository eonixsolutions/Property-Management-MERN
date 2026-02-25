import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { useAuth } from '@context/AuthContext';
import { useIdleTimer } from '@hooks/useIdleTimer';

const styles = {
  shell: {
    display: 'flex',
    minHeight: '100vh',
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    padding: '1.5rem',
    overflowY: 'auto' as const,
    backgroundColor: '#f5f6fa',
  },
  // Idle warning modal
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '2rem',
    width: '400px',
    maxWidth: '90vw',
    boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
  },
  modalTitle: {
    fontSize: '1.1rem',
    fontWeight: 700,
    color: '#1a1a2e',
    marginBottom: '0.75rem',
  },
  modalText: {
    fontSize: '0.875rem',
    color: '#374151',
    marginBottom: '1.5rem',
    lineHeight: 1.6,
  },
  modalActions: {
    display: 'flex',
    gap: '0.75rem',
    justifyContent: 'flex-end',
  },
  stayBtn: {
    padding: '0.55rem 1.1rem',
    backgroundColor: '#4f8ef7',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  logoutBtn: {
    padding: '0.55rem 1.1rem',
    backgroundColor: '#fff',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '0.875rem',
    cursor: 'pointer',
  },
};

/**
 * AppLayout — wraps all authenticated pages.
 *
 * Renders: Sidebar | TopBar / <Outlet>
 *
 * Idle timer:
 *   - 9 min of inactivity → shows "Session expiring" warning modal
 *   - 10 min of inactivity → auto-logout
 *   - Any user activity resets both timers
 *   - Timers are cleared when this component unmounts (i.e. on logout)
 */
export function AppLayout() {
  const { logout } = useAuth();
  const [showIdleWarning, setShowIdleWarning] = useState(false);

  const { reset } = useIdleTimer({
    onWarn: () => setShowIdleWarning(true),
    onLogout: () => {
      setShowIdleWarning(false);
      void logout();
    },
  });

  function handleStayLoggedIn() {
    setShowIdleWarning(false);
    reset();
  }

  function handleLogoutNow() {
    setShowIdleWarning(false);
    void logout();
  }

  return (
    <div style={styles.shell}>
      <Sidebar />
      <div style={styles.main}>
        <TopBar />
        <main style={styles.content}>
          <Outlet />
        </main>
      </div>

      {/* Idle timeout warning modal */}
      {showIdleWarning && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h2 style={styles.modalTitle}>Session Expiring Soon</h2>
            <p style={styles.modalText}>
              You have been inactive for 9 minutes. You will be automatically logged out in{' '}
              <strong>1 minute</strong> unless you choose to stay logged in.
            </p>
            <div style={styles.modalActions}>
              <button style={styles.logoutBtn} type="button" onClick={handleLogoutNow}>
                Log out now
              </button>
              <button style={styles.stayBtn} type="button" onClick={handleStayLoggedIn}>
                Stay logged in
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
