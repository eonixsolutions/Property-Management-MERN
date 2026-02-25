import { NavLink } from 'react-router-dom';
import { useAuth } from '@context/AuthContext';
import type { UserRole } from '@api/auth.types';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  /** If set, only users with one of these roles will see this nav item. */
  roles?: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { path: '/properties', label: 'Properties', icon: '🏢' },
  { path: '/tenants', label: 'Tenants', icon: '👥' },
  { path: '/rent', label: 'Rent & Invoices', icon: '💳' },
  { path: '/transactions', label: 'Transactions', icon: '💰' },
  { path: '/owners', label: 'Owners', icon: '🔑' },
  { path: '/cheques', label: 'Cheques', icon: '📄' },
  { path: '/maintenance', label: 'Maintenance', icon: '🔧' },
  { path: '/documents', label: 'Documents', icon: '📁' },
  { path: '/contracts', label: 'Contracts', icon: '📝' },
  { path: '/accounting', label: 'Accounting', icon: '📊' },
  { path: '/reports', label: 'Reports', icon: '📈' },
  { path: '/notifications', label: 'Notifications', icon: '🔔' },
  { path: '/users', label: 'Users', icon: '👤', roles: ['SUPER_ADMIN', 'ADMIN'] },
  { path: '/settings', label: 'Settings', icon: '⚙️' },
];

const styles = {
  sidebar: {
    width: '240px',
    minHeight: '100vh',
    backgroundColor: '#1a1a2e',
    color: '#eee',
    display: 'flex' as const,
    flexDirection: 'column' as const,
    flexShrink: 0,
  },
  brand: {
    padding: '1.5rem 1rem',
    fontSize: '1.1rem',
    fontWeight: 700,
    borderBottom: '1px solid #333',
    color: '#fff',
  },
  nav: {
    flex: 1,
    padding: '0.5rem 0',
    overflowY: 'auto' as const,
  },
  link: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.6rem 1rem',
    color: '#ccc',
    textDecoration: 'none',
    fontSize: '0.875rem',
    transition: 'background 0.15s',
  },
};

export function Sidebar() {
  const { user } = useAuth();
  const role = user?.role;

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || (role && item.roles.includes(role)),
  );

  return (
    <aside style={styles.sidebar}>
      <div style={styles.brand}>Property Management</div>
      <nav style={styles.nav}>
        {visibleItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            style={({ isActive }) => ({
              ...styles.link,
              backgroundColor: isActive ? '#16213e' : 'transparent',
              color: isActive ? '#fff' : '#ccc',
              borderLeft: isActive ? '3px solid #4f8ef7' : '3px solid transparent',
            })}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
