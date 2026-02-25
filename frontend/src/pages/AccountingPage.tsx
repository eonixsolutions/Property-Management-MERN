import { useState, useEffect } from 'react';
import { accountingApi } from '@api/accounting.api';
import type { BalanceSheet, ProfitLoss, TrialBalance } from '@api/accounting.api';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return 'QAR ' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
  tabs: { display: 'flex', gap: '0', borderBottom: '2px solid #e5e7eb', marginBottom: '1.25rem' },
  tab: (active: boolean) => ({
    padding: '0.5rem 1.25rem',
    fontSize: '0.875rem',
    fontWeight: active ? 600 : 400,
    color: active ? '#4f8ef7' : '#6b7280',
    borderBottom: active ? '2px solid #4f8ef7' : '2px solid transparent',
    marginBottom: '-2px',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
  }),
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
    fontSize: '0.85rem',
    color: '#374151',
    borderBottom: '1px solid #f3f4f6',
  },
  tdRight: {
    padding: '0.6rem 0.75rem',
    fontSize: '0.85rem',
    color: '#374151',
    borderBottom: '1px solid #f3f4f6',
    textAlign: 'right' as const,
  },
  totalRow: {
    padding: '0.6rem 0.75rem',
    fontSize: '0.85rem',
    fontWeight: 700,
    borderTop: '2px solid #e5e7eb',
    backgroundColor: '#f9fafb',
  },
  totalRowRight: {
    padding: '0.6rem 0.75rem',
    fontSize: '0.85rem',
    fontWeight: 700,
    borderTop: '2px solid #e5e7eb',
    backgroundColor: '#f9fafb',
    textAlign: 'right' as const,
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.85rem',
    color: '#374151',
    padding: '0.35rem 0',
    borderBottom: '1px solid #f3f4f6',
  },
  rowBold: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.9rem',
    fontWeight: 700,
    color: '#1a1a2e',
    padding: '0.5rem 0',
    borderTop: '2px solid #e5e7eb',
  },
  indented: { paddingLeft: '1rem', color: '#6b7280' },
  balancedBadge: (ok: boolean) => ({
    display: 'inline-block',
    padding: '0.2rem 0.75rem',
    borderRadius: '999px',
    fontSize: '0.78rem',
    fontWeight: 600,
    backgroundColor: ok ? '#d1fae5' : '#fee2e2',
    color: ok ? '#065f46' : '#991b1b',
    marginLeft: '0.75rem',
  }),
};

// ── Balance Sheet View ────────────────────────────────────────────────────────

function BalanceSheetView({ data }: { data: BalanceSheet }) {
  return (
    <div>
      <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center' }}>
        <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>As of {data.asOfDate}</span>
        <span style={s.balancedBadge(data.balanced)}>
          {data.balanced ? 'Balanced' : 'Out of Balance'}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
        {/* Assets */}
        <div style={s.card}>
          <div style={s.sectionTitle}>Assets</div>
          <div style={s.row}><span>Cash</span><span>{fmt(data.assets.currentAssets.cash)}</span></div>
          <div style={s.row}><span>Accounts Receivable</span><span>{fmt(data.assets.currentAssets.accountsReceivable)}</span></div>
          <div style={{ ...s.row, fontWeight: 600 }}><span>Total Current Assets</span><span>{fmt(data.assets.currentAssets.total)}</span></div>
          <div style={s.row}><span>Property Value</span><span>{fmt(data.assets.fixedAssets.propertyValue)}</span></div>
          <div style={{ ...s.row, fontWeight: 600 }}><span>Total Fixed Assets</span><span>{fmt(data.assets.fixedAssets.total)}</span></div>
          <div style={s.rowBold}><span>TOTAL ASSETS</span><span>{fmt(data.assets.total)}</span></div>
        </div>

        {/* Liabilities + Equity */}
        <div style={s.card}>
          <div style={s.sectionTitle}>Liabilities &amp; Equity</div>
          <div style={s.row}><span>Accounts Payable</span><span>{fmt(data.liabilities.currentLiabilities.accountsPayable)}</span></div>
          <div style={{ ...s.row, fontWeight: 600 }}><span>Total Liabilities</span><span>{fmt(data.liabilities.total)}</span></div>
          <div style={{ ...s.row, marginTop: '0.5rem' }}><span>Retained Earnings</span><span>{fmt(data.equity.retainedEarnings)}</span></div>
          <div style={{ ...s.row, fontWeight: 600 }}><span>Total Equity</span><span>{fmt(data.equity.total)}</span></div>
          <div style={s.rowBold}><span>TOTAL L&amp;E</span><span>{fmt(data.totalLiabilitiesAndEquity)}</span></div>
        </div>
      </div>
    </div>
  );
}

// ── P&L View ──────────────────────────────────────────────────────────────────

function ProfitLossView({ data }: { data: ProfitLoss }) {
  return (
    <div>
      <div style={{ marginBottom: '0.75rem', fontSize: '0.85rem', color: '#6b7280' }}>
        {data.startDate} → {data.endDate}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        {/* Revenue */}
        <div style={s.card}>
          <div style={s.sectionTitle}>Revenue</div>
          <div style={s.row}><span>Rent Income</span><span>{fmt(data.revenue.rentIncome)}</span></div>
          <div style={s.row}><span>Other Income</span><span>{fmt(data.revenue.otherIncome)}</span></div>
          <div style={s.rowBold}><span>TOTAL REVENUE</span><span style={{ color: '#059669' }}>{fmt(data.revenue.total)}</span></div>
        </div>

        {/* Expenses */}
        <div style={s.card}>
          <div style={s.sectionTitle}>Expenses</div>
          <div style={s.row}><span>Owner Rent</span><span>{fmt(data.expenses.ownerRent)}</span></div>
          <div style={s.row}><span>Other Expenses</span><span>{fmt(data.expenses.otherExpenses)}</span></div>
          <div style={s.rowBold}><span>TOTAL EXPENSES</span><span style={{ color: '#dc2626' }}>{fmt(data.expenses.total)}</span></div>
        </div>
      </div>

      {/* Net Profit */}
      <div style={{ ...s.card, marginBottom: '1rem' }}>
        <div style={s.rowBold}>
          <span>NET PROFIT / LOSS</span>
          <span style={{ color: data.netProfit >= 0 ? '#059669' : '#dc2626', fontSize: '1.1rem' }}>
            {fmt(data.netProfit)}
          </span>
        </div>
      </div>

      {/* Breakdowns */}
      {(data.incomeByCategory.length > 0 || data.expensesByCategory.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {data.incomeByCategory.length > 0 && (
            <div style={s.card}>
              <div style={s.sectionTitle}>Income by Category</div>
              <table style={s.table}>
                <thead><tr><th style={s.th}>Category</th><th style={s.thRight}>Amount</th></tr></thead>
                <tbody>
                  {data.incomeByCategory.map((c) => (
                    <tr key={c.category}>
                      <td style={s.td}>{c.category}</td>
                      <td style={s.tdRight}>{fmt(c.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {data.expensesByCategory.length > 0 && (
            <div style={s.card}>
              <div style={s.sectionTitle}>Expenses by Category</div>
              <table style={s.table}>
                <thead><tr><th style={s.th}>Category</th><th style={s.thRight}>Amount</th></tr></thead>
                <tbody>
                  {data.expensesByCategory.map((c) => (
                    <tr key={c.category}>
                      <td style={s.td}>{c.category}</td>
                      <td style={s.tdRight}>{fmt(c.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Trial Balance View ────────────────────────────────────────────────────────

function TrialBalanceView({ data }: { data: TrialBalance }) {
  return (
    <div>
      <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center' }}>
        <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>As of {data.asOfDate}</span>
        <span style={s.balancedBadge(data.balanced)}>
          {data.balanced ? 'Balanced' : 'Out of Balance'}
        </span>
      </div>

      <div style={s.card}>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Account</th>
              <th style={s.th}>Type</th>
              <th style={s.thRight}>Debit</th>
              <th style={s.thRight}>Credit</th>
            </tr>
          </thead>
          <tbody>
            {data.accounts.map((acc) => (
              <tr key={acc.name}>
                <td style={s.td}>{acc.name}</td>
                <td style={s.td} >{acc.type.charAt(0).toUpperCase() + acc.type.slice(1)}</td>
                <td style={s.tdRight}>{acc.debit > 0 ? fmt(acc.debit) : '—'}</td>
                <td style={s.tdRight}>{acc.credit > 0 ? fmt(acc.credit) : '—'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td style={s.totalRow} colSpan={2}>TOTALS</td>
              <td style={s.totalRowRight}>{fmt(data.totalDebits)}</td>
              <td style={s.totalRowRight}>{fmt(data.totalCredits)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type Tab = 'balance-sheet' | 'profit-loss' | 'trial-balance';

export default function AccountingPage() {
  const [tab, setTab] = useState<Tab>('balance-sheet');
  const [asOfDate, setAsOfDate] = useState(today());
  const [startDate, setStartDate] = useState(yearStart());
  const [endDate, setEndDate] = useState(today());

  const [bsData, setBsData] = useState<BalanceSheet | null>(null);
  const [plData, setPlData] = useState<ProfitLoss | null>(null);
  const [tbData, setTbData] = useState<TrialBalance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function load() {
    setLoading(true);
    setError('');
    const promise =
      tab === 'balance-sheet'
        ? accountingApi.getBalanceSheet(asOfDate).then(setBsData)
        : tab === 'profit-loss'
          ? accountingApi.getProfitLoss(startDate, endDate).then(setPlData)
          : accountingApi.getTrialBalance(asOfDate).then(setTbData);

    promise
      .catch(() => setError('Failed to load accounting data.'))
      .finally(() => setLoading(false));
  }

  // Auto-load on tab change
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>Accounting</h1>
      </div>

      {/* Tabs */}
      <div style={s.tabs}>
        {(['balance-sheet', 'profit-loss', 'trial-balance'] as Tab[]).map((t) => (
          <button key={t} style={s.tab(tab === t)} onClick={() => setTab(t)}>
            {t === 'balance-sheet' ? 'Balance Sheet' : t === 'profit-loss' ? 'Profit & Loss' : 'Trial Balance'}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div style={s.filterBar}>
        {(tab === 'balance-sheet' || tab === 'trial-balance') && (
          <div>
            <div style={s.label}>As of Date</div>
            <input
              type="date"
              style={s.dateInput}
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
            />
          </div>
        )}
        {tab === 'profit-loss' && (
          <>
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
          </>
        )}
        <button style={s.fetchBtn} onClick={load} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {error && <div style={s.errorBanner}>{error}</div>}

      {loading && <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>Loading…</div>}

      {!loading && tab === 'balance-sheet' && bsData && <BalanceSheetView data={bsData} />}
      {!loading && tab === 'profit-loss' && plData && <ProfitLossView data={plData} />}
      {!loading && tab === 'trial-balance' && tbData && <TrialBalanceView data={tbData} />}
    </div>
  );
}
