import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationsApi } from '@api/notifications.api';
import type { NotificationSummary } from '@api/notifications.api';

// Poll interval in ms (60 seconds to match backend cache TTL)
const POLL_INTERVAL_MS = 60_000;

// ── Styles ────────────────────────────────────────────────────────────────────

const s = {
  wrapper: {
    position: 'relative' as const,
  },
  bellBtn: {
    position: 'relative' as const,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '0.35rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    color: '#6b7280',
  },
  bellIcon: {
    width: '20px',
    height: '20px',
  },
  badge: {
    position: 'absolute' as const,
    top: '0',
    right: '0',
    minWidth: '16px',
    height: '16px',
    backgroundColor: '#ef4444',
    color: '#fff',
    borderRadius: '999px',
    fontSize: '0.65rem',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 3px',
    lineHeight: 1,
    pointerEvents: 'none' as const,
  },
  dropdown: {
    position: 'absolute' as const,
    top: 'calc(100% + 8px)',
    right: 0,
    width: '320px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    border: '1px solid #e5e7eb',
    zIndex: 200,
    overflow: 'hidden',
  },
  dropdownHeader: {
    padding: '0.75rem 1rem',
    borderBottom: '1px solid #f3f4f6',
    fontSize: '0.8rem',
    fontWeight: 700,
    color: '#6b7280',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewAllLink: {
    fontSize: '0.75rem',
    color: '#4f8ef7',
    cursor: 'pointer',
    fontWeight: 600,
    textTransform: 'none' as const,
    letterSpacing: 'normal',
    background: 'none',
    border: 'none',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem 1rem',
    cursor: 'pointer',
    borderBottom: '1px solid #f9fafb',
    transition: 'background 0.1s',
  },
  itemActive: {
    backgroundColor: '#fef9c3',
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  itemText: {
    fontSize: '0.825rem',
    color: '#374151',
    flex: 1,
  },
  itemCount: {
    fontSize: '0.8rem',
    fontWeight: 700,
    color: '#374151',
    backgroundColor: '#f3f4f6',
    borderRadius: '999px',
    padding: '0.1rem 0.5rem',
    flexShrink: 0,
  },
  emptyState: {
    padding: '1.5rem 1rem',
    textAlign: 'center' as const,
    fontSize: '0.825rem',
    color: '#9ca3af',
  },
} as const;

// ── Notification items definition ─────────────────────────────────────────────

interface NotifItem {
  key: string;
  label: (s: NotificationSummary) => string;
  count: (s: NotificationSummary) => number;
  dotColor: string;
  link: string;
}

const NOTIF_ITEMS: NotifItem[] = [
  {
    key: 'overdueRent',
    label: (s) =>
      s.overdueRent.totalAmount > 0
        ? `Overdue rent — ${s.overdueRent.totalAmount.toLocaleString()} QAR`
        : 'Overdue rent payments',
    count: (s) => s.overdueRent.count,
    dotColor: '#ef4444',
    link: '/rent-payments?status=Overdue',
  },
  {
    key: 'rentDueSoon',
    label: () => 'Rent due in next 7 days',
    count: (s) => s.rentDueSoon.count,
    dotColor: '#f59e0b',
    link: '/rent-payments?status=Pending',
  },
  {
    key: 'leasesExpiringSoon',
    label: () => 'Leases expiring in 30 days',
    count: (s) => s.leasesExpiringSoon.count,
    dotColor: '#f97316',
    link: '/tenants?status=Active',
  },
  {
    key: 'maintenancePending',
    label: () => 'Pending maintenance requests',
    count: (s) => s.maintenancePending.count,
    dotColor: '#8b5cf6',
    link: '/maintenance',
  },
  {
    key: 'tenantChequesUpcoming',
    label: () => 'Tenant cheques due this week',
    count: (s) => s.tenantChequesUpcoming.count,
    dotColor: '#06b6d4',
    link: '/cheques',
  },
  {
    key: 'ownerChequesUpcoming',
    label: () => 'Owner cheques due this week',
    count: (s) => s.ownerChequesUpcoming.count,
    dotColor: '#10b981',
    link: '/cheques',
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function NotificationBell() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<NotificationSummary | null>(null);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const fetchSummary = useCallback(async () => {
    try {
      const data = await notificationsApi.get();
      setSummary(data);
    } catch {
      // Silently fail — notifications are non-critical
    }
  }, []);

  // Initial fetch + polling every 60s
  useEffect(() => {
    void fetchSummary();
    const interval = setInterval(() => void fetchSummary(), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchSummary]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const totalCount = summary?.totalCount ?? 0;
  const activeItems = NOTIF_ITEMS.filter((item) => summary && item.count(summary) > 0);

  function handleItemClick(link: string) {
    setOpen(false);
    // Navigate respecting query strings
    navigate(link);
  }

  return (
    <div style={s.wrapper} ref={wrapperRef}>
      {/* Bell button */}
      <button
        style={s.bellBtn}
        type="button"
        aria-label={`Notifications${totalCount > 0 ? ` (${totalCount})` : ''}`}
        onClick={() => setOpen((prev) => !prev)}
        title="Notifications"
      >
        {/* Bell SVG */}
        <svg
          style={s.bellIcon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {/* Badge */}
        {totalCount > 0 && (
          <span style={s.badge}>{totalCount > 99 ? '99+' : totalCount}</span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={s.dropdown}>
          <div style={s.dropdownHeader}>
            <span>Notifications</span>
            <button
              style={s.viewAllLink}
              type="button"
              onClick={() => {
                setOpen(false);
                navigate('/notifications');
              }}
            >
              View all
            </button>
          </div>

          {activeItems.length === 0 ? (
            <div style={s.emptyState}>No active notifications</div>
          ) : (
            activeItems.map((item) => {
              const count = summary ? item.count(summary) : 0;
              return (
                <div
                  key={item.key}
                  style={{ ...s.item, ...s.itemActive }}
                  onClick={() => handleItemClick(item.link)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleItemClick(item.link)}
                >
                  <span style={{ ...s.dot, backgroundColor: item.dotColor }} />
                  <span style={s.itemText}>{summary ? item.label(summary) : ''}</span>
                  <span style={s.itemCount}>{count}</span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
