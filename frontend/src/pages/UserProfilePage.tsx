import { useState, useEffect } from 'react';
import { useParams, useNavigate, Navigate, Link } from 'react-router-dom';
import { useAuth } from '@context/AuthContext';
import { usersApi } from '@api/users.api';
import type { UserProfile, UserProfileProperty, UserProfileTransaction } from '@api/users.api';
import type { UserRole } from '@api/auth.types';

// ── Styles ────────────────────────────────────────────────────────────────────

const s = {
  page: { padding: '1.5rem' },
  backLink: { fontSize: '0.85rem', color: '#4f8ef7', textDecoration: 'none', marginBottom: '1rem', display: 'inline-block' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' },
  title: { fontSize: '1.3rem', fontWeight: 700, color: '#1a1a2e' },
  editBtn: { padding: '0.45rem 1rem', backgroundColor: '#4f8ef7', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', textDecoration: 'none', display: 'inline-block' },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem', marginBottom: '1rem' },
  card: { backgroundColor: '#fff', borderRadius: '8px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' },
  cardTitle: { fontSize: '0.95rem', fontWeight: 700, color: '#1a1a2e', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid #f3f4f6' },
  infoRow: { display: 'flex', padding: '0.5rem 0', borderBottom: '1px solid #f9fafb', fontSize: '0.875rem' },
  infoLabel: { width: '150px', fontWeight: 600, color: '#374151', flexShrink: 0 },
  infoValue: { color: '#4b5563', flex: 1 },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem' },
  statBox: { textAlign: 'center' as const, padding: '1rem 0.5rem', backgroundColor: '#f8fafc', borderRadius: '8px' },
  statNum: { fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.3rem' },
  statLabel: { fontSize: '0.75rem', color: '#6b7280' },
  badge: { display: 'inline-block', padding: '0.15rem 0.5rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 600 },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  th: { textAlign: 'left' as const, padding: '0.6rem 0.75rem', fontSize: '0.72rem', fontWeight: 600, color: '#6b7280', backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
  td: { padding: '0.6rem 0.75rem', fontSize: '0.82rem', color: '#374151', borderBottom: '1px solid #f3f4f6' },
  permCard: { marginTop: '1rem', backgroundColor: '#fff', borderRadius: '8px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' },
  errorBanner: { backgroundColor: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', borderRadius: '4px', padding: '0.6rem 0.75rem', fontSize: '0.8rem', marginBottom: '1rem' },
} as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function roleBadgeStyle(role: UserRole): React.CSSProperties {
  const map: Record<UserRole, React.CSSProperties> = {
    SUPER_ADMIN: { backgroundColor: '#fef3c7', color: '#92400e' },
    ADMIN: { backgroundColor: '#ede9fe', color: '#5b21b6' },
    STAFF: { backgroundColor: '#f0fdf4', color: '#166534' },
  };
  return { ...s.badge, ...map[role] };
}

function statusBadgeStyle(status: string): React.CSSProperties {
  const map: Record<string, React.CSSProperties> = {
    ACTIVE: { backgroundColor: '#d1fae5', color: '#065f46' },
    SUSPENDED: { backgroundColor: '#fee2e2', color: '#991b1b' },
  };
  return { ...s.badge, ...(map[status] ?? { backgroundColor: '#f3f4f6', color: '#6b7280' }) };
}

function propStatusBadge(status: string): React.CSSProperties {
  const map: Record<string, React.CSSProperties> = {
    Occupied: { backgroundColor: '#d1fae5', color: '#065f46' },
    Vacant: { backgroundColor: '#dbeafe', color: '#1d4ed8' },
    'Under Maintenance': { backgroundColor: '#fef3c7', color: '#92400e' },
  };
  return { ...s.badge, ...(map[status] ?? { backgroundColor: '#f3f4f6', color: '#6b7280' }) };
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmt(n: number): string {
  return 'QAR ' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// Role permissions reference (mirrors PHP view.php)
const ROLE_PERMISSIONS: Record<string, string> = {
  SUPER_ADMIN: 'Full system access including user management, all CRUD operations, and system settings.',
  ADMIN: 'Can manage users (except Super Admins), properties, tenants, and all financial data.',
  STAFF: 'Scoped access to manage own properties, tenants, and transactions. Cannot access user management.',
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    void (async () => {
      try {
        const data = await usersApi.getById(id);
        setProfile(data);
      } catch {
        setError('Failed to load user profile. The user may not exist.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // Role guard — after all hooks (Rules of Hooks: no conditional hook calls above)
  if (currentUser?.role === 'STAFF') return <Navigate to="/dashboard" replace />;

  if (loading) {
    return <div style={{ padding: '2rem', color: '#6b7280' }}>Loading user profile…</div>;
  }

  if (error || !profile) {
    return (
      <div style={s.page}>
        <div style={s.errorBanner}>{error || 'User not found.'}</div>
        <Link to="/users" style={s.backLink}>← Back to Users</Link>
      </div>
    );
  }

  const { user, stats, recentProperties, recentTransactions } = profile;
  const isSelf = user._id === currentUser?.id;
  const canEdit = (currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN') && !isSelf;

  return (
    <div style={s.page}>
      <Link to="/users" style={s.backLink}>← Back to Users</Link>

      <div style={s.header}>
        <h1 style={s.title}>{user.fullName ?? (`${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email)}</h1>
        {canEdit && (
          <button style={s.editBtn} onClick={() => navigate('/users', { state: { editUserId: user._id } })}>
            Edit User
          </button>
        )}
      </div>

      <div style={s.grid2}>
        {/* User Information */}
        <div style={s.card}>
          <div style={s.cardTitle}>User Information</div>
          <div style={s.infoRow}>
            <span style={s.infoLabel}>Name</span>
            <span style={s.infoValue}>{user.fullName ?? (`${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || '—')}</span>
          </div>
          <div style={s.infoRow}>
            <span style={s.infoLabel}>Email</span>
            <span style={s.infoValue}>{user.email}</span>
          </div>
          <div style={s.infoRow}>
            <span style={s.infoLabel}>Phone</span>
            <span style={{ ...s.infoValue, color: user.phone ? '#4b5563' : '#9ca3af' }}>{user.phone ?? '—'}</span>
          </div>
          <div style={s.infoRow}>
            <span style={s.infoLabel}>Role</span>
            <span style={s.infoValue}>
              <span style={roleBadgeStyle(user.role)}>{user.role.replace('_', ' ')}</span>
            </span>
          </div>
          <div style={s.infoRow}>
            <span style={s.infoLabel}>Status</span>
            <span style={s.infoValue}>
              <span style={statusBadgeStyle(user.status)}>{user.status}</span>
            </span>
          </div>
          <div style={s.infoRow}>
            <span style={s.infoLabel}>Last Login</span>
            <span style={{ ...s.infoValue, color: user.lastLogin ? '#4b5563' : '#9ca3af' }}>
              {user.lastLogin ? fmtDateTime(user.lastLogin) : 'Never'}
            </span>
          </div>
          <div style={s.infoRow}>
            <span style={s.infoLabel}>Account Created</span>
            <span style={s.infoValue}>{fmtDateTime(user.createdAt)}</span>
          </div>
          <div style={{ ...s.infoRow, borderBottom: 'none' }}>
            <span style={s.infoLabel}>Last Updated</span>
            <span style={s.infoValue}>{fmtDateTime(user.updatedAt)}</span>
          </div>
        </div>

        {/* User Statistics */}
        <div style={s.card}>
          <div style={s.cardTitle}>Activity Statistics</div>
          <div style={s.statsGrid}>
            <div style={s.statBox}>
              <div style={{ ...s.statNum, color: '#4f46e5' }}>{stats.propertiesCount}</div>
              <div style={s.statLabel}>Properties</div>
            </div>
            <div style={s.statBox}>
              <div style={{ ...s.statNum, color: '#10b981' }}>{stats.tenantsCount}</div>
              <div style={s.statLabel}>Tenants</div>
            </div>
            <div style={s.statBox}>
              <div style={{ ...s.statNum, color: '#f59e0b' }}>{stats.transactionsCount}</div>
              <div style={s.statLabel}>Transactions</div>
            </div>
            <div style={{ ...s.statBox, gridColumn: 'span 1' }}>
              <div style={{ ...s.statNum, fontSize: '1rem', color: '#10b981' }}>{fmt(stats.incomeTotal)}</div>
              <div style={s.statLabel}>Total Income</div>
            </div>
            <div style={{ ...s.statBox, gridColumn: 'span 1' }}>
              <div style={{ ...s.statNum, fontSize: '1rem', color: '#ef4444' }}>{fmt(stats.expenseTotal)}</div>
              <div style={s.statLabel}>Total Expenses</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Properties */}
      {recentProperties.length > 0 && (
        <div style={{ ...s.card, marginBottom: '1rem' }}>
          <div style={{ ...s.cardTitle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Recent Properties</span>
            <Link to="/properties" style={{ fontSize: '0.8rem', color: '#4f8ef7', textDecoration: 'none' }}>View All</Link>
          </div>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Property Name</th>
                <th style={s.th}>Location</th>
                <th style={s.th}>Type</th>
                <th style={s.th}>Status</th>
                <th style={s.th}>Created</th>
              </tr>
            </thead>
            <tbody>
              {recentProperties.map((p: UserProfileProperty) => (
                <tr key={p._id}>
                  <td style={{ ...s.td, fontWeight: 600 }}>
                    <Link to={`/properties/${p._id}`} style={{ color: '#1d4ed8', textDecoration: 'none' }}>
                      {p.propertyName}
                    </Link>
                  </td>
                  <td style={{ ...s.td, color: '#6b7280' }}>
                    {[p.address, p.city].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td style={s.td}>{p.propertyType}</td>
                  <td style={s.td}>
                    <span style={propStatusBadge(p.status)}>{p.status}</span>
                  </td>
                  <td style={s.td}>{fmtDate(p.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Recent Transactions */}
      {recentTransactions.length > 0 && (
        <div style={{ ...s.card, marginBottom: '1rem' }}>
          <div style={{ ...s.cardTitle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Recent Transactions</span>
            <Link to="/transactions" style={{ fontSize: '0.8rem', color: '#4f8ef7', textDecoration: 'none' }}>View All</Link>
          </div>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Date</th>
                <th style={s.th}>Type</th>
                <th style={s.th}>Category</th>
                <th style={{ ...s.th, textAlign: 'right' }}>Amount</th>
                <th style={s.th}>Description</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.map((tx: UserProfileTransaction) => (
                <tr key={tx._id}>
                  <td style={s.td}>{fmtDate(tx.transactionDate)}</td>
                  <td style={s.td}>
                    <span style={{
                      ...s.badge,
                      ...(tx.type === 'Income'
                        ? { backgroundColor: '#d1fae5', color: '#065f46' }
                        : { backgroundColor: '#fee2e2', color: '#991b1b' }),
                    }}>
                      {tx.type}
                    </span>
                  </td>
                  <td style={s.td}>{tx.category}</td>
                  <td style={{ ...s.td, textAlign: 'right', fontWeight: 600, color: tx.type === 'Income' ? '#059669' : '#dc2626' }}>
                    {tx.type === 'Income' ? '+' : '-'}{fmt(tx.amount)}
                  </td>
                  <td style={{ ...s.td, color: '#6b7280' }}>{tx.description ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Role Permissions Reference */}
      <div style={s.permCard}>
        <div style={s.cardTitle}>Role Permissions</div>
        <table style={s.table}>
          <tbody>
            {Object.entries(ROLE_PERMISSIONS).map(([role, desc]) => (
              <tr key={role}>
                <td style={{ ...s.td, width: '160px', fontWeight: 600 }}>
                  <span style={roleBadgeStyle(role as UserRole)}>{role.replace('_', ' ')}</span>
                </td>
                <td style={{ ...s.td, color: '#6b7280' }}>{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
