import { useAuth } from '@context/AuthContext';
import { NotificationBell } from './NotificationBell';

const styles = {
  topBar: {
    height: '56px',
    backgroundColor: '#fff',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 1.5rem',
    gap: '1rem',
    flexShrink: 0,
  },
  title: {
    fontWeight: 600,
    fontSize: '1rem',
    color: '#1a1a2e',
  },
  userArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    fontSize: '0.875rem',
    color: '#555',
  },
  logoutBtn: {
    padding: '0.25rem 0.75rem',
    backgroundColor: '#f5f6fa',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.8rem',
    color: '#374151',
  },
};

export function TopBar() {
  const { user, logout } = useAuth();

  return (
    <header style={styles.topBar}>
      <div style={styles.title}>Property Management</div>
      <div style={styles.userArea}>
        {user ? (
          <>
            <NotificationBell />
            <span>{user.email ?? 'User'}</span>
            <span style={{ color: '#9ca3af' }}>({user.role})</span>
            <button style={styles.logoutBtn} onClick={() => void logout()}>
              Logout
            </button>
          </>
        ) : (
          <span>Not logged in</span>
        )}
      </div>
    </header>
  );
}
