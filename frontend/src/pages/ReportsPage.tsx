import { useState, useEffect } from 'react';
import { reportsApi } from '@api/reports.api';
import type { ReportData, PropertyPerformanceItem } from '@api/reports.api';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return 'QAR ' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtMonth(m: string): string {
  const [y, mo] = m.split('-');
  const d = new Date(Number(y), Number(mo) - 1, 1);
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function yearStart(): string {
  return `${new Date().getFullYear()}-01-01`;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = {
  page: { padding: '1.5rem' },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1.25rem',
    flexWrap: 'wrap' as const,
    gap: '0.75rem',
  },
  title: { fontSize: '1.3rem', fontWeight: 700, color: '#1a1a2e' },
  filterBar: {
    display: 'flex',
    gap: '0.75rem',
    marginBottom: '1.25rem',
    flexWrap: 'wrap' as const,
    alignItems: 'flex-end',
  },
  label: { fontSize: '0.78rem', color: '#6b7280', marginBottom: '0.25rem' },
  dateInput: {
    padding: '0.45rem 0.65rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '0.875rem',
    color: '#111',
  },
  fetchBtn: {
    padding: '0.45rem 1rem',
    backgroundColor: '#4f8ef7',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  grid5: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))',
    gap: '0.75rem',
    marginBottom: '1.25rem',
  },
  kpiCard: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '0.85rem 1rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
  },
  kpiLabel: { fontSize: '0.72rem', color: '#9ca3af', marginBottom: '0.2rem', fontWeight: 500 },
  kpiValue: { fontSize: '1.15rem', fontWeight: 700, color: '#1a1a2e' },
  card: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '1.25rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
    marginBottom: '1rem',
  },
  sectionTitle: { fontSize: '0.95rem', fontWeight: 600, color: '#374151', marginBottom: '0.75rem' },
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
  td: {
    padding: '0.6rem 0.75rem',
    fontSize: '0.82rem',
    color: '#374151',
    borderBottom: '1px solid #f3f4f6',
  },
  tdRight: {
    padding: '0.6rem 0.75rem',
    fontSize: '0.82rem',
    color: '#374151',
    borderBottom: '1px solid #f3f4f6',
    textAlign: 'right' as const,
  },
  tdRightBold: {
    padding: '0.6rem 0.75rem',
    fontSize: '0.82rem',
    fontWeight: 700,
    borderBottom: '1px solid #f3f4f6',
    textAlign: 'right' as const,
  },
  unitTd: {
    padding: '0.5rem 0.75rem 0.5rem 2rem',
    fontSize: '0.78rem',
    color: '#6b7280',
    borderBottom: '1px solid #f3f4f6',
  },
  unitTdRight: {
    padding: '0.5rem 0.75rem',
    fontSize: '0.78rem',
    color: '#6b7280',
    borderBottom: '1px solid #f3f4f6',
    textAlign: 'right' as const,
  },
};

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={s.kpiCard}>
      <div style={s.kpiLabel}>{label}</div>
      <div style={{ ...s.kpiValue, color: color ?? '#1a1a2e' }}>{value}</div>
    </div>
  );
}

// ── Property Performance Table ────────────────────────────────────────────────

function PropertyPerformanceTable({ rows }: { rows: PropertyPerformanceItem[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (rows.length === 0) {
    return <p style={{ fontSize: '0.82rem', color: '#9ca3af' }}>No property data for this period.</p>;
  }

  return (
    <table style={s.table}>
      <thead>
        <tr>
          <th style={s.th}>Property</th>
          <th style={s.thRight}>Income</th>
          <th style={s.thRight}>Expenses</th>
          <th style={s.thRight}>Net Profit</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((prop) => (
          <>
            <tr
              key={prop.propertyId}
              style={{ cursor: prop.units.length > 0 ? 'pointer' : 'default' }}
              onClick={() => prop.units.length > 0 && toggle(prop.propertyId)}
            >
              <td style={s.td}>
                {prop.units.length > 0 && (
                  <span style={{ marginRight: '0.4rem', fontSize: '0.68rem' }}>
                    {expanded.has(prop.propertyId) ? '▼' : '▶'}
                  </span>
                )}
                {prop.propertyName}
                {prop.units.length > 0 && (
                  <span style={{ marginLeft: '0.4rem', fontSize: '0.68rem', color: '#9ca3af' }}>
                    ({prop.units.length} units)
                  </span>
                )}
              </td>
              <td style={s.tdRight}>{fmt(prop.income)}</td>
              <td style={s.tdRight}>{fmt(prop.expenses)}</td>
              <td
                style={{
                  ...s.tdRightBold,
                  color: prop.netProfit >= 0 ? '#059669' : '#dc2626',
                }}
              >
                {fmt(prop.netProfit)}
              </td>
            </tr>
            {expanded.has(prop.propertyId) &&
              prop.units.map((unit) => (
                <tr key={unit.propertyId}>
                  <td style={s.unitTd}>↳ {unit.propertyName}</td>
                  <td style={s.unitTdRight}>{fmt(unit.income)}</td>
                  <td style={s.unitTdRight}>{fmt(unit.expenses)}</td>
                  <td
                    style={{
                      ...s.unitTdRight,
                      fontWeight: 600,
                      color: unit.netProfit >= 0 ? '#059669' : '#dc2626',
                    }}
                  >
                    {fmt(unit.netProfit)}
                  </td>
                </tr>
              ))}
          </>
        ))}
      </tbody>
    </table>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [startDate, setStartDate] = useState(yearStart());
  const [endDate, setEndDate] = useState(today());
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function load() {
    setLoading(true);
    setError('');
    reportsApi
      .get(startDate, endDate)
      .then(setData)
      .catch(() => setError('Failed to load report data.'))
      .finally(() => setLoading(false));
  }

  // Load on mount with default date range (current year)
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>Reports</h1>
      </div>

      {/* Date filter */}
      <div style={s.filterBar}>
        <div>
          <div style={s.label}>Start Date</div>
          <input
            type="date"
            style={s.dateInput}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div>
          <div style={s.label}>End Date</div>
          <input
            type="date"
            style={s.dateInput}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <button style={s.fetchBtn} onClick={load} disabled={loading}>
          {loading ? 'Loading…' : 'Run Report'}
        </button>
      </div>

      {error && <div style={s.errorBanner}>{error}</div>}
      {loading && <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>Loading report…</div>}

      {!loading && data && (
        <>
          {/* Summary KPIs */}
          <div style={s.grid5}>
            <KpiCard label="Total Income" value={fmt(data.summary.totalIncome)} color="#059669" />
            <KpiCard label="Total Expenses" value={fmt(data.summary.totalExpenses)} color="#dc2626" />
            <KpiCard
              label="Net Profit"
              value={fmt(data.summary.netProfit)}
              color={data.summary.netProfit >= 0 ? '#059669' : '#dc2626'}
            />
            <KpiCard label="Receivables" value={fmt(data.summary.receivables)} color="#d97706" />
            <KpiCard label="Payables" value={fmt(data.summary.payables)} color="#7c3aed" />
          </div>

          {/* Property Performance */}
          <div style={s.card}>
            <div style={s.sectionTitle}>Property Performance</div>
            <PropertyPerformanceTable rows={data.propertyPerformance} />
          </div>

          {/* Monthly Breakdown */}
          <div style={s.card}>
            <div style={s.sectionTitle}>Monthly Breakdown</div>
            {data.monthlyBreakdown.length === 0 ? (
              <p style={{ fontSize: '0.82rem', color: '#9ca3af' }}>No data for this period.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={s.th}>Month</th>
                      <th style={s.thRight}>Income</th>
                      <th style={s.thRight}>Expenses</th>
                      <th style={s.thRight}>Net Profit</th>
                      <th style={s.thRight}>Receivables</th>
                      <th style={s.thRight}>Payables</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.monthlyBreakdown.map((row) => (
                      <tr key={row.month}>
                        <td style={s.td}>{fmtMonth(row.month)}</td>
                        <td style={s.tdRight}>{fmt(row.income)}</td>
                        <td style={s.tdRight}>{fmt(row.expenses)}</td>
                        <td
                          style={{
                            ...s.tdRightBold,
                            color: row.netProfit >= 0 ? '#059669' : '#dc2626',
                          }}
                        >
                          {fmt(row.netProfit)}
                        </td>
                        <td style={{ ...s.tdRight, color: '#d97706' }}>
                          {fmt(row.receivables)}
                        </td>
                        <td style={{ ...s.tdRight, color: '#7c3aed' }}>
                          {fmt(row.payables)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Receivables & Payables by Property */}
          {(data.receivablesByProperty.length > 0 || data.payablesByProperty.length > 0) && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '1rem',
              }}
            >
              {data.receivablesByProperty.length > 0 && (
                <div style={s.card}>
                  <div style={s.sectionTitle}>Receivables by Property</div>
                  <table style={s.table}>
                    <thead>
                      <tr>
                        <th style={s.th}>Property</th>
                        <th style={s.thRight}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.receivablesByProperty.map((r) => (
                        <tr key={r.propertyId}>
                          <td style={s.td}>{r.propertyName}</td>
                          <td style={{ ...s.tdRight, color: '#d97706', fontWeight: 600 }}>
                            {fmt(r.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {data.payablesByProperty.length > 0 && (
                <div style={s.card}>
                  <div style={s.sectionTitle}>Payables by Property</div>
                  <table style={s.table}>
                    <thead>
                      <tr>
                        <th style={s.th}>Property</th>
                        <th style={s.thRight}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.payablesByProperty.map((r) => (
                        <tr key={r.propertyId}>
                          <td style={s.td}>{r.propertyName}</td>
                          <td style={{ ...s.tdRight, color: '#7c3aed', fontWeight: 600 }}>
                            {fmt(r.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
