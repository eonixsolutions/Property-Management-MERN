import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi } from '@api/dashboard.api';
import type {
  DashboardData,
  DashboardCashflowItem,
  DashboardExpenseCategory,
  DashboardMaintenanceRequest,
} from '@api/dashboard.api';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return 'QAR ' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtMonth(m: string): string {
  const [y, mo] = m.split('-');
  const d = new Date(Number(y), Number(mo) - 1, 1);
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = {
  page: { padding: '1.5rem' },
  title: { fontSize: '1.3rem', fontWeight: 700, color: '#1a1a2e', marginBottom: '1.25rem' },
  sectionTitle: { fontSize: '0.95rem', fontWeight: 600, color: '#374151', marginBottom: '0.75rem' },
  grid4: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '0.75rem',
    marginBottom: '1rem',
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '1rem',
    marginBottom: '1rem',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '1rem 1.25rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
  },
  kpiLabel: { fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.2rem', fontWeight: 500 },
  kpiValue: { fontSize: '1.5rem', fontWeight: 700, color: '#1a1a2e' },
  kpiSub: { fontSize: '0.72rem', color: '#6b7280', marginTop: '0.15rem' },
  errorBanner: {
    backgroundColor: '#fee2e2',
    border: '1px solid #fca5a5',
    color: '#991b1b',
    borderRadius: '4px',
    padding: '0.6rem 0.75rem',
    fontSize: '0.8rem',
    marginBottom: '1rem',
  },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  th: {
    textAlign: 'left' as const,
    padding: '0.6rem 0.75rem',
    fontSize: '0.72rem',
    fontWeight: 600,
    color: '#6b7280',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  td: {
    padding: '0.6rem 0.75rem',
    fontSize: '0.82rem',
    color: '#374151',
    borderBottom: '1px solid #f3f4f6',
  },
  thRight: {
    textAlign: 'right' as const,
    padding: '0.6rem 0.75rem',
    fontSize: '0.72rem',
    fontWeight: 600,
    color: '#6b7280',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  tdRight: {
    padding: '0.6rem 0.75rem',
    fontSize: '0.82rem',
    color: '#374151',
    borderBottom: '1px solid #f3f4f6',
    textAlign: 'right' as const,
  },
  progressBg: {
    height: '8px',
    backgroundColor: '#f3f4f6',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '0.25rem',
  },
} as const;

function badge(label: string, color: string, bg: string) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '0.15rem 0.5rem',
        borderRadius: '999px',
        fontSize: '0.7rem',
        fontWeight: 600,
        color,
        backgroundColor: bg,
      }}
    >
      {label}
    </span>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  subColor,
}: {
  label: string;
  value: string;
  sub?: string;
  subColor?: string;
}) {
  return (
    <div style={s.card}>
      <div style={s.kpiLabel}>{label}</div>
      <div style={s.kpiValue}>{value}</div>
      {sub && <div style={{ ...s.kpiSub, color: subColor ?? '#6b7280' }}>{sub}</div>}
    </div>
  );
}

function CashflowChart({ data }: { data: DashboardCashflowItem[] }) {
  const maxVal = Math.max(...data.map((d) => Math.max(d.income, d.expenses)), 1);
  return (
    <div style={s.card}>
      <div style={s.sectionTitle}>12-Month Cashflow</div>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem', fontSize: '0.75rem', color: '#6b7280' }}>
        <span>
          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#4f8ef7', marginRight: '4px' }} />
          Income
        </span>
        <span>
          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f87171', marginRight: '4px' }} />
          Expenses
        </span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '120px' }}>
          {data.map((item) => (
            <div
              key={item.month}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '1px', justifyContent: 'flex-end', height: '100%' }}
            >
              <div
                style={{ flex: 'none', height: `${Math.max((item.income / maxVal) * 100, 2)}%`, backgroundColor: '#4f8ef7', borderRadius: '2px 2px 0 0' }}
                title={`Income: ${fmt(item.income)}`}
              />
              <div
                style={{ flex: 'none', height: `${Math.max((item.expenses / maxVal) * 100, 2)}%`, backgroundColor: '#f87171', borderRadius: '2px 2px 0 0' }}
                title={`Expenses: ${fmt(item.expenses)}`}
              />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '2px', marginTop: '4px' }}>
          {data.map((item) => (
            <div key={item.month} style={{ flex: 1, fontSize: '0.6rem', color: '#9ca3af', textAlign: 'center', whiteSpace: 'nowrap' }}>
              {fmtMonth(item.month)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ExpensesChart({ data }: { data: DashboardExpenseCategory[] }) {
  const max = Math.max(...data.map((d) => d.amount), 1);
  return (
    <div style={s.card}>
      <div style={s.sectionTitle}>Top Expense Categories (Last 30 days)</div>
      {data.length === 0 && (
        <p style={{ fontSize: '0.82rem', color: '#9ca3af' }}>No expenses recorded.</p>
      )}
      {data.map((item) => (
        <div key={item.category} style={{ marginBottom: '0.6rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#374151', marginBottom: '2px' }}>
            <span>{item.category}</span>
            <span style={{ fontWeight: 600 }}>{fmt(item.amount)}</span>
          </div>
          <div style={s.progressBg}>
            <div style={{ height: '8px', width: `${(item.amount / max) * 100}%`, backgroundColor: '#f87171', borderRadius: '4px' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    dashboardApi
      .get()
      .then(setData)
      .catch(() => setError('Failed to load dashboard data.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: '2rem', color: '#6b7280' }}>Loading dashboard…</div>;

  return (
    <div style={s.page}>
      <h1 style={s.title}>Dashboard</h1>

      {error && <div style={s.errorBanner}>{error}</div>}

      {data && (
        <>
          {/* Row 1 — Property Stats */}
          <div style={s.grid4}>
            <KpiCard
              label="Total Properties"
              value={String(data.propertyStats.total)}
              sub={`${data.propertyStats.masters} buildings · ${data.propertyStats.units} units`}
            />
            <KpiCard
              label="Occupancy Rate"
              value={`${data.propertyStats.occupancyRate}%`}
              sub={`${data.propertyStats.occupied} occupied · ${data.propertyStats.vacant} vacant`}
            />
            <KpiCard label="Active Tenants" value={String(data.rentStatus.activeTenants)} />
            <KpiCard label="Portfolio Value" value={fmt(data.propertyStats.totalPropertyValue)} />
          </div>

          {/* Row 2 — Vacant units (only shown when units exist) */}
          {data.propertyStats.units > 0 && (
            <div style={s.grid4}>
              <KpiCard label="Total Units" value={String(data.propertyStats.units)} />
              <KpiCard
                label="Vacant Units"
                value={String(data.propertyStats.vacantUnitsCount)}
                subColor={data.propertyStats.vacantUnitsCount > 0 ? '#d97706' : '#059669'}
                sub={data.propertyStats.vacantUnitsCount > 0 ? 'units available' : 'fully occupied'}
              />
              <KpiCard
                label="Vacant Units Value"
                value={fmt(data.propertyStats.vacantUnitsValue)}
                sub="potential monthly rent"
              />
            </div>
          )}

          {/* Row 3 — Financial Summary */}
          <div style={s.grid4}>
            <KpiCard
              label="This Month Income"
              value={fmt(data.financialSummary.currentMonthIncome)}
              sub={`Rent received: ${fmt(data.rentStatus.thisMonthReceived)}`}
            />
            <KpiCard
              label="This Month Expenses"
              value={fmt(data.financialSummary.currentMonthExpenses)}
            />
            <KpiCard
              label="Net Profit (This Month)"
              value={fmt(data.financialSummary.currentMonthNet)}
              subColor={data.financialSummary.currentMonthNet >= 0 ? '#059669' : '#dc2626'}
              sub={data.financialSummary.currentMonthNet >= 0 ? 'Profit' : 'Loss'}
            />
            <KpiCard
              label="Cash-on-Cash Return"
              value={`${data.financialSummary.cashOnCashReturn}%`}
              sub="annualized"
              subColor={data.financialSummary.cashOnCashReturn >= 0 ? '#059669' : '#dc2626'}
            />
          </div>

          {/* Row 4 — Rent & Maintenance Status */}
          <div style={s.grid4}>
            <KpiCard
              label="Overdue Rent"
              value={String(data.rentStatus.overdueCount)}
              sub={data.rentStatus.overdueCount > 0 ? fmt(data.rentStatus.overdueAmount) : 'All clear'}
              subColor={data.rentStatus.overdueCount > 0 ? '#dc2626' : '#059669'}
            />
            <KpiCard
              label="Overdue Owner Payments"
              value={String(data.rentStatus.overdueOwnerCount)}
              sub={data.rentStatus.overdueOwnerCount > 0 ? fmt(data.rentStatus.overdueOwnerAmount) : 'All clear'}
              subColor={data.rentStatus.overdueOwnerCount > 0 ? '#dc2626' : '#059669'}
            />
            <KpiCard
              label="Upcoming Rent (30d)"
              value={fmt(data.rentStatus.upcomingAmount)}
              sub="pending payments"
            />
            <KpiCard
              label="Maintenance Open"
              value={String(data.maintenanceSummary.pendingCount)}
              sub="pending or in progress"
              subColor={data.maintenanceSummary.pendingCount > 0 ? '#d97706' : '#059669'}
            />
          </div>

          {/* Charts */}
          <div style={s.grid2}>
            <CashflowChart data={data.cashflow} />
            <ExpensesChart data={data.expensesByCategory} />
          </div>

          {/* Recent Transactions */}
          <div style={{ ...s.card, marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div style={s.sectionTitle}>Recent Transactions</div>
              <Link to="/transactions" style={{ fontSize: '0.8rem', color: '#4f8ef7', textDecoration: 'none' }}>View All</Link>
            </div>
            {data.recentTransactions.length === 0 ? (
              <p style={{ fontSize: '0.82rem', color: '#9ca3af' }}>No transactions yet.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={s.th}>Date</th>
                      <th style={s.th}>Property</th>
                      <th style={s.th}>Category</th>
                      <th style={s.th}>Description</th>
                      <th style={s.th}>Type</th>
                      <th style={s.thRight}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentTransactions.map((tx) => {
                      const propName =
                        tx.propertyId && typeof tx.propertyId === 'object'
                          ? tx.propertyId.propertyName
                          : '—';
                      return (
                        <tr key={tx._id}>
                          <td style={s.td}>{fmtDate(tx.transactionDate)}</td>
                          <td style={{ ...s.td, color: '#6b7280' }}>{propName}</td>
                          <td style={s.td}>{tx.category}</td>
                          <td style={s.td}>{tx.description ?? '—'}</td>
                          <td style={s.td}>
                            {badge(
                              tx.type,
                              tx.type === 'Income' ? '#065f46' : '#991b1b',
                              tx.type === 'Income' ? '#d1fae5' : '#fee2e2',
                            )}
                          </td>
                          <td style={{ ...s.tdRight, fontWeight: 600, color: tx.type === 'Income' ? '#059669' : '#dc2626' }}>
                            {fmt(tx.amount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Upcoming Rent */}
          <div style={{ ...s.card, marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div style={s.sectionTitle}>Upcoming Rent Payments</div>
              <Link to="/rent" style={{ fontSize: '0.8rem', color: '#4f8ef7', textDecoration: 'none' }}>View All</Link>
            </div>
            {data.upcomingRentPayments.length === 0 ? (
              <p style={{ fontSize: '0.82rem', color: '#9ca3af' }}>No upcoming payments.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={s.th}>Tenant</th>
                      <th style={s.th}>Property</th>
                      <th style={s.th}>Due Date</th>
                      <th style={s.th}>Status</th>
                      <th style={s.thRight}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.upcomingRentPayments.map((rp) => {
                      const tenantName =
                        rp.tenantId && typeof rp.tenantId === 'object'
                          ? `${rp.tenantId.firstName} ${rp.tenantId.lastName}`
                          : '—';
                      const propName =
                        rp.propertyId && typeof rp.propertyId === 'object'
                          ? rp.propertyId.propertyName
                          : '—';
                      return (
                        <tr key={rp._id}>
                          <td style={s.td}>{tenantName}</td>
                          <td style={{ ...s.td, color: '#6b7280' }}>{propName}</td>
                          <td style={s.td}>{fmtDate(rp.dueDate)}</td>
                          <td style={s.td}>
                            {badge(
                              rp.status,
                              rp.status === 'Overdue' ? '#991b1b' : '#92400e',
                              rp.status === 'Overdue' ? '#fee2e2' : '#fef3c7',
                            )}
                          </td>
                          <td style={{ ...s.tdRight, fontWeight: 600 }}>{fmt(rp.amount)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent Maintenance Requests */}
          {data.maintenanceSummary.recentRequests.length > 0 && (
            <div style={s.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div style={s.sectionTitle}>Open Maintenance Requests</div>
                <Link to="/maintenance" style={{ fontSize: '0.8rem', color: '#4f8ef7', textDecoration: 'none' }}>View All</Link>
              </div>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>Property</th>
                    <th style={s.th}>Title</th>
                    <th style={s.th}>Priority</th>
                    <th style={s.th}>Status</th>
                    <th style={s.th}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.maintenanceSummary.recentRequests.map((mx: DashboardMaintenanceRequest) => {
                    const priorityColors: Record<string, [string, string]> = {
                      Emergency: ['#991b1b', '#fee2e2'],
                      High: ['#92400e', '#fef3c7'],
                      Medium: ['#1d4ed8', '#dbeafe'],
                      Low: ['#065f46', '#d1fae5'],
                    };
                    const statusColors: Record<string, [string, string]> = {
                      Pending: ['#92400e', '#fef3c7'],
                      'In Progress': ['#1d4ed8', '#dbeafe'],
                    };
                    const [pColor, pBg] = priorityColors[mx.priority] ?? ['#6b7280', '#f3f4f6'];
                    const [sColor, sBg] = statusColors[mx.status] ?? ['#6b7280', '#f3f4f6'];
                    const propName =
                      typeof mx.propertyId === 'object' && mx.propertyId !== null
                        ? mx.propertyId.propertyName
                        : '—';
                    return (
                      <tr key={mx._id} style={mx.priority === 'Emergency' ? { backgroundColor: '#fff5f5' } : {}}>
                        <td style={s.td}>{propName}</td>
                        <td style={{ ...s.td, fontWeight: 600 }}>
                          <Link to={`/maintenance/${mx._id}`} style={{ color: '#1d4ed8', textDecoration: 'none' }}>
                            {mx.title}
                          </Link>
                        </td>
                        <td style={s.td}>{badge(mx.priority, pColor, pBg)}</td>
                        <td style={s.td}>{badge(mx.status, sColor, sBg)}</td>
                        <td style={s.td}>{fmtDate(mx.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
