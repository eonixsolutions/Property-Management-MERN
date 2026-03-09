import { useState, useEffect, useCallback } from 'react';
import { sh } from '@/styles/shared';
import { resolveError } from '@utils/formHelpers';
import { Pagination } from '@components/common/Pagination';
import { ConfirmDialog } from '@components/common/ConfirmDialog';
import { formatDateLong } from '@utils/formatDate';
import { formatCurrency } from '@utils/formatCurrency';
import { chequesApi } from '@api/cheques.api';
import type {
  ApiTenantCheque,
  ApiOwnerCheque,
  TenantChequeStatus,
  OwnerChequeStatus,
  CreateTenantChequeInput,
  UpdateTenantChequeInput,
  CreateOwnerChequeInput,
  UpdateOwnerChequeInput,
  CreateOwnerChequesBulkInput,
  ChequeBulkMode,
  ChequeBulkFrequency,
} from '@api/cheques.api';
import type { PaginationMeta } from '@api/users.api';
import { propertiesApi } from '@api/properties.api';
import type { DropdownItem } from '@api/properties.api';
import { tenantsApi } from '@api/tenants.api';
import type { TenantDropdownItem } from '@api/tenants.api';
import { rentPaymentsApi } from '@api/rent-payments.api';
import type { ApiRentPayment } from '@api/rent-payments.api';
import { ownerPaymentsApi } from '@api/owner-payments.api';
import type { OwnerPaymentDropdownItem } from '@api/owner-payments.api';

// ── Styles ─────────────────────────────────────────────────────────────────

const s = {
  ...sh,
  // page-specific overrides / additions
  title: { fontSize: '1.3rem', fontWeight: 700, color: '#1a1a2e', marginBottom: '1rem' },
  headerBtns: { display: 'flex', gap: '0.75rem' },
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
  summaryBar: { display: 'flex', gap: '1rem', flexWrap: 'wrap' as const },
  summaryCard: { padding: '0.6rem 1rem', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 600 },
  clearBtn: { color: '#059669' },
  depositBtn: { color: '#2563eb' },
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
  modalSuccess: {
    backgroundColor: '#d1fae5',
    border: '1px solid #6ee7b7',
    color: '#065f46',
    borderRadius: '4px',
    padding: '0.5rem 0.65rem',
    fontSize: '0.8rem',
    marginBottom: '0.875rem',
  },
  // field with flex: 1 for use inside fieldRow
  fieldFlex: { marginBottom: '0.875rem', flex: 1 },
};

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

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
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
    chequeAmount: '', chequeDate: '', depositDate: '', status: 'Pending' as TenantChequeStatus,
    notes: '', rentPaymentId: '',
  };
  const [showAddModal, setShowAddModal] = useState(false);
  const [addError, setAddError] = useState('');
  const [saving, setSaving] = useState(false);
  const [addForm, setAddForm] = useState(emptyAdd);
  const [rentPaymentOptions, setRentPaymentOptions] = useState<ApiRentPayment[]>([]);
  const [addFieldErrors, setAddFieldErrors] = useState<Partial<Record<string, string>>>({});

  const emptyEdit = {
    chequeNumber: '', bankName: '', chequeAmount: '', chequeDate: '',
    depositDate: '', status: 'Pending' as TenantChequeStatus, notes: '',
  };
  const [editTarget, setEditTarget] = useState<ApiTenantCheque | null>(null);
  const [editForm, setEditForm] = useState(emptyEdit);
  const [editError, setEditError] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editFieldErrors, setEditFieldErrors] = useState<Partial<Record<string, string>>>({});

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
    setAddForm((prev) => ({ ...prev, tenantId, propertyId: t ? t.propertyId : prev.propertyId, rentPaymentId: '' }));
    setAddFieldErrors((prev) => ({ ...prev, tenantId: tenantId ? '' : 'Please select a tenant.' }));
    setRentPaymentOptions([]);
    if (tenantId) {
      rentPaymentsApi.list({ tenantId, limit: 100 })
        .then(({ payments }) => setRentPaymentOptions(payments))
        .catch(() => setRentPaymentOptions([]));
    }
  }

  function handleRentPaymentSelect(rentPaymentId: string) {
    const rp = rentPaymentOptions.find((p) => p._id === rentPaymentId);
    setAddForm((prev) => ({
      ...prev,
      rentPaymentId,
      chequeAmount: rp ? String(rp.amount) : prev.chequeAmount,
    }));
    if (rp) {
      setAddFieldErrors((prev) => ({ ...prev, chequeAmount: '' }));
    }
  }

  function validateTenantField(name: string, val: string): string {
    switch (name) {
      case 'tenantId': return !val ? 'Please select a tenant.' : '';
      case 'chequeNumber': return !val.trim() ? 'Cheque number is required.' : '';
      case 'chequeAmount': return !val || Number(val) <= 0 ? 'Amount must be greater than 0.' : '';
      case 'chequeDate': return !val ? 'Cheque date is required.' : '';
      default: return '';
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const required = ['tenantId', 'chequeNumber', 'chequeAmount', 'chequeDate'];
    const vals: Record<string, string> = {
      tenantId: addForm.tenantId,
      chequeNumber: addForm.chequeNumber,
      chequeAmount: addForm.chequeAmount,
      chequeDate: addForm.chequeDate,
    };
    const newErrors: Partial<Record<string, string>> = {};
    for (const f of required) {
      const msg = validateTenantField(f, vals[f]);
      if (msg) newErrors[f] = msg;
    }
    if (Object.keys(newErrors).length > 0) {
      setAddFieldErrors(newErrors);
      return;
    }
    setAddFieldErrors({});
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
        rentPaymentId: addForm.rentPaymentId || undefined,
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

  function openEdit(c: ApiTenantCheque) {
    setEditTarget(c);
    setEditForm({
      chequeNumber: c.chequeNumber,
      bankName: c.bankName ?? '',
      chequeAmount: String(c.chequeAmount),
      chequeDate: c.chequeDate ? c.chequeDate.slice(0, 10) : '',
      depositDate: c.depositDate ? c.depositDate.slice(0, 10) : '',
      status: c.status,
      notes: c.notes ?? '',
    });
    setEditError('');
    setEditFieldErrors({});
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    const errs: Partial<Record<string, string>> = {};
    if (!editForm.chequeNumber.trim()) errs['chequeNumber'] = 'Cheque number is required.';
    if (!editForm.chequeAmount || Number(editForm.chequeAmount) <= 0) errs['chequeAmount'] = 'Amount must be greater than 0.';
    if (!editForm.chequeDate) errs['chequeDate'] = 'Cheque date is required.';
    if (Object.keys(errs).length > 0) { setEditFieldErrors(errs); return; }
    setEditFieldErrors({});
    setEditError('');
    setEditSaving(true);
    try {
      const payload: UpdateTenantChequeInput = {
        chequeNumber: editForm.chequeNumber,
        bankName: editForm.bankName || null,
        chequeAmount: Number(editForm.chequeAmount),
        chequeDate: new Date(editForm.chequeDate).toISOString(),
        depositDate: editForm.depositDate ? new Date(editForm.depositDate).toISOString() : null,
        status: editForm.status,
        notes: editForm.notes || null,
      };
      await chequesApi.updateTenant(editTarget._id, payload);
      setEditTarget(null);
      void load();
    } catch (err) {
      setEditError(resolveError(err));
    } finally {
      setEditSaving(false);
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

  const totalCount = meta?.total ?? cheques.length;
  const pendingCount = cheques.filter((c) => c.status === 'Pending').length;
  const upcomingCount = cheques.filter((c) => c.status === 'Pending' && daysUntil(c.chequeDate) >= 0 && daysUntil(c.chequeDate) <= 7).length;
  const clearedCount = cheques.filter((c) => c.status === 'Cleared').length;

  return (
    <>
      <div style={s.header}>
        <div style={s.summaryBar}>
          <div style={{ ...s.summaryCard, backgroundColor: '#f3f4f6', color: '#374151' }}>
            Total: {totalCount}
          </div>
          {pendingCount > 0 && (
            <div style={{ ...s.summaryCard, backgroundColor: '#fef9c3', color: '#713f12' }}>
              Pending: {pendingCount}
            </div>
          )}
          {upcomingCount > 0 && (
            <div style={{ ...s.summaryCard, backgroundColor: '#fef3c7', color: '#92400e' }}>
              Upcoming (7d): {upcomingCount}
            </div>
          )}
          {clearedCount > 0 && (
            <div style={{ ...s.summaryCard, backgroundColor: '#d1fae5', color: '#065f46' }}>
              Cleared: {clearedCount}
            </div>
          )}
        </div>
        <button
          style={s.addBtn}
          type="button"
          onClick={() => {
            setAddForm(emptyAdd);
            setAddError('');
            setAddFieldErrors({});
            setRentPaymentOptions([]);
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
                <th style={s.th}>Deposit Date</th>
                <th style={s.th}>Bank</th>
                <th style={s.th}>Status</th>
                <th style={s.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {cheques.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ ...s.td, ...s.emptyRow }}>No tenant cheques found.</td>
                </tr>
              ) : cheques.map((c) => (
                <tr key={c._id}>
                  <td style={{ ...s.td, fontWeight: 500 }}>{c.chequeNumber}</td>
                  <td style={{ ...s.td, fontSize: '0.82rem' }}>{tenantLabel(c.tenantId)}</td>
                  <td style={{ ...s.td, fontSize: '0.82rem', color: '#6b7280' }}>{propertyLabel(c.propertyId)}</td>
                  <td style={{ ...s.td, fontWeight: 500 }}>{formatCurrency(c.chequeAmount, 'QAR', 0)}</td>
                  <td style={{ ...s.td, fontSize: '0.82rem' }}>{formatDateLong(c.chequeDate)}</td>
                  <td style={{ ...s.td, fontSize: '0.82rem', color: '#6b7280' }}>{formatDateLong(c.depositDate)}</td>
                  <td style={{ ...s.td, fontSize: '0.82rem', color: '#6b7280' }}>{c.bankName ?? '—'}</td>
                  <td style={s.td}>
                    <span style={{ ...s.badge, ...TENANT_STATUS_STYLES[c.status] }}>{c.status}</span>
                  </td>
                  <td style={{ ...s.td, whiteSpace: 'nowrap' as const }}>
                    {c.status === 'Pending' && (
                      <button style={{ ...s.actionBtn, ...s.depositBtn }} type="button" title="Mark as Deposited" onClick={() => setStatusTarget({ cheque: c, newStatus: 'Deposited' })}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      </button>
                    )}
                    {c.status === 'Deposited' && (
                      <button style={{ ...s.actionBtn, ...s.clearBtn }} type="button" title="Mark as Cleared" onClick={() => setStatusTarget({ cheque: c, newStatus: 'Cleared' })}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      </button>
                    )}
                    <button style={{ ...s.actionBtn, ...s.editBtn }} type="button" title="Edit" onClick={() => openEdit(c)}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button style={{ ...s.actionBtn, ...s.deleteBtn }} type="button" title="Delete" onClick={() => setDeleteTarget(c)}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {meta && (
            <Pagination meta={meta} onPageChange={setPage} />
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
                <select id="tc-tenant" style={{ ...s.select, ...(addFieldErrors.tenantId ? s.inputError : {}) }} value={addForm.tenantId} onChange={(e) => handleTenantSelect(e.target.value)} disabled={saving}>
                  <option value="">Select tenant…</option>
                  {tenantOptions.map((t) => <option key={t._id} value={t._id}>{t.firstName} {t.lastName}</option>)}
                </select>
                {addFieldErrors.tenantId && <span style={s.fieldError}>{addFieldErrors.tenantId}</span>}
              </div>
              {addForm.tenantId && (
                <div style={s.field}>
                  <label style={s.label} htmlFor="tc-rent-payment">Link to Rent Payment</label>
                  <select
                    id="tc-rent-payment"
                    style={s.select}
                    value={addForm.rentPaymentId}
                    onChange={(e) => handleRentPaymentSelect(e.target.value)}
                    disabled={saving}
                  >
                    <option value="">— None —</option>
                    {rentPaymentOptions.map((rp) => (
                      <option key={rp._id} value={rp._id}>
                        {new Date(rp.dueDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                        {' — '}QAR {rp.amount.toLocaleString()}
                        {' ('}
                        {rp.status}
                        {')'}
                      </option>
                    ))}
                  </select>
                  {rentPaymentOptions.length === 0 && (
                    <span style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.2rem', display: 'block' }}>
                      No rent payments found for this tenant.
                    </span>
                  )}
                </div>
              )}
              <div style={s.fieldRow}>
                <div style={s.fieldFlex}>
                  <label style={s.label} htmlFor="tc-num">Cheque Number *</label>
                  <input id="tc-num" style={{ ...s.input, ...(addFieldErrors.chequeNumber ? s.inputError : {}) }} type="text" value={addForm.chequeNumber}
                    onChange={(e) => { const v = e.target.value; setAddForm((p) => ({ ...p, chequeNumber: v })); setAddFieldErrors((p) => ({ ...p, chequeNumber: validateTenantField('chequeNumber', v) })); }}
                    disabled={saving} />
                  {addFieldErrors.chequeNumber && <span style={s.fieldError}>{addFieldErrors.chequeNumber}</span>}
                </div>
                <div style={s.fieldFlex}>
                  <label style={s.label} htmlFor="tc-bank">Bank Name</label>
                  <input id="tc-bank" style={s.input} type="text" value={addForm.bankName} onChange={(e) => setAddForm((p) => ({ ...p, bankName: e.target.value }))} disabled={saving} />
                </div>
              </div>
              <div style={s.fieldRow}>
                <div style={s.fieldFlex}>
                  <label style={s.label} htmlFor="tc-amount">Amount (QAR) *</label>
                  <input id="tc-amount" style={{ ...s.input, ...(addFieldErrors.chequeAmount ? s.inputError : {}) }} type="number" min="0" step="0.01" value={addForm.chequeAmount}
                    onChange={(e) => { const v = e.target.value; setAddForm((p) => ({ ...p, chequeAmount: v })); setAddFieldErrors((p) => ({ ...p, chequeAmount: validateTenantField('chequeAmount', v) })); }}
                    disabled={saving} />
                  {addFieldErrors.chequeAmount && <span style={s.fieldError}>{addFieldErrors.chequeAmount}</span>}
                </div>
                <div style={s.fieldFlex}>
                  <label style={s.label} htmlFor="tc-date">Cheque Date *</label>
                  <input id="tc-date" style={{ ...s.input, ...(addFieldErrors.chequeDate ? s.inputError : {}) }} type="date" value={addForm.chequeDate}
                    onChange={(e) => { const v = e.target.value; setAddForm((p) => ({ ...p, chequeDate: v })); setAddFieldErrors((p) => ({ ...p, chequeDate: validateTenantField('chequeDate', v) })); }}
                    disabled={saving} />
                  {addFieldErrors.chequeDate && <span style={s.fieldError}>{addFieldErrors.chequeDate}</span>}
                </div>
              </div>
              <div style={s.fieldRow}>
                <div style={s.fieldFlex}>
                  <label style={s.label} htmlFor="tc-status">Status</label>
                  <select id="tc-status" style={s.select} value={addForm.status} onChange={(e) => setAddForm((p) => ({ ...p, status: e.target.value as TenantChequeStatus }))} disabled={saving}>
                    <option value="Pending">Pending</option>
                    <option value="Deposited">Deposited</option>
                    <option value="Cleared">Cleared</option>
                    <option value="Bounced">Bounced</option>
                  </select>
                </div>
                <div style={s.fieldFlex}>
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
              Mark cheque <strong>{statusTarget.cheque.chequeNumber}</strong> ({formatCurrency(statusTarget.cheque.chequeAmount, 'QAR', 0)}) as <strong>{statusTarget.newStatus}</strong>?
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
        <ConfirmDialog
          title="Delete Tenant Cheque"
          message={<>Delete cheque <strong>{deleteTarget.chequeNumber}</strong>? This cannot be undone.</>}
          confirmLabel={deleting ? 'Deleting…' : 'Delete'}
          isLoading={deleting}
          isDanger
          onConfirm={() => void handleDelete()}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Edit tenant cheque modal */}
      {editTarget && (
        <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && setEditTarget(null)}>
          <div style={s.modal}>
            <h2 style={s.modalTitle}>Edit Tenant Cheque</h2>
            {editError && <div style={s.modalError}>{editError}</div>}
            <form onSubmit={(e) => void handleEditSubmit(e)}>
              <div style={s.fieldRow}>
                <div style={s.fieldFlex}>
                  <label style={s.label} htmlFor="etc-num">Cheque Number *</label>
                  <input id="etc-num" style={{ ...s.input, ...(editFieldErrors.chequeNumber ? s.inputError : {}) }} type="text" value={editForm.chequeNumber}
                    onChange={(e) => { const v = e.target.value; setEditForm((p) => ({ ...p, chequeNumber: v })); setEditFieldErrors((p) => ({ ...p, chequeNumber: v.trim() ? '' : 'Cheque number is required.' })); }}
                    disabled={editSaving} />
                  {editFieldErrors.chequeNumber && <span style={s.fieldError}>{editFieldErrors.chequeNumber}</span>}
                </div>
                <div style={s.fieldFlex}>
                  <label style={s.label} htmlFor="etc-bank">Bank Name</label>
                  <input id="etc-bank" style={s.input} type="text" value={editForm.bankName} onChange={(e) => setEditForm((p) => ({ ...p, bankName: e.target.value }))} disabled={editSaving} />
                </div>
              </div>
              <div style={s.fieldRow}>
                <div style={s.fieldFlex}>
                  <label style={s.label} htmlFor="etc-amount">Amount (QAR) *</label>
                  <input id="etc-amount" style={{ ...s.input, ...(editFieldErrors.chequeAmount ? s.inputError : {}) }} type="number" min="0" step="0.01" value={editForm.chequeAmount}
                    onChange={(e) => { const v = e.target.value; setEditForm((p) => ({ ...p, chequeAmount: v })); setEditFieldErrors((p) => ({ ...p, chequeAmount: !v || Number(v) <= 0 ? 'Amount must be greater than 0.' : '' })); }}
                    disabled={editSaving} />
                  {editFieldErrors.chequeAmount && <span style={s.fieldError}>{editFieldErrors.chequeAmount}</span>}
                </div>
                <div style={s.fieldFlex}>
                  <label style={s.label} htmlFor="etc-date">Cheque Date *</label>
                  <input id="etc-date" style={{ ...s.input, ...(editFieldErrors.chequeDate ? s.inputError : {}) }} type="date" value={editForm.chequeDate}
                    onChange={(e) => { const v = e.target.value; setEditForm((p) => ({ ...p, chequeDate: v })); setEditFieldErrors((p) => ({ ...p, chequeDate: v ? '' : 'Cheque date is required.' })); }}
                    disabled={editSaving} />
                  {editFieldErrors.chequeDate && <span style={s.fieldError}>{editFieldErrors.chequeDate}</span>}
                </div>
              </div>
              <div style={s.fieldRow}>
                <div style={s.fieldFlex}>
                  <label style={s.label} htmlFor="etc-status">Status</label>
                  <select id="etc-status" style={s.select} value={editForm.status} onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value as TenantChequeStatus }))} disabled={editSaving}>
                    <option value="Pending">Pending</option>
                    <option value="Deposited">Deposited</option>
                    <option value="Cleared">Cleared</option>
                    <option value="Bounced">Bounced</option>
                  </select>
                </div>
                <div style={s.fieldFlex}>
                  <label style={s.label} htmlFor="etc-deposit">Deposit Date</label>
                  <input id="etc-deposit" style={s.input} type="date" value={editForm.depositDate} onChange={(e) => setEditForm((p) => ({ ...p, depositDate: e.target.value }))} disabled={editSaving} />
                </div>
              </div>
              <div style={s.field}>
                <label style={s.label} htmlFor="etc-notes">Notes</label>
                <textarea id="etc-notes" style={s.textarea} value={editForm.notes} onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))} disabled={editSaving} />
              </div>
              <div style={s.modalActions}>
                <button style={s.cancelBtn} type="button" onClick={() => setEditTarget(null)} disabled={editSaving}>Cancel</button>
                <button style={{ ...s.submitBtn, ...(editSaving ? s.submitBtnDisabled : {}) }} type="submit" disabled={editSaving}>{editSaving ? 'Saving…' : 'Save Changes'}</button>
              </div>
            </form>
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
    status: 'Issued' as OwnerChequeStatus, notes: '', ownerPaymentId: '',
  };
  const [showAddModal, setShowAddModal] = useState(false);
  const [addError, setAddError] = useState('');
  const [saving, setSaving] = useState(false);
  const [addForm, setAddForm] = useState(emptyAdd);
  const [addFieldErrors, setAddFieldErrors] = useState<Partial<Record<string, string>>>({});
  const [ownerPaymentOptions, setOwnerPaymentOptions] = useState<OwnerPaymentDropdownItem[]>([]);

  useEffect(() => {
    if (!addForm.propertyId) { setOwnerPaymentOptions([]); return; }
    ownerPaymentsApi.dropdown(addForm.propertyId)
      .then((r) => setOwnerPaymentOptions(r.payments))
      .catch(() => setOwnerPaymentOptions([]));
  }, [addForm.propertyId]);

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
  const [bulkFieldErrors, setBulkFieldErrors] = useState<Partial<Record<string, string>>>({});

  const emptyOwnerEdit = {
    chequeNumber: '', bankName: '', chequeAmount: '', chequeDate: '',
    issueDate: '', status: 'Issued' as OwnerChequeStatus, notes: '', ownerPaymentId: '',
  };
  const [editTarget, setEditTarget] = useState<ApiOwnerCheque | null>(null);
  const [editForm, setEditForm] = useState(emptyOwnerEdit);
  const [editError, setEditError] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editFieldErrors, setEditFieldErrors] = useState<Partial<Record<string, string>>>({});

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

  function validateOwnerField(name: string, val: string): string {
    switch (name) {
      case 'propertyId': return !val ? 'Please select a property.' : '';
      case 'chequeNumber': return !val.trim() ? 'Cheque number is required.' : '';
      case 'chequeAmount': return !val || Number(val) <= 0 ? 'Amount must be greater than 0.' : '';
      case 'chequeDate': return !val ? 'Cheque date is required.' : '';
      default: return '';
    }
  }

  function validateBulkField(name: string, val: string, mode: string): string {
    switch (name) {
      case 'propertyId': return !val ? 'Please select a property.' : '';
      case 'chequeAmount': return !val || Number(val) <= 0 ? 'Amount must be greater than 0.' : '';
      case 'startingChequeNumber': return mode === 'manual' && !val.trim() ? 'Starting cheque number is required.' : '';
      case 'sourceChequeId': return mode === 'copy_from' && !val.trim() ? 'Please select a source cheque.' : '';
      case 'startDate': return !val ? 'Start date is required.' : '';
      case 'numCheques': { const n = Number(val); return !val || n < 1 || n > 24 ? 'Must be between 1 and 24.' : ''; }
      default: return '';
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const required = ['propertyId', 'chequeNumber', 'chequeAmount', 'chequeDate'];
    const vals: Record<string, string> = {
      propertyId: addForm.propertyId,
      chequeNumber: addForm.chequeNumber,
      chequeAmount: addForm.chequeAmount,
      chequeDate: addForm.chequeDate,
    };
    const newErrors: Partial<Record<string, string>> = {};
    for (const f of required) {
      const msg = validateOwnerField(f, vals[f]);
      if (msg) newErrors[f] = msg;
    }
    if (Object.keys(newErrors).length > 0) {
      setAddFieldErrors(newErrors);
      return;
    }
    setAddFieldErrors({});
    setAddError('');
    setSaving(true);
    try {
      const payload: CreateOwnerChequeInput = {
        propertyId: addForm.propertyId,
        ownerPaymentId: addForm.ownerPaymentId || undefined,
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
    const mode = bulkForm.chequeMode;
    const bulkVals: Record<string, string> = {
      propertyId: bulkForm.propertyId,
      chequeAmount: bulkForm.chequeAmount,
      startingChequeNumber: bulkForm.startingChequeNumber,
      sourceChequeId: bulkForm.sourceChequeId,
      startDate: bulkForm.startDate,
      numCheques: bulkForm.numCheques,
    };
    const bulkRequired = ['propertyId', 'chequeAmount', 'startingChequeNumber', 'sourceChequeId', 'startDate', 'numCheques'];
    const newBulkErrors: Partial<Record<string, string>> = {};
    for (const f of bulkRequired) {
      const msg = validateBulkField(f, bulkVals[f], mode);
      if (msg) newBulkErrors[f] = msg;
    }
    if (Object.keys(newBulkErrors).length > 0) {
      setBulkFieldErrors(newBulkErrors);
      return;
    }
    setBulkFieldErrors({});
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
        numCheques: Number(bulkForm.numCheques),
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

  function openEdit(c: ApiOwnerCheque) {
    setEditTarget(c);
    setEditForm({
      chequeNumber: c.chequeNumber,
      bankName: c.bankName ?? '',
      chequeAmount: String(c.chequeAmount),
      chequeDate: c.chequeDate ? c.chequeDate.slice(0, 10) : '',
      issueDate: c.issueDate ? c.issueDate.slice(0, 10) : '',
      status: c.status,
      notes: c.notes ?? '',
      ownerPaymentId: c.ownerPaymentId ?? '',
    });
    setEditError('');
    setEditFieldErrors({});
    ownerPaymentsApi.dropdown(c.propertyId)
      .then((r) => setOwnerPaymentOptions(r.payments))
      .catch(() => setOwnerPaymentOptions([]));
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    const errs: Partial<Record<string, string>> = {};
    if (!editForm.chequeNumber.trim()) errs['chequeNumber'] = 'Cheque number is required.';
    if (!editForm.chequeAmount || Number(editForm.chequeAmount) <= 0) errs['chequeAmount'] = 'Amount must be greater than 0.';
    if (!editForm.chequeDate) errs['chequeDate'] = 'Cheque date is required.';
    if (Object.keys(errs).length > 0) { setEditFieldErrors(errs); return; }
    setEditFieldErrors({});
    setEditError('');
    setEditSaving(true);
    try {
      const payload: UpdateOwnerChequeInput = {
        chequeNumber: editForm.chequeNumber,
        bankName: editForm.bankName || null,
        chequeAmount: Number(editForm.chequeAmount),
        chequeDate: new Date(editForm.chequeDate).toISOString(),
        issueDate: editForm.issueDate ? new Date(editForm.issueDate).toISOString() : null,
        status: editForm.status,
        notes: editForm.notes || null,
        ownerPaymentId: editForm.ownerPaymentId || null,
      };
      await chequesApi.updateOwner(editTarget._id, payload);
      setEditTarget(null);
      void load();
    } catch (err) {
      setEditError(resolveError(err));
    } finally {
      setEditSaving(false);
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

  const totalCount = meta?.total ?? cheques.length;
  const issuedCount = cheques.filter((c) => c.status === 'Issued').length;
  const upcomingCount = cheques.filter((c) => c.status === 'Issued' && daysUntil(c.chequeDate) >= 0 && daysUntil(c.chequeDate) <= 7).length;
  const clearedCount = cheques.filter((c) => c.status === 'Cleared').length;

  return (
    <>
      <div style={s.header}>
        <div style={s.summaryBar}>
          <div style={{ ...s.summaryCard, backgroundColor: '#f3f4f6', color: '#374151' }}>
            Total: {totalCount}
          </div>
          {issuedCount > 0 && (
            <div style={{ ...s.summaryCard, backgroundColor: '#fef9c3', color: '#713f12' }}>
              Issued: {issuedCount}
            </div>
          )}
          {upcomingCount > 0 && (
            <div style={{ ...s.summaryCard, backgroundColor: '#fef3c7', color: '#92400e' }}>
              Upcoming (7d): {upcomingCount}
            </div>
          )}
          {clearedCount > 0 && (
            <div style={{ ...s.summaryCard, backgroundColor: '#d1fae5', color: '#065f46' }}>
              Cleared: {clearedCount}
            </div>
          )}
        </div>
        <div style={s.headerBtns}>
          <button style={s.bulkBtn} type="button" onClick={() => { setBulkForm(emptyBulk); setBulkError(''); setBulkSuccess(''); setBulkFieldErrors({}); setShowBulkModal(true); }}>Issue Multiple</button>
          <button style={s.addBtn} type="button" onClick={() => { setAddForm(emptyAdd); setAddError(''); setAddFieldErrors({}); setShowAddModal(true); }}>Issue Cheque</button>
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
                <th style={s.th}>Owner</th>
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
                  <td colSpan={9} style={{ ...s.td, ...s.emptyRow }}>No owner cheques found.</td>
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
                    <td style={{ ...s.td, fontSize: '0.82rem' }}>{c.ownerName || '—'}</td>
                    <td style={{ ...s.td, fontWeight: 500 }}>{formatCurrency(c.chequeAmount, 'QAR', 0)}</td>
                    <td style={{ ...s.td, fontSize: '0.82rem' }}>{formatDateLong(c.chequeDate)}</td>
                    <td style={{ ...s.td, fontSize: '0.82rem', color: '#6b7280' }}>{formatDateLong(c.issueDate)}</td>
                    <td style={{ ...s.td, fontSize: '0.82rem', color: '#6b7280' }}>{c.bankName ?? '—'}</td>
                    <td style={s.td}>
                      <span style={{ ...s.badge, ...OWNER_STATUS_STYLES[c.status] }}>{c.status}</span>
                    </td>
                    <td style={{ ...s.td, whiteSpace: 'nowrap' as const }}>
                      {c.status === 'Issued' && (
                        <button style={{ ...s.actionBtn, ...s.clearBtn }} type="button" title="Mark as Cleared" onClick={() => setStatusTarget({ cheque: c, newStatus: 'Cleared' })}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        </button>
                      )}
                      <button style={{ ...s.actionBtn, ...s.editBtn }} type="button" title="Edit" onClick={() => openEdit(c)}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button style={{ ...s.actionBtn, ...s.deleteBtn }} type="button" title="Delete" onClick={() => setDeleteTarget(c)}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {meta && (
            <Pagination meta={meta} onPageChange={setPage} />
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
                <select id="oc-property" style={{ ...s.select, ...(addFieldErrors.propertyId ? s.inputError : {}) }} value={addForm.propertyId}
                  onChange={(e) => { const v = e.target.value; setAddForm((p) => ({ ...p, propertyId: v })); setAddFieldErrors((p) => ({ ...p, propertyId: validateOwnerField('propertyId', v) })); }}
                  disabled={saving}>
                  <option value="">Select property…</option>
                  {propertyOptions.map((p) => <option key={p._id} value={p._id}>{p.label}</option>)}
                </select>
                {addFieldErrors.propertyId && <span style={s.fieldError}>{addFieldErrors.propertyId}</span>}
              </div>
              {addForm.propertyId && (
                <div style={s.field}>
                  <label style={s.label} htmlFor="oc-owner-payment">Link to Owner Payment (Optional)</label>
                  <select id="oc-owner-payment" style={s.select} value={addForm.ownerPaymentId}
                    onChange={(e) => setAddForm((p) => ({ ...p, ownerPaymentId: e.target.value }))}
                    disabled={saving}>
                    <option value="">None</option>
                    {ownerPaymentOptions.map((op) => (
                      <option key={op._id} value={op._id}>
                        {new Date(op.paymentMonth).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })} — QAR {op.amount.toFixed(2)} ({op.status})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div style={s.fieldRow}>
                <div style={s.fieldFlex}>
                  <label style={s.label} htmlFor="oc-num">Cheque Number *</label>
                  <input id="oc-num" style={{ ...s.input, ...(addFieldErrors.chequeNumber ? s.inputError : {}) }} type="text" value={addForm.chequeNumber}
                    onChange={(e) => { const v = e.target.value; setAddForm((p) => ({ ...p, chequeNumber: v })); setAddFieldErrors((p) => ({ ...p, chequeNumber: validateOwnerField('chequeNumber', v) })); }}
                    disabled={saving} />
                  {addFieldErrors.chequeNumber && <span style={s.fieldError}>{addFieldErrors.chequeNumber}</span>}
                </div>
                <div style={s.fieldFlex}>
                  <label style={s.label} htmlFor="oc-bank">Bank Name</label>
                  <input id="oc-bank" style={s.input} type="text" value={addForm.bankName} onChange={(e) => setAddForm((p) => ({ ...p, bankName: e.target.value }))} disabled={saving} />
                </div>
              </div>
              <div style={s.fieldRow}>
                <div style={s.fieldFlex}>
                  <label style={s.label} htmlFor="oc-amount">Amount (QAR) *</label>
                  <input id="oc-amount" style={{ ...s.input, ...(addFieldErrors.chequeAmount ? s.inputError : {}) }} type="number" min="0" step="0.01" value={addForm.chequeAmount}
                    onChange={(e) => { const v = e.target.value; setAddForm((p) => ({ ...p, chequeAmount: v })); setAddFieldErrors((p) => ({ ...p, chequeAmount: validateOwnerField('chequeAmount', v) })); }}
                    disabled={saving} />
                  {addFieldErrors.chequeAmount && <span style={s.fieldError}>{addFieldErrors.chequeAmount}</span>}
                </div>
                <div style={s.fieldFlex}>
                  <label style={s.label} htmlFor="oc-chequedate">Cheque Date *</label>
                  <input id="oc-chequedate" style={{ ...s.input, ...(addFieldErrors.chequeDate ? s.inputError : {}) }} type="date" value={addForm.chequeDate}
                    onChange={(e) => { const v = e.target.value; setAddForm((p) => ({ ...p, chequeDate: v })); setAddFieldErrors((p) => ({ ...p, chequeDate: validateOwnerField('chequeDate', v) })); }}
                    disabled={saving} />
                  {addFieldErrors.chequeDate && <span style={s.fieldError}>{addFieldErrors.chequeDate}</span>}
                </div>
              </div>
              <div style={s.fieldRow}>
                <div style={s.fieldFlex}>
                  <label style={s.label} htmlFor="oc-issuedate">Issue Date</label>
                  <input id="oc-issuedate" style={s.input} type="date" value={addForm.issueDate} onChange={(e) => setAddForm((p) => ({ ...p, issueDate: e.target.value }))} disabled={saving} />
                </div>
                <div style={s.fieldFlex}>
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
                  <select id="bc-property" style={{ ...s.select, ...(bulkFieldErrors.propertyId ? s.inputError : {}) }} value={bulkForm.propertyId}
                    onChange={(e) => { const v = e.target.value; setBulkForm((p) => ({ ...p, propertyId: v })); setBulkFieldErrors((p) => ({ ...p, propertyId: validateBulkField('propertyId', v, bulkForm.chequeMode) })); }}
                    disabled={bulkSaving}>
                    <option value="">Select property…</option>
                    {propertyOptions.map((p) => <option key={p._id} value={p._id}>{p.label}</option>)}
                  </select>
                  {bulkFieldErrors.propertyId && <span style={s.fieldError}>{bulkFieldErrors.propertyId}</span>}
                </div>

                <div style={s.fieldRow}>
                  <div style={s.fieldFlex}>
                    <label style={s.label} htmlFor="bc-amount">Amount (QAR) *</label>
                    <input id="bc-amount" style={{ ...s.input, ...(bulkFieldErrors.chequeAmount ? s.inputError : {}) }} type="number" min="0.01" step="0.01" value={bulkForm.chequeAmount}
                      onChange={(e) => { const v = e.target.value; setBulkForm((p) => ({ ...p, chequeAmount: v })); setBulkFieldErrors((p) => ({ ...p, chequeAmount: validateBulkField('chequeAmount', v, bulkForm.chequeMode) })); }}
                      disabled={bulkSaving} />
                    {bulkFieldErrors.chequeAmount && <span style={s.fieldError}>{bulkFieldErrors.chequeAmount}</span>}
                  </div>
                  <div style={s.fieldFlex}>
                    <label style={s.label} htmlFor="bc-bank">Bank Name</label>
                    <input id="bc-bank" style={s.input} type="text" value={bulkForm.bankName} onChange={(e) => setBulkForm((p) => ({ ...p, bankName: e.target.value }))} disabled={bulkSaving} />
                  </div>
                </div>

                <div style={{ marginBottom: '0.875rem' }}>
                  <label style={{ ...s.label, marginBottom: '0.5rem' }}>Cheque Numbering *</label>
                  <div style={s.radioGroup}>
                    <label style={s.radioLabel}>
                      <input type="radio" name="bulk-mode" value="manual" checked={bulkForm.chequeMode === 'manual'} onChange={() => { setBulkForm((p) => ({ ...p, chequeMode: 'manual' })); setBulkFieldErrors((p) => ({ ...p, sourceChequeId: '' })); }} disabled={bulkSaving} />
                      Manual (enter starting number)
                    </label>
                    <label style={s.radioLabel}>
                      <input type="radio" name="bulk-mode" value="copy_from" checked={bulkForm.chequeMode === 'copy_from'} onChange={() => { setBulkForm((p) => ({ ...p, chequeMode: 'copy_from' })); setBulkFieldErrors((p) => ({ ...p, startingChequeNumber: '' })); }} disabled={bulkSaving} />
                      Copy from existing
                    </label>
                  </div>
                  {bulkForm.chequeMode === 'manual' ? (
                    <>
                      <input style={{ ...s.input, ...(bulkFieldErrors.startingChequeNumber ? s.inputError : {}) }} type="text" placeholder="e.g. CHQ001" value={bulkForm.startingChequeNumber}
                        onChange={(e) => { const v = e.target.value; setBulkForm((p) => ({ ...p, startingChequeNumber: v })); setBulkFieldErrors((p) => ({ ...p, startingChequeNumber: validateBulkField('startingChequeNumber', v, 'manual') })); }}
                        disabled={bulkSaving} />
                      {bulkFieldErrors.startingChequeNumber && <span style={s.fieldError}>{bulkFieldErrors.startingChequeNumber}</span>}
                    </>
                  ) : (
                    <>
                      <select style={{ ...s.select, ...(bulkFieldErrors.sourceChequeId ? s.inputError : {}) }} value={bulkForm.sourceChequeId}
                        onChange={(e) => { const v = e.target.value; setBulkForm((p) => ({ ...p, sourceChequeId: v })); setBulkFieldErrors((p) => ({ ...p, sourceChequeId: validateBulkField('sourceChequeId', v, 'copy_from') })); }}
                        disabled={bulkSaving}>
                        <option value="">Select source cheque…</option>
                        {cheques.map((c) => (
                          <option key={c._id} value={c._id}>
                            {c.chequeNumber} — {formatCurrency(c.chequeAmount, 'QAR', 0)} ({formatDateLong(c.chequeDate)})
                          </option>
                        ))}
                      </select>
                      {bulkFieldErrors.sourceChequeId && <span style={s.fieldError}>{bulkFieldErrors.sourceChequeId}</span>}
                    </>
                  )}
                </div>

                <div style={s.fieldRow}>
                  <div style={s.fieldFlex}>
                    <label style={s.label} htmlFor="bc-start">Start Date *</label>
                    <input id="bc-start" style={{ ...s.input, ...(bulkFieldErrors.startDate ? s.inputError : {}) }} type="date" value={bulkForm.startDate}
                      onChange={(e) => { const v = e.target.value; setBulkForm((p) => ({ ...p, startDate: v })); setBulkFieldErrors((p) => ({ ...p, startDate: validateBulkField('startDate', v, bulkForm.chequeMode) })); }}
                      disabled={bulkSaving} />
                    {bulkFieldErrors.startDate && <span style={s.fieldError}>{bulkFieldErrors.startDate}</span>}
                  </div>
                  <div style={s.fieldFlex}>
                    <label style={s.label} htmlFor="bc-num">Number of Cheques *</label>
                    <input id="bc-num" style={{ ...s.input, ...(bulkFieldErrors.numCheques ? s.inputError : {}) }} type="number" min="1" max="24" value={bulkForm.numCheques}
                      onChange={(e) => { const v = e.target.value; setBulkForm((p) => ({ ...p, numCheques: v })); setBulkFieldErrors((p) => ({ ...p, numCheques: validateBulkField('numCheques', v, bulkForm.chequeMode) })); }}
                      disabled={bulkSaving} />
                    {bulkFieldErrors.numCheques && <span style={s.fieldError}>{bulkFieldErrors.numCheques}</span>}
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
                    <strong>{formatDateLong(new Date(bulkForm.startDate).toISOString())}</strong>
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
              Mark cheque <strong>{statusTarget.cheque.chequeNumber}</strong> ({formatCurrency(statusTarget.cheque.chequeAmount, 'QAR', 0)}) as <strong>{statusTarget.newStatus}</strong>?
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
        <ConfirmDialog
          title="Delete Owner Cheque"
          message={<>Delete cheque <strong>{deleteTarget.chequeNumber}</strong>? This cannot be undone.</>}
          confirmLabel={deleting ? 'Deleting…' : 'Delete'}
          isLoading={deleting}
          isDanger
          onConfirm={() => void handleDelete()}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Edit owner cheque modal */}
      {editTarget && (
        <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && setEditTarget(null)}>
          <div style={s.modal}>
            <h2 style={s.modalTitle}>Edit Owner Cheque</h2>
            {editError && <div style={s.modalError}>{editError}</div>}
            <form onSubmit={(e) => void handleEditSubmit(e)}>
              <div style={s.fieldRow}>
                <div style={s.fieldFlex}>
                  <label style={s.label} htmlFor="eoc-num">Cheque Number *</label>
                  <input id="eoc-num" style={{ ...s.input, ...(editFieldErrors.chequeNumber ? s.inputError : {}) }} type="text" value={editForm.chequeNumber}
                    onChange={(e) => { const v = e.target.value; setEditForm((p) => ({ ...p, chequeNumber: v })); setEditFieldErrors((p) => ({ ...p, chequeNumber: v.trim() ? '' : 'Cheque number is required.' })); }}
                    disabled={editSaving} />
                  {editFieldErrors.chequeNumber && <span style={s.fieldError}>{editFieldErrors.chequeNumber}</span>}
                </div>
                <div style={s.fieldFlex}>
                  <label style={s.label} htmlFor="eoc-bank">Bank Name</label>
                  <input id="eoc-bank" style={s.input} type="text" value={editForm.bankName} onChange={(e) => setEditForm((p) => ({ ...p, bankName: e.target.value }))} disabled={editSaving} />
                </div>
              </div>
              <div style={s.fieldRow}>
                <div style={s.fieldFlex}>
                  <label style={s.label} htmlFor="eoc-amount">Amount (QAR) *</label>
                  <input id="eoc-amount" style={{ ...s.input, ...(editFieldErrors.chequeAmount ? s.inputError : {}) }} type="number" min="0" step="0.01" value={editForm.chequeAmount}
                    onChange={(e) => { const v = e.target.value; setEditForm((p) => ({ ...p, chequeAmount: v })); setEditFieldErrors((p) => ({ ...p, chequeAmount: !v || Number(v) <= 0 ? 'Amount must be greater than 0.' : '' })); }}
                    disabled={editSaving} />
                  {editFieldErrors.chequeAmount && <span style={s.fieldError}>{editFieldErrors.chequeAmount}</span>}
                </div>
                <div style={s.fieldFlex}>
                  <label style={s.label} htmlFor="eoc-chequedate">Cheque Date *</label>
                  <input id="eoc-chequedate" style={{ ...s.input, ...(editFieldErrors.chequeDate ? s.inputError : {}) }} type="date" value={editForm.chequeDate}
                    onChange={(e) => { const v = e.target.value; setEditForm((p) => ({ ...p, chequeDate: v })); setEditFieldErrors((p) => ({ ...p, chequeDate: v ? '' : 'Cheque date is required.' })); }}
                    disabled={editSaving} />
                  {editFieldErrors.chequeDate && <span style={s.fieldError}>{editFieldErrors.chequeDate}</span>}
                </div>
              </div>
              <div style={s.fieldRow}>
                <div style={s.fieldFlex}>
                  <label style={s.label} htmlFor="eoc-issuedate">Issue Date</label>
                  <input id="eoc-issuedate" style={s.input} type="date" value={editForm.issueDate} onChange={(e) => setEditForm((p) => ({ ...p, issueDate: e.target.value }))} disabled={editSaving} />
                </div>
                <div style={s.fieldFlex}>
                  <label style={s.label} htmlFor="eoc-status">Status</label>
                  <select id="eoc-status" style={s.select} value={editForm.status} onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value as OwnerChequeStatus }))} disabled={editSaving}>
                    <option value="Issued">Issued</option>
                    <option value="Cleared">Cleared</option>
                    <option value="Bounced">Bounced</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
              <div style={s.field}>
                <label style={s.label} htmlFor="eoc-notes">Notes</label>
                <textarea id="eoc-notes" style={s.textarea} value={editForm.notes} onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))} disabled={editSaving} />
              </div>
              <div style={s.field}>
                <label style={s.label} htmlFor="eoc-owner-payment">Link to Owner Payment (Optional)</label>
                <select id="eoc-owner-payment" style={s.select} value={editForm.ownerPaymentId}
                  onChange={(e) => setEditForm((p) => ({ ...p, ownerPaymentId: e.target.value }))}
                  disabled={editSaving}>
                  <option value="">None</option>
                  {ownerPaymentOptions.map((op) => (
                    <option key={op._id} value={op._id}>
                      {new Date(op.paymentMonth).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })} — QAR {op.amount.toFixed(2)} ({op.status})
                    </option>
                  ))}
                </select>
              </div>
              <div style={s.modalActions}>
                <button style={s.cancelBtn} type="button" onClick={() => setEditTarget(null)} disabled={editSaving}>Cancel</button>
                <button style={{ ...s.submitBtn, ...(editSaving ? s.submitBtnDisabled : {}) }} type="submit" disabled={editSaving}>{editSaving ? 'Saving…' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
