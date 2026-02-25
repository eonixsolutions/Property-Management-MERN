import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationsApi } from '@api/notifications.api';
import type { NotificationSummary } from '@api/notifications.api';

// ── Styles ────────────────────────────────────────────────────────────────────

const s = {
  page: { padding: '1.5rem' },
  title: { fontSize: '1.3rem', fontWeight: 700, color: '#1a1a2e', marginBottom: '1.5rem' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '1rem',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '1.25rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    border: '1px solid #e5e7eb',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  cardLabel: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#374151',
    flex: 1,
  },
  cardCount: {
    fontSize: '1.5rem',
    fontWeight: 700,
  },
  cardSub: {
    fontSize: '0.78rem',
    color: '#6b7280',
  },
  cardLink: {
    fontSize: '0.78rem',
    color: '#4f8ef7',
    fontWeight: 600,
    marginTop: '0.25rem',
  },
  dot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  loadingText: { color: '#6b7280', fontSize: '0.875rem' },
  errorBanner: {
    backgroundColor: '#fee2e2',
    border: '1px solid #fca5a5',
    color: '#991b1b',
    borderRadius: '4px',
    padding: '0.6rem 0.75rem',
    fontSize: '0.8rem',
    marginBottom: '1rem',
  },
  refreshRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '1.25rem',
  },
  refreshBtn: {
    padding: '0.35rem 0.85rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    fontSize: '0.8rem',
    color: '#374151',
  },
  lastUpdated: { fontSize: '0.78rem', color: '#9ca3af' },
} as const;

// ── Card config ───────────────────────────────────────────────────────────────

interface CardConfig {
  key: string;
  label: string;
  count: (s: NotificationSummary) => number;
  sub: (s: NotificationSummary) => string;
  dotColor: string;
  activeColor: string;
  link: string;
  linkLabel: string;
}

const CARDS: CardConfig[] = [
  {
    key: 'overdueRent',
    label: 'Overdue Rent Payments',
    count: (s) => s.overdueRent.count,
    sub: (s) =>
      s.overdueRent.totalAmount > 0
        ? `Total outstanding: ${s.overdueRent.totalAmount.toLocaleString()} QAR`
        : 'No outstanding overdue rent',
    dotColor: '#ef4444',
    activeColor: '#ef4444',
    link: '/rent-payments',
    linkLabel: 'View overdue payments →',
  },
  {
    key: 'rentDueSoon',
    label: 'Rent Due in Next 7 Days',
    count: (s) => s.rentDueSoon.count,
    sub: (s) =>
      s.rentDueSoon.count > 0
        ? `${s.rentDueSoon.count} payment${s.rentDueSoon.count !== 1 ? 's' : ''} due this week`
        : 'No upcoming rent due',
    dotColor: '#f59e0b',
    activeColor: '#f59e0b',
    link: '/rent-payments',
    linkLabel: 'View pending payments →',
  },
  {
    key: 'leasesExpiringSoon',
    label: 'Leases Expiring in 30 Days',
    count: (s) => s.leasesExpiringSoon.count,
    sub: (s) =>
      s.leasesExpiringSoon.count > 0
        ? `${s.leasesExpiringSoon.count} lease${s.leasesExpiringSoon.count !== 1 ? 's' : ''} expiring soon`
        : 'No leases expiring soon',
    dotColor: '#f97316',
    activeColor: '#f97316',
    link: '/tenants',
    linkLabel: 'View active tenants →',
  },
  {
    key: 'maintenancePending',
    label: 'Pending Maintenance',
    count: (s) => s.maintenancePending.count,
    sub: () => 'Open maintenance requests',
    dotColor: '#8b5cf6',
    activeColor: '#8b5cf6',
    link: '/maintenance',
    linkLabel: 'View maintenance →',
  },
  {
    key: 'tenantChequesUpcoming',
    label: 'Tenant Cheques Due',
    count: (s) => s.tenantChequesUpcoming.count,
    sub: () => 'Cheques to deposit this week',
    dotColor: '#06b6d4',
    activeColor: '#06b6d4',
    link: '/cheques',
    linkLabel: 'View cheques →',
  },
  {
    key: 'ownerChequesUpcoming',
    label: 'Owner Cheques Due',
    count: (s) => s.ownerChequesUpcoming.count,
    sub: () => 'Owner payments due this week',
    dotColor: '#10b981',
    activeColor: '#10b981',
    link: '/cheques',
    linkLabel: 'View cheques →',
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<NotificationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  async function fetchSummary() {
    setLoading(true);
    setError('');
    try {
      const data = await notificationsApi.get();
      setSummary(data);
      setLastUpdated(new Date());
    } catch {
      setError('Failed to load notifications. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchSummary();
  }, []);

  return (
    <div style={s.page}>
      <h1 style={s.title}>Notifications</h1>

      <div style={s.refreshRow}>
        <button
          style={s.refreshBtn}
          type="button"
          onClick={() => void fetchSummary()}
          disabled={loading}
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
        {lastUpdated && (
          <span style={s.lastUpdated}>
            Last updated:{' '}
            {lastUpdated.toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </span>
        )}
      </div>

      {error && <div style={s.errorBanner}>{error}</div>}

      {loading && !summary ? (
        <p style={s.loadingText}>Loading notifications…</p>
      ) : summary ? (
        <div style={s.grid}>
          {CARDS.map((card) => {
            const count = card.count(summary);
            const isActive = count > 0;
            return (
              <div
                key={card.key}
                style={{
                  ...s.card,
                  ...(isActive
                    ? {
                        borderLeftWidth: '4px',
                        borderLeftStyle: 'solid',
                        borderLeftColor: card.activeColor,
                      }
                    : {}),
                }}
                onClick={() => navigate(card.link)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && navigate(card.link)}
              >
                <div style={s.cardHeader}>
                  <span
                    style={{
                      ...s.dot,
                      backgroundColor: isActive ? card.dotColor : '#d1d5db',
                    }}
                  />
                  <span style={s.cardLabel}>{card.label}</span>
                </div>
                <div
                  style={{
                    ...s.cardCount,
                    color: isActive ? card.activeColor : '#9ca3af',
                  }}
                >
                  {count}
                </div>
                <div style={s.cardSub}>{card.sub(summary)}</div>
                {isActive && <div style={s.cardLink}>{card.linkLabel}</div>}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
