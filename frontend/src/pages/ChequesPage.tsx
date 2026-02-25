import { useState, useEffect, useCallback } from 'react';
import type { AxiosError } from 'axios';
import { chequesApi } from '@api/cheques.api';
import type {
  ApiTenantCheque,
  ApiOwnerCheque,
  TenantChequeStatus,
  OwnerChequeStatus,
  CreateTenantChequeInput,
  CreateOwnerChequeInput,
  CreateOwnerChequesBulkInput,
  ChequeBulkMode,
  ChequeBulkFrequency,
} from '@api/cheques.api';
import type { PaginationMeta } from '@api/users.api';
import { propertiesApi } from '@api/properties.api';
import type { DropdownItem } from '@api/properties.api';
import { tenantsApi } from '@api/tenants.api';
import type { TenantDropdownItem } from '@api/tenants.api';

// ── Styles ─────────────────────────────────────────────────────────────────

const s = {
  page: { padding: '1.5rem' },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1rem',
    flexWrap: 'wrap' as const,
    gap: '0.75rem',
  },
  title: { fontSize: '1.3rem', fontWeight: 700, color: '#1a1a2e', marginBottom: '1rem' },
  headerBtns: { display: 'flex', gap: '0.75rem' },
  addBtn: {
    padding: '0.5rem 1rem',
    backgroundColor: '#4f8ef7',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  bulkBtn: {
    padding: '0.5rem 1rem',
    backgroundColor: '#0891b2',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  tabs: {
    display: 'flex',
    gap: '0',
    marginBottom: '1.25rem',
    borderBottom: '2px solid #e5e7eb',
  },
  tab: {
    padding: '0.6rem 1.25rem',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#6b7280',
    borderBottom: '2px solid transparent',
    marginBottom: '-2px',
  },
  tabActive: { color: '#4f8ef7', borderBottom: '2px solid #4f8ef7' },
  filterBar: {
    display: 'flex',
    gap: '0.75rem',
    marginBottom: '1rem',
    flexWrap: 'wrap' as const,
    alignItems: 'center',
  },
  filterSelect: {
    padding: '0.45rem 0.65rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '0.875rem',
    color: '#111',
    backgroundColor: '#fff',
  },
  searchInput: {
    padding: '0.45rem 0.65rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '0.875rem',
    minWidth: '180px',
    color: '#111',
  },
  upcomingBtn: {
    padding: '0.45rem 0.8rem',
    border: '1px solid #f59e0b',
    borderRadius: '4px',
    backgroundColor: '#fff',
    color: '#92400e',
    fontSize: '0.78rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  upcomingBtnActive: { backgroundColor: '#fef3c7' },
  errorBanner: {
    backgroundColor: '#fee2e2',
    border: '1px solid #fca5a5',
    color: '#991b1b',
    borderRadius: '4px',
    padding: '0.6rem 0.75rem',
    fontSize: '0.8rem',
    marginBottom: '1rem',
  },
  summaryBar: { display: 'flex', gap: '1rem', flexWrap: 'wrap' as const },
  summaryCard: { padding: '0.6rem 1rem', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 600 },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    backgroundColor: '#fff',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  th: {
    textAlign: 'left' as const,
    padding: '0.75rem 1rem',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#6b7280',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  td: {
    padding: '0.75rem 1rem',
    fontSize: '0.875rem',
    color: '#374151',
    borderBottom: '1px solid #f3f4f6',
    verticalAlign: 'middle' as const,
  },
  actionBtn: {
    padding: '0.25rem 0.6rem',
    fontSize: '0.78rem',
    borderRadius: '3px',
    cursor: 'pointer',
    border: '1px solid',
    marginLeft: '0.4rem',
  },
  clearBtn: { backgroundColor: '#d1fae5', borderColor: '#6ee7b7', color: '#065f46' },
  depositBtn: { backgroundColor: '#dbeafe', borderColor: '#93c5fd', color: '#1e40af' },
  deleteBtn: { backgroundColor: '#fff1f2', borderColor: '#fecdd3', color: '#be123c' },
  badge: {
    display: 'inline-block',
    padding: '0.15rem 0.5rem',
    borderRadius: '999px',
    fontSize: '0.72rem',
    fontWeight: 600,
  },
  pagination: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginTop: '1rem',
    justifyContent: 'flex-end',
  },
  pageBtn: {
    padding: '0.35rem 0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    fontSize: '0.8rem',
  },
  pageBtnDisabled: { opacity: 0.5, cursor: 'not-allowed' as const },
  pageInfo: { fontSize: '0.8rem', color: '#6b7280' },
  emptyRow: { textAlign: 'center' as const, color: '#9ca3af', fontSize: '0.875rem' },
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    zIndex: 50,
    overflowY: 'auto' as const,
    padding: '2rem 1rem',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '2rem',
    width: '520px',
    maxWidth: '100%',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    margin: 'auto',
  },
  modalTitle: { fontSize: '1.1rem', fontWeight: 700, color: '#1a1a2e', marginBottom: '1.25rem' },
  fieldRow: { display: 'flex', gap: '0.75rem' },
  field: { marginBottom: '0.875rem', flex: 1 },
  label: {
    display: 'block',
    fontSize: '0.8rem',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '0.3rem',
  },
  input: {
    width: '100%',
    padding: '0.5rem 0.65rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '0.875rem',
    color: '#111',
    boxSizing: 'border-box' as const,
  },
  select: {
    width: '100%',
    padding: '0.5rem 0.65rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '0.875rem',
    color: '#111',
    backgroundColor: '#fff',
    boxSizing: 'border-box' as const,
  },
  textarea: {
    width: '100%',
    padding: '0.5rem 0.65rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '0.875rem',
    color: '#111',
    boxSizing: 'border-box' as const,
    minHeight: '60px',
    resize: 'vertical' as const,
  },
  infoBox: {
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '4px',
    padding: '0.5rem 0.75rem',
    fontSize: '0.8rem',
    color: '#1e40af',
    marginBottom: '0.875rem',
  },
  radioGroup: {
    display: 'flex',
    gap: '1.5rem',
    marginBottom: '0.75rem',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
  },
  radioLabel: {
    fontSize: '0.875rem',
    color: '#374151',
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
    cursor: 'pointer',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem',
    marginTop: '1.5rem',
  },
  cancelBtn: {
    padding: '0.5rem 1rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    fontSize: '0.875rem',
  },
  submitBtn: {
    padding: '0.5rem 1rem',
    backgroundColor: '#4f8ef7',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  submitBtnDisabled: { opacity: 0.7, cursor: 'not-allowed' as const },
  modalError: {
    backgroundColor: '#fee2e2',
    border: '1px solid #fca5a5',
    color: '#991b1b',
    borderRadius: '4px',
    padding: '0.5rem 0.65rem',
    fontSize: '0.8rem',
    marginBottom: '0.875rem',
  },
  modalSuccess: {
    backgroundColor: '#d1fae5',
    border: '1px solid #6ee7b7',
    color: '#065f46',
    borderRadius: '4px',
    padding: '0.5rem 0.65rem',
    fontSize: '0.8rem',
    marginBottom: '0.875rem',
  },
} as const;

// ── Helpers ────────────────────────────────────────────────────────────────

const TENANT_STATUS_STYLES: Record<TenantChequeStatus, React.CSSProperties> = {
  Pending: { backgroundColor: '#fef9c3', color: '#713f12' },
  Deposited: { backgroundColor: '#dbeafe', color: '#1e40af' },
  Cleared: { backgroundColor: '#d1fae5', color: '#065f46' },
  Bounced: { backgroundColor: '#fee2e2', color: '#991b1b' },
};

const OWNER_STATUS_STYLES: Record<OwnerChequeStatus, React.CSSProperties> = {
  Issued: { backgroundColor: '#fef9c3', color: '#713f12' },
  Cleared: { backgroundColor: '#d1fae5', color: '#065f46' },
  Bounced: { backgroundColor: '#fee2e2', color: '#991b1b' },
  Cancelled: { backgroundColor: '#f3f4f6', color: '#6b7280' },
};

function formatAmount(n: number): string {
  return `${n.toLocaleString()} QAR`;
}

function formatDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

function resolveError(err: unknown): string {
  const e = err as AxiosError<{ error?: { code?: string; message?: string } }>;
  const code = e.response?.data?.error?.code;
  switch (code) {
    case 'FORBIDDEN':
      return e.response?.data?.error?.message ?? 'Permission denied.';
    case 'NOT_FOUND':
      return e.response?.data?.error?.message ?? 'Resource not found.';
    case 'VALIDATION_ERROR':
      return e.response?.data?.error?.message ?? 'Validation failed.';
    default:
      return 'An unexpected error occurred.';
  }
}

type ActiveTab = 'tenant' | 'owner';

// ── Root page ──────────────────────────────────────────────────────────────

export default function ChequesPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('tenant');
  const [propertyOptions, setPropertyOptions] = useState<DropdownItem[]>([]);
  const [tenantOptions, setTenantOptions] = useState<TenantDropdownItem[]>([]);

  useEffect(() => {
    propertiesApi.dropdown().then(setPropertyOptions).catch(() => setPropertyOptions([]));
    tenantsApi.dropdown().then(setTenantOptions).catch(() => setTenantOptions([]));
  }, []);

  function propertyLabel(id?: string): string {
    if (!id) return '—';
    return propertyOptions.find((p) => p._id === id)?.label ?? '—';
  }

  function tenantLabel(id: string): string {
    const t = tenantOptions.find((x) => x._id === id);
    return t ? `${t.firstName} ${t.lastName}` : `…${id.slice(-6)}`;
  }

  return (
    <div style={s.page}>
      <h1 style={s.title}>Cheque Register</h1>

      <div style={s.tabs}>
        <button
          style={{ ...s.tab, ...(activeTab === 'tenant' ? s.tabActive : {}) }}
          type="button"
          onClick={() => setActiveTab('tenant')}
        >
          Tenant Cheques
        </button>
        <button
          style={{ ...s.tab, ...(activeTab === 'owner' ? s.tabActive : {}) }}
          type="button"
          onClick={() => setActiveTab('owner')}
        >
          Owner Cheques
        </button>
      </div>

      {activeTab === 'tenant' ? (
        <TenantChequesTab
          propertyOptions={propertyOptions}
          tenantOptions={tenantOptions}
          propertyLabel={propertyLabel}
          tenantLabel={tenantLabel}
        />
      ) : (
        <OwnerChequesTab propertyOptions={propertyOptions} propertyLabel={propertyLabel} />
      )}
    </div>
  );
}

// ── Tenant Cheques Tab ─────────────────────────────────────────────────────

interface TenantTabProps {
  propertyOptions: DropdownItem[];
  tenantOptions: TenantDropdownItem[];
  propertyLabel: (id?: string) => string;
  tenantLabel: (id: string) => string;
}

function TenantChequesTab({ propertyOptions, tenantOptions, propertyLabel, tenantLabel }: TenantTabProps) {
  const [cheques, setCheques] = useState<ApiTenantCheque[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  const [filterStatus, setFilterStatus] = useState<TenantChequeStatus | ''>('');
  const [filterProperty, setFilterProperty] = useState('');
  const [search, setSearch] = useState('');

  const emptyAdd = {
    tenantId: '', propertyId: '', chequeNumber: '', bankName: '',
    chequeAmount: '', chequeDate: '', depositDate: '', status: 'Pending' as TenantChequeStatus, notes: '',
  };
  const [showAddModal, setShowAddModal] = useState(false);
  const [addError, setAddError] = useState('');
  const [saving, setSaving] = useState(false);
  const [addForm, setAddForm] = useState(emptyAdd);

  const [statusTarget, setStatusTarget] = useState<{ cheque: ApiTenantCheque; newStatus: TenantChequeStatus } | null>(null);
  const [updating, setUpdating] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<ApiTenantCheque | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, unknown> = { page, limit: 25 };
      if (filterStatus) params['status'] = filterStatus;
      if (filterProperty) params['propertyId'] = filterProperty;
      if (search.trim()) params['search'] = search.trim();
      const { cheques: data, meta: m } = await chequesApi.listTenant(
        params as Parameters<typeof chequesApi.listTenant>[0],
      );
      setCheques(data);
      setMeta(m);
    } catch {
      setError('Failed to load tenant cheques.');
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus, filterProperty, search]);

  useEffect(() => {
    void load();
  }, [load]);

  function handleTenantSelect(tenantId: string) {
    const t = tenantOptions.find((x) => x._id === tenantId);
    setAddForm((prev) => ({ ...prev, tenantId, propertyId: t ? t.propertyId : prev.propertyId }));
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!addForm.tenantId) { setAddError('Please select a tenant.'); return; }
    if (!addForm.chequeNumber.trim()) { setAddError('Cheque number is required.'); return; }
    if (!addForm.chequeAmount || Number(addForm.chequeAmount) < 0) { setAddError('Amount is required.'); return; }
    if (!addForm.chequeDate) { setAddError('Cheque date is required.'); return; }
    setAddError('');
    setSaving(true);
    try {
      const payload: CreateTenantChequeInput = {
        tenantId: addForm.tenantId,
        propertyId: addForm.propertyId,
        chequeNumber: addForm.chequeNumber,
        bankName: addForm.bankName || undefined,
        chequeAmount: Number(addForm.chequeAmount),
        chequeDate: new Date(addForm.chequeDate).toISOString(),
        depositDate: addForm.depositDate ? new Date(addForm.depositDate).toISOString() : undefined,
        status: addForm.status,
        notes: addForm.notes || undefined,
      };
      await chequesApi.createTenant(payload);
      setShowAddModal(false);
      void load();
    } catch (err) {
      setAddError(resolveError(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusUpdate() {
    if (!statusTarget) return;
    setUpdating(true);
    try {
      await chequesApi.updateTenantStatus(statusTarget.cheque._id, { status: statusTarget.newStatus });
      setStatusTarget(null);
      void load();
    } catch {
      setStatusTarget(null);
    } finally {
      setUpdating(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await chequesApi.removeTenant(deleteTarget._id);
      setDeleteTarget(null);
      void load();
    } catch {
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  const pendingCount = cheques.filter((c) => c.status === 'Pending').length;
  const depositedCount = cheques.filter((c) => c.status === 'Deposited').length;
  const bouncedCount = cheques.filter((c) => c.status === 'Bounced').length;

  return (
    <>
      <div style={s.header}>
        <div style={s.summaryBar}>
          {pendingCount > 0 && (
            <div style={{ ...s.summaryCard, backgroundColor: '#fef9c3', color: '#713f12' }}>
              Pending: {pendingCount}
            </div>
          )}
          {depositedCount > 0 && (
            <div style={{ ...s.summaryCard, backgroundColor: '#dbeafe', color: '#1e40af' }}>
              Deposited: {depositedCount}
            </div>
          )}
          {bouncedCount > 0 && (
            <div style={{ ...s.summaryCard, backgroundColor: '#fee2e2', color: '#991b1b' }}>
              Bounced: {bouncedCount}
            </div>
          )}
        </div>
        <button
          style={s.addBtn}
          type="button"
          onClick={() => {
            setAddForm(emptyAdd);
            setAddError('');
            setShowAddModal(true);
          }}
        >
          + Add Cheque
        </button>
      </div>

      <div style={s.filterBar}>
        <select
          style={s.filterSelect}
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value as TenantChequeStatus | ''); setPage(1); }}
        >
          <option value="">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Deposited">Deposited</option>
          <option value="Cleared">Cleared</option>
          <option value="Bounced">Bounced</option>
        </select>
        <select
          style={s.filterSelect}
          value={filterProperty}
          onChange={(e) => { setFilterProperty(e.target.value); setPage(1); }}
        >
          <option value="">All Properties</option>
          {propertyOptions.map((p) => (
            <option key={p._id} value={p._id}>{p.label}</option>
          ))}
        </select>
        <input
          style={s.searchInput}
          type="text"
          placeholder="Search cheque #…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {error && <div style={s.errorBanner}>{error}</div>}

      {loading ? (
        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Loading…</p>
      ) : (
        <>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Cheque #</th>
                <th style={s.th}>Tenant</th>
                <th style={s.th}>Property</th>
                <th style={s.th}>Amount</th>
                <th style={s.th}>Cheque Date</th>
                <th style={s.th}>Bank</th>
                <th style={s.th}>Status</th>
                <th style={s.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {cheques.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ ...s.td, ...s.emptyRow }}>No tenant cheques found.</td>
                </tr>
              ) : cheques.map((c) => (
                <tr key={c._id}>
                  <td style={{ ...s.td, fontWeight: 500 }}>{c.chequeNumber}</td>
                  <td style={{ ...s.td, fontSize: '0.82rem' }}>{tenantLabel(c.tenantId)}</td>
                  <td style={{ ...s.td, fontSize: '0.82rem', color: '#6b7280' }}>{propertyLabel(c.propertyId)}</td>
                  <td style={{ ...s.td, fontWeight: 500 }}>{formatAmount(c.chequeAmount)}</td>
                  <td style={{ ...s.td, fontSize: '0.82rem' }}>{formatDate(c.chequeDate)}</td>
                  <td style={{ ...s.td, fontSize: '0.82rem', color: '#6b7280' }}>{c.bankName ?? '—'}</td>
                  <td style={s.td}>
                    <span style={{ ...s.badge, ...TENANT_STATUS_STYLES[c.status] }}>{c.status}</span>
                  </td>
                  <td style={s.td}>
                    {c.status === 'Pending' && (
                      <button style={{ ...s.actionBtn, ...s.depositBtn }} type="button" onClick={() => setStatusTarget({ cheque: c, newStatus: 'Deposited' })}>Deposit</button>
                    )}
                    {c.status === 'Deposited' && (
                      <button style={{ ...s.actionBtn, ...s.clearBtn }} type="button" onClick={() => setStatusTarget({ cheque: c, newStatus: 'Cleared' })}>Clear</button>
                    )}
                    <button style={{ ...s.actionBtn, ...s.deleteBtn }} type="button" onClick={() => setDeleteTarget(c)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {meta && meta.totalPages > 1 && (
            <div style={s.pagination}>
              <button style={{ ...s.pageBtn, ...(meta.hasPrevPage ? {} : s.pageBtnDisabled) }} type="button" disabled={!meta.hasPrevPage} onClick={() => setPage((p) => p - 1)}>← Prev</button>
              <span style={s.pageInfo}>Page {meta.page} of {meta.totalPages} ({meta.total} total)</span>
              <button style={{ ...s.pageBtn, ...(meta.hasNextPage ? {} : s.pageBtnDisabled) }} type="button" disabled={!meta.hasNextPage} onClick={() => setPage((p) => p + 1)}>Next →</button>
            </div>
          )}
        </>
      )}

      {/* Add tenant cheque modal */}
      {showAddModal && (
        <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && setShowAddModal(false)}>
          <div style={s.modal}>
            <h2 style={s.modalTitle}>Add Tenant Cheque</h2>
            {addError && <div style={s.modalError}>{addError}</div>}
            <form onSubmit={(e) => void handleAdd(e)}>
              <div style={s.field}>
                <label style={s.label} htmlFor="tc-tenant">Tenant *</label>
                <select id="tc-tenant" style={s.select} value={addForm.tenantId} onChange={(e) => handleTenantSelect(e.target.value)} disabled={saving} required>
                  <option value="">Select tenant…</option>
                  {tenantOptions.map((t) => <option key={t._id} value={t._id}>{t.firstName} {t.lastName}</option>)}
                </select>
              </div>
              <div style={s.fieldRow}>
                <div style={s.field}>
                  <label style={s.label} htmlFor="tc-num">Cheque Number *</label>
                  <input id="tc-num" style={s.input} type="text" value={addForm.chequeNumber} onChange={(e) => setAddForm((p) => ({ ...p, chequeNumber: e.target.value }))} disabled={saving} required />
                </div>
                <div style={s.field}>
                  <label style={s.label} htmlFor="tc-bank">Bank Name</label>
                  <input id="tc-bank" style={s.input} type="text" value={addForm.bankName} onChange={(e) => setAddForm((p) => ({ ...p, bankName: e.target.value }))} disabled={saving} />
                </div>
              </div>
              <div style={s.fieldRow}>
                <div style={s.field}>
                  <label style={s.label} htmlFor="tc-amount">Amount (QAR) *</label>
                  <input id="tc-amount" style={s.input} type="number" min="0" step="0.01" value={addForm.chequeAmount} onChange={(e) => setAddForm((p) => ({ ...p, chequeAmount: e.target.value }))} disabled={saving} required />
                </div>
                <div style={s.field}>
                  <label style={s.label} htmlFor="tc-date">Cheque Date *</label>
                  <input id="tc-date" style={s.input} type="date" value={addForm.chequeDate} onChange={(e) => setAddForm((p) => ({ ...p, chequeDate: e.target.value }))} disabled={saving} required />
                </div>
              </div>
              <div style={s.fieldRow}>
                <div style={s.field}>
                  <label style={s.label} htmlFor="tc-status">Status</label>
                  <select id="tc-status" style={s.select} value={addForm.status} onChange={(e) => setAddForm((p) => ({ ...p, status: e.target.value as TenantChequeStatus }))} disabled={saving}>
                    <option value="Pending">Pending</option>
                    <option value="Deposited">Deposited</option>
                    <option value="Cleared">Cleared</option>
                    <option value="Bounced">Bounced</option>
                  </select>
                </div>
                <div style={s.field}>
                  <label style={s.label} htmlFor="tc-deposit">Deposit Date</label>
                  <input id="tc-deposit" style={s.input} type="date" value={addForm.depositDate} onChange={(e) => setAddForm((p) => ({ ...p, depositDate: e.target.value }))} disabled={saving} />
                </div>
              </div>
              <div style={s.field}>
                <label style={s.label} htmlFor="tc-notes">Notes</label>
                <textarea id="tc-notes" style={s.textarea} value={addForm.notes} onChange={(e) => setAddForm((p) => ({ ...p, notes: e.target.value }))} disabled={saving} />
              </div>
              <div style={s.modalActions}>
                <button style={s.cancelBtn} type="button" onClick={() => setShowAddModal(false)} disabled={saving}>Cancel</button>
                <button style={{ ...s.submitBtn, ...(saving ? s.submitBtnDisabled : {}) }} type="submit" disabled={saving}>{saving ? 'Saving…' : 'Add Cheque'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Status update confirm */}
      {statusTarget && (
        <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && setStatusTarget(null)}>
          <div style={{ ...s.modal, width: '400px', padding: '1.5rem' }}>
            <h2 style={{ ...s.modalTitle, marginBottom: '0.75rem' }}>Mark as {statusTarget.newStatus}</h2>
            <p style={{ fontSize: '0.875rem', color: '#374151', marginBottom: '1.25rem' }}>
              Mark cheque <strong>{statusTarget.cheque.chequeNumber}</strong> ({formatAmount(statusTarget.cheque.chequeAmount)}) as <strong>{statusTarget.newStatus}</strong>?
            </p>
            <div style={s.modalActions}>
              <button style={s.cancelBtn} type="button" onClick={() => setStatusTarget(null)} disabled={updating}>Cancel</button>
              <button style={{ ...s.submitBtn, ...(updating ? s.submitBtnDisabled : {}) }} type="button" onClick={() => void handleStatusUpdate()} disabled={updating}>{updating ? 'Updating…' : 'Confirm'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && setDeleteTarget(null)}>
          <div style={{ ...s.modal, width: '400px', padding: '1.5rem' }}>
            <h2 style={{ ...s.modalTitle, marginBottom: '0.75rem' }}>Delete Tenant Cheque</h2>
            <p style={{ fontSize: '0.875rem', color: '#374151', marginBottom: '1.25rem' }}>
              Delete cheque <strong>{deleteTarget.chequeNumber}</strong>? This cannot be undone.
            </p>
            <div style={s.modalActions}>
              <button style={s.cancelBtn} type="button" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</button>
              <button style={{ ...s.submitBtn, backgroundColor: '#dc2626', ...(deleting ? s.submitBtnDisabled : {}) }} type="button" onClick={() => void handleDelete()} disabled={deleting}>{deleting ? 'Deleting…' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Owner Cheques Tab ──────────────────────────────────────────────────────

interface OwnerTabProps {
  propertyOptions: DropdownItem[];
  propertyLabel: (id?: string) => string;
}

function OwnerChequesTab({ propertyOptions, propertyLabel }: OwnerTabProps) {
  const [cheques, setCheques] = useState<ApiOwnerCheque[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  const [filterStatus, setFilterStatus] = useState<OwnerChequeStatus | ''>('');
  const [filterProperty, setFilterProperty] = useState('');
  const [search, setSearch] = useState('');
  const [upcoming, setUpcoming] = useState(false);

  const emptyAdd = {
    propertyId: '', chequeNumber: '', bankName: '', chequeAmount: '',
    chequeDate: '', issueDate: new Date().toISOString().slice(0, 10),
    status: 'Issued' as OwnerChequeStatus, notes: '',
  };
  const [showAddModal, setShowAddModal] = useState(false);
  const [addError, setAddError] = useState('');
  const [saving, setSaving] = useState(false);
  const [addForm, setAddForm] = useState(emptyAdd);

  const emptyBulk = {
    propertyId: '', chequeAmount: '', bankName: '', chequeMode: 'manual' as ChequeBulkMode,
    startingChequeNumber: '', sourceChequeId: '',
    startDate: new Date().toISOString().slice(0, 10),
    numCheques: '12', frequency: 'Monthly' as ChequeBulkFrequency, notes: '',
  };
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkError, setBulkError] = useState('');
  const [bulkSuccess, setBulkSuccess] = useState('');
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkForm, setBulkForm] = useState(emptyBulk);

  const [statusTarget, setStatusTarget] = useState<{ cheque: ApiOwnerCheque; newStatus: OwnerChequeStatus } | null>(null);
  const [updating, setUpdating] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<ApiOwnerCheque | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, unknown> = { page, limit: 25 };
      if (filterStatus) params['status'] = filterStatus;
      if (filterProperty) params['propertyId'] = filterProperty;
      if (search.trim()) params['search'] = search.trim();
      if (upcoming) params['upcoming'] = 'true';
      const { cheques: data, meta: m } = await chequesApi.listOwner(
        params as Parameters<typeof chequesApi.listOwner>[0],
      );
      setCheques(data);
      setMeta(m);
    } catch {
      setError('Failed to load owner cheques.');
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus, filterProperty, search, upcoming]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!addForm.propertyId) { setAddError('Please select a property.'); return; }
    if (!addForm.chequeNumber.trim()) { setAddError('Cheque number is required.'); return; }
    if (!addForm.chequeAmount || Number(addForm.chequeAmount) < 0) { setAddError('Amount is required.'); return; }
    if (!addForm.chequeDate) { setAddError('Cheque date is required.'); return; }
    setAddError('');
    setSaving(true);
    try {
      const payload: CreateOwnerChequeInput = {
        propertyId: addForm.propertyId,
        chequeNumber: addForm.chequeNumber,
        bankName: addForm.bankName || undefined,
        chequeAmount: Number(addForm.chequeAmount),
        chequeDate: new Date(addForm.chequeDate).toISOString(),
        issueDate: addForm.issueDate ? new Date(addForm.issueDate).toISOString() : undefined,
        status: addForm.status,
        notes: addForm.notes || undefined,
      };
      await chequesApi.createOwner(payload);
      setShowAddModal(false);
      void load();
    } catch (err) {
      setAddError(resolveError(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleBulk(e: React.FormEvent) {
    e.preventDefault();
    if (!bulkForm.propertyId) { setBulkError('Please select a property.'); return; }
    if (!bulkForm.chequeAmount || Number(bulkForm.chequeAmount) <= 0) { setBulkError('Amount must be greater than 0.'); return; }
    if (bulkForm.chequeMode === 'manual' && !bulkForm.startingChequeNumber.trim()) { setBulkError('Starting cheque number is required.'); return; }
    if (bulkForm.chequeMode === 'copy_from' && !bulkForm.sourceChequeId.trim()) { setBulkError('Please select a source cheque.'); return; }
    if (!bulkForm.startDate) { setBulkError('Start date is required.'); return; }
    const n = Number(bulkForm.numCheques);
    if (!n || n < 1 || n > 24) { setBulkError('Number of cheques must be between 1 and 24.'); return; }

    setBulkError('');
    setBulkSaving(true);
    try {
      const payload: CreateOwnerChequesBulkInput = {
        propertyId: bulkForm.propertyId,
        chequeAmount: Number(bulkForm.chequeAmount),
        bankName: bulkForm.bankName || undefined,
        chequeMode: bulkForm.chequeMode,
        startingChequeNumber: bulkForm.chequeMode === 'manual' ? bulkForm.startingChequeNumber : undefined,
        sourceChequeId: bulkForm.chequeMode === 'copy_from' ? bulkForm.sourceChequeId : undefined,
        startDate: new Date(bulkForm.startDate).toISOString(),
        numCheques: n,
        frequency: bulkForm.frequency,
        notes: bulkForm.notes || undefined,
      };
      const result = await chequesApi.createOwnerBulk(payload);
      setBulkSuccess(result.message);
      void load();
    } catch (err) {
      setBulkError(resolveError(err));
    } finally {
      setBulkSaving(false);
    }
  }

  async function handleStatusUpdate() {
    if (!statusTarget) return;
    setUpdating(true);
    try {
      await chequesApi.updateOwnerStatus(statusTarget.cheque._id, { status: statusTarget.newStatus });
      setStatusTarget(null);
      void load();
    } catch {
      setStatusTarget(null);
    } finally {
      setUpdating(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await chequesApi.removeOwner(deleteTarget._id);
      setDeleteTarget(null);
      void load();
    } catch {
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  const issuedTotal = cheques.filter((c) => c.status === 'Issued').reduce((s, c) => s + c.chequeAmount, 0);
  const clearedTotal = cheques.filter((c) => c.status === 'Cleared').reduce((s, c) => s + c.chequeAmount, 0);

  return (
    <>
      <div style={s.header}>
        <div style={s.summaryBar}>
          {issuedTotal > 0 && (
            <div style={{ ...s.summaryCard, backgroundColor: '#fef9c3', color: '#713f12' }}>
              Issued: {formatAmount(issuedTotal)}
            </div>
          )}
          {clearedTotal > 0 && (
            <div style={{ ...s.summaryCard, backgroundColor: '#d1fae5', color: '#065f46' }}>
              Cleared: {formatAmount(clearedTotal)}
            </div>
          )}
        </div>
        <div style={s.headerBtns}>
          <button style={s.bulkBtn} type="button" onClick={() => { setBulkForm(emptyBulk); setBulkError(''); setBulkSuccess(''); setShowBulkModal(true); }}>Issue Multiple</button>
          <button style={s.addBtn} type="button" onClick={() => { setAddForm(emptyAdd); setAddError(''); setShowAddModal(true); }}>Issue Cheque</button>
        </div>
      </div>

      <div style={s.filterBar}>
        <select style={s.filterSelect} value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value as OwnerChequeStatus | ''); setPage(1); }}>
          <option value="">All Statuses</option>
          <option value="Issued">Issued</option>
          <option value="Cleared">Cleared</option>
          <option value="Bounced">Bounced</option>
          <option value="Cancelled">Cancelled</option>
        </select>
        <select style={s.filterSelect} value={filterProperty} onChange={(e) => { setFilterProperty(e.target.value); setPage(1); }}>
          <option value="">All Properties</option>
          {propertyOptions.map((p) => <option key={p._id} value={p._id}>{p.label}</option>)}
        </select>
        <input style={s.searchInput} type="text" placeholder="Search cheque #…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        <button
          style={{ ...s.upcomingBtn, ...(upcoming ? s.upcomingBtnActive : {}) }}
          type="button"
          onClick={() => { setUpcoming((v) => !v); setPage(1); }}
        >
          {upcoming ? '★' : '☆'} Upcoming (7d)
        </button>
      </div>

      {error && <div style={s.errorBanner}>{error}</div>}

      {loading ? (
        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Loading…</p>
      ) : (
        <>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Cheque #</th>
                <th style={s.th}>Property</th>
                <th style={s.th}>Amount</th>
                <th style={s.th}>Cheque Date</th>
                <th style={s.th}>Issue Date</th>
                <th style={s.th}>Bank</th>
                <th style={s.th}>Status</th>
                <th style={s.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {cheques.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ ...s.td, ...s.emptyRow }}>No owner cheques found.</td>
                </tr>
              ) : cheques.map((c) => {
                const days = daysUntil(c.chequeDate);
                const isUpcoming = c.status === 'Issued' && days >= 0 && days <= 7;
                return (
                  <tr key={c._id} style={isUpcoming ? { backgroundColor: '#fffbeb' } : {}}>
                    <td style={{ ...s.td, fontWeight: 500 }}>
                      {c.chequeNumber}
                      {isUpcoming && (
                        <span style={{ ...s.badge, backgroundColor: '#fef3c7', color: '#92400e', marginLeft: '0.5rem' }}>
                          Due in {days}d
                        </span>
                      )}
                    </td>
                    <td style={{ ...s.td, fontSize: '0.82rem' }}>{propertyLabel(c.propertyId)}</td>
                    <td style={{ ...s.td, fontWeight: 500 }}>{formatAmount(c.chequeAmount)}</td>
                    <td style={{ ...s.td, fontSize: '0.82rem' }}>{formatDate(c.chequeDate)}</td>
                    <td style={{ ...s.td, fontSize: '0.82rem', color: '#6b7280' }}>{formatDate(c.issueDate)}</td>
                    <td style={{ ...s.td, fontSize: '0.82rem', color: '#6b7280' }}>{c.bankName ?? '—'}</td>
                    <td style={s.td}>
                      <span style={{ ...s.badge, ...OWNER_STATUS_STYLES[c.status] }}>{c.status}</span>
                    </td>
                    <td style={s.td}>
                      {c.status === 'Issued' && (
                        <button style={{ ...s.actionBtn, ...s.clearBtn }} type="button" onClick={() => setStatusTarget({ cheque: c, newStatus: 'Cleared' })}>Clear</button>
                      )}
                      <button style={{ ...s.actionBtn, ...s.deleteBtn }} type="button" onClick={() => setDeleteTarget(c)}>Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {meta && meta.totalPages > 1 && (
            <div style={s.pagination}>
              <button style={{ ...s.pageBtn, ...(meta.hasPrevPage ? {} : s.pageBtnDisabled) }} type="button" disabled={!meta.hasPrevPage} onClick={() => setPage((p) => p - 1)}>← Prev</button>
              <span style={s.pageInfo}>Page {meta.page} of {meta.totalPages} ({meta.total} total)</span>
              <button style={{ ...s.pageBtn, ...(meta.hasNextPage ? {} : s.pageBtnDisabled) }} type="button" disabled={!meta.hasNextPage} onClick={() => setPage((p) => p + 1)}>Next →</button>
            </div>
          )}
        </>
      )}

      {/* Issue single cheque modal */}
      {showAddModal && (
        <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && setShowAddModal(false)}>
          <div style={s.modal}>
            <h2 style={s.modalTitle}>Issue Owner Cheque</h2>
            {addError && <div style={s.modalError}>{addError}</div>}
            <form onSubmit={(e) => void handleAdd(e)}>
              <div style={s.field}>
                <label style={s.label} htmlFor="oc-property">Property *</label>
                <select id="oc-property" style={s.select} value={addForm.propertyId} onChange={(e) => setAddForm((p) => ({ ...p, propertyId: e.target.value }))} disabled={saving} required>
                  <option value="">Select property…</option>
                  {propertyOptions.map((p) => <option key={p._id} value={p._id}>{p.label}</option>)}
                </select>
              </div>
              <div style={s.fieldRow}>
                <div style={s.field}>
                  <label style={s.label} htmlFor="oc-num">Cheque Number *</label>
                  <input id="oc-num" style={s.input} type="text" value={addForm.chequeNumber} onChange={(e) => setAddForm((p) => ({ ...p, chequeNumber: e.target.value }))} disabled={saving} required />
                </div>
                <div style={s.field}>
                  <label style={s.label} htmlFor="oc-bank">Bank Name</label>
                  <input id="oc-bank" style={s.input} type="text" value={addForm.bankName} onChange={(e) => setAddForm((p) => ({ ...p, bankName: e.target.value }))} disabled={saving} />
                </div>
              </div>
              <div style={s.fieldRow}>
                <div style={s.field}>
                  <label style={s.label} htmlFor="oc-amount">Amount (QAR) *</label>
                  <input id="oc-amount" style={s.input} type="number" min="0" step="0.01" value={addForm.chequeAmount} onChange={(e) => setAddForm((p) => ({ ...p, chequeAmount: e.target.value }))} disabled={saving} required />
                </div>
                <div style={s.field}>
                  <label style={s.label} htmlFor="oc-chequedate">Cheque Date *</label>
                  <input id="oc-chequedate" style={s.input} type="date" value={addForm.chequeDate} onChange={(e) => setAddForm((p) => ({ ...p, chequeDate: e.target.value }))} disabled={saving} required />
                </div>
              </div>
              <div style={s.fieldRow}>
                <div style={s.field}>
                  <label style={s.label} htmlFor="oc-issuedate">Issue Date</label>
                  <input id="oc-issuedate" style={s.input} type="date" value={addForm.issueDate} onChange={(e) => setAddForm((p) => ({ ...p, issueDate: e.target.value }))} disabled={saving} />
                </div>
                <div style={s.field}>
                  <label style={s.label} htmlFor="oc-status">Status</label>
                  <select id="oc-status" style={s.select} value={addForm.status} onChange={(e) => setAddForm((p) => ({ ...p, status: e.target.value as OwnerChequeStatus }))} disabled={saving}>
                    <option value="Issued">Issued</option>
                    <option value="Cleared">Cleared</option>
                    <option value="Bounced">Bounced</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
              <div style={s.field}>
                <label style={s.label} htmlFor="oc-notes">Notes</label>
                <textarea id="oc-notes" style={s.textarea} value={addForm.notes} onChange={(e) => setAddForm((p) => ({ ...p, notes: e.target.value }))} disabled={saving} />
              </div>
              <div style={s.modalActions}>
                <button style={s.cancelBtn} type="button" onClick={() => setShowAddModal(false)} disabled={saving}>Cancel</button>
                <button style={{ ...s.submitBtn, ...(saving ? s.submitBtnDisabled : {}) }} type="submit" disabled={saving}>{saving ? 'Saving…' : 'Issue Cheque'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk cheque modal */}
      {showBulkModal && (
        <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && !bulkSaving && setShowBulkModal(false)}>
          <div style={s.modal}>
            <h2 style={s.modalTitle}>Issue Multiple Owner Cheques</h2>
            {bulkError && <div style={s.modalError}>{bulkError}</div>}
            {bulkSuccess ? (
              <>
                <div style={s.modalSuccess}>{bulkSuccess}</div>
                <div style={{ ...s.modalActions, marginTop: '0.75rem' }}>
                  <button style={s.cancelBtn} type="button" onClick={() => setShowBulkModal(false)}>Close</button>
                </div>
              </>
            ) : (
              <form onSubmit={(e) => void handleBulk(e)}>
                <div style={s.field}>
                  <label style={s.label} htmlFor="bc-property">Property *</label>
                  <select id="bc-property" style={s.select} value={bulkForm.propertyId} onChange={(e) => setBulkForm((p) => ({ ...p, propertyId: e.target.value }))} disabled={bulkSaving} required>
                    <option value="">Select property…</option>
                    {propertyOptions.map((p) => <option key={p._id} value={p._id}>{p.label}</option>)}
                  </select>
                </div>

                <div style={s.fieldRow}>
                  <div style={s.field}>
                    <label style={s.label} htmlFor="bc-amount">Amount (QAR) *</label>
                    <input id="bc-amount" style={s.input} type="number" min="0.01" step="0.01" value={bulkForm.chequeAmount} onChange={(e) => setBulkForm((p) => ({ ...p, chequeAmount: e.target.value }))} disabled={bulkSaving} required />
                  </div>
                  <div style={s.field}>
                    <label style={s.label} htmlFor="bc-bank">Bank Name</label>
                    <input id="bc-bank" style={s.input} type="text" value={bulkForm.bankName} onChange={(e) => setBulkForm((p) => ({ ...p, bankName: e.target.value }))} disabled={bulkSaving} />
                  </div>
                </div>

                <div style={{ marginBottom: '0.875rem' }}>
                  <label style={{ ...s.label, marginBottom: '0.5rem' }}>Cheque Numbering *</label>
                  <div style={s.radioGroup}>
                    <label style={s.radioLabel}>
                      <input type="radio" name="bulk-mode" value="manual" checked={bulkForm.chequeMode === 'manual'} onChange={() => setBulkForm((p) => ({ ...p, chequeMode: 'manual' }))} disabled={bulkSaving} />
                      Manual (enter starting number)
                    </label>
                    <label style={s.radioLabel}>
                      <input type="radio" name="bulk-mode" value="copy_from" checked={bulkForm.chequeMode === 'copy_from'} onChange={() => setBulkForm((p) => ({ ...p, chequeMode: 'copy_from' }))} disabled={bulkSaving} />
                      Copy from existing
                    </label>
                  </div>
                  {bulkForm.chequeMode === 'manual' ? (
                    <input style={s.input} type="text" placeholder="e.g. CHQ001" value={bulkForm.startingChequeNumber} onChange={(e) => setBulkForm((p) => ({ ...p, startingChequeNumber: e.target.value }))} disabled={bulkSaving} />
                  ) : (
                    <select style={s.select} value={bulkForm.sourceChequeId} onChange={(e) => setBulkForm((p) => ({ ...p, sourceChequeId: e.target.value }))} disabled={bulkSaving}>
                      <option value="">Select source cheque…</option>
                      {cheques.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.chequeNumber} — {formatAmount(c.chequeAmount)} ({formatDate(c.chequeDate)})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div style={s.fieldRow}>
                  <div style={s.field}>
                    <label style={s.label} htmlFor="bc-start">Start Date *</label>
                    <input id="bc-start" style={s.input} type="date" value={bulkForm.startDate} onChange={(e) => setBulkForm((p) => ({ ...p, startDate: e.target.value }))} disabled={bulkSaving} required />
                  </div>
                  <div style={s.field}>
                    <label style={s.label} htmlFor="bc-num">Number of Cheques *</label>
                    <input id="bc-num" style={s.input} type="number" min="1" max="24" value={bulkForm.numCheques} onChange={(e) => setBulkForm((p) => ({ ...p, numCheques: e.target.value }))} disabled={bulkSaving} required />
                  </div>
                </div>

                <div style={{ marginBottom: '0.875rem' }}>
                  <label style={{ ...s.label, marginBottom: '0.5rem' }}>Frequency *</label>
                  <div style={s.radioGroup}>
                    <label style={s.radioLabel}>
                      <input type="radio" name="bulk-freq" value="Monthly" checked={bulkForm.frequency === 'Monthly'} onChange={() => setBulkForm((p) => ({ ...p, frequency: 'Monthly' }))} disabled={bulkSaving} />
                      Monthly
                    </label>
                    <label style={s.radioLabel}>
                      <input type="radio" name="bulk-freq" value="Weekly" checked={bulkForm.frequency === 'Weekly'} onChange={() => setBulkForm((p) => ({ ...p, frequency: 'Weekly' }))} disabled={bulkSaving} />
                      Weekly
                    </label>
                  </div>
                </div>

                {bulkForm.numCheques && bulkForm.startDate && (
                  <div style={s.infoBox}>
                    Will create <strong>{bulkForm.numCheques}</strong> {bulkForm.frequency.toLowerCase()} cheque{Number(bulkForm.numCheques) !== 1 ? 's' : ''} starting{' '}
                    <strong>{formatDate(new Date(bulkForm.startDate).toISOString())}</strong>
                  </div>
                )}

                <div style={s.field}>
                  <label style={s.label} htmlFor="bc-notes">Notes</label>
                  <textarea id="bc-notes" style={s.textarea} value={bulkForm.notes} onChange={(e) => setBulkForm((p) => ({ ...p, notes: e.target.value }))} disabled={bulkSaving} />
                </div>

                <div style={s.modalActions}>
                  <button style={s.cancelBtn} type="button" onClick={() => setShowBulkModal(false)} disabled={bulkSaving}>Cancel</button>
                  <button style={{ ...s.submitBtn, backgroundColor: '#0891b2', ...(bulkSaving ? s.submitBtnDisabled : {}) }} type="submit" disabled={bulkSaving}>
                    {bulkSaving ? 'Creating…' : 'Issue Cheques'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Status confirm */}
      {statusTarget && (
        <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && setStatusTarget(null)}>
          <div style={{ ...s.modal, width: '400px', padding: '1.5rem' }}>
            <h2 style={{ ...s.modalTitle, marginBottom: '0.75rem' }}>Mark as {statusTarget.newStatus}</h2>
            <p style={{ fontSize: '0.875rem', color: '#374151', marginBottom: '1.25rem' }}>
              Mark cheque <strong>{statusTarget.cheque.chequeNumber}</strong> ({formatAmount(statusTarget.cheque.chequeAmount)}) as <strong>{statusTarget.newStatus}</strong>?
            </p>
            <div style={s.modalActions}>
              <button style={s.cancelBtn} type="button" onClick={() => setStatusTarget(null)} disabled={updating}>Cancel</button>
              <button style={{ ...s.submitBtn, ...(updating ? s.submitBtnDisabled : {}) }} type="button" onClick={() => void handleStatusUpdate()} disabled={updating}>{updating ? 'Updating…' : 'Confirm'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && setDeleteTarget(null)}>
          <div style={{ ...s.modal, width: '400px', padding: '1.5rem' }}>
            <h2 style={{ ...s.modalTitle, marginBottom: '0.75rem' }}>Delete Owner Cheque</h2>
            <p style={{ fontSize: '0.875rem', color: '#374151', marginBottom: '1.25rem' }}>
              Delete cheque <strong>{deleteTarget.chequeNumber}</strong>? This cannot be undone.
            </p>
            <div style={s.modalActions}>
              <button style={s.cancelBtn} type="button" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</button>
              <button style={{ ...s.submitBtn, backgroundColor: '#dc2626', ...(deleting ? s.submitBtnDisabled : {}) }} type="button" onClick={() => void handleDelete()} disabled={deleting}>{deleting ? 'Deleting…' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
