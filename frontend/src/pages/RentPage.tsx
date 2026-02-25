import { useState, useEffect, useCallback } from 'react';
import type { AxiosError } from 'axios';
import { rentPaymentsApi } from '@api/rent-payments.api';
import type {
  ApiRentPayment,
  RentPaymentStatus,
  PaymentMethod,
  CreateRentPaymentInput,
  UpdateRentPaymentInput,
} from '@api/rent-payments.api';
import type { PaginationMeta } from '@api/users.api';
import { tenantsApi } from '@api/tenants.api';
import type { TenantDropdownItem } from '@api/tenants.api';
import { propertiesApi } from '@api/properties.api';
import type { DropdownItem } from '@api/properties.api';
import { useAuth } from '@context/AuthContext';

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
  generateBtn: {
    padding: '0.5rem 1rem',
    backgroundColor: '#7c3aed',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  filterBar: {
    display: 'flex',
    gap: '0.75rem',
    marginBottom: '1rem',
    flexWrap: 'wrap' as const,
  },
  filterSelect: {
    padding: '0.45rem 0.65rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '0.875rem',
    color: '#111',
    backgroundColor: '#fff',
  },
  monthInput: {
    padding: '0.45rem 0.65rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '0.875rem',
    color: '#111',
  },
  errorBanner: {
    backgroundColor: '#fee2e2',
    border: '1px solid #fca5a5',
    color: '#991b1b',
    borderRadius: '4px',
    padding: '0.6rem 0.75rem',
    fontSize: '0.8rem',
    marginBottom: '1rem',
  },
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
  editBtn: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe', color: '#1d4ed8' },
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
    width: '560px',
    maxWidth: '100%',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    margin: 'auto',
  },
  modalTitle: {
    fontSize: '1.1rem',
    fontWeight: 700,
    color: '#1a1a2e',
    marginBottom: '1.25rem',
  },
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

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_BADGE_STYLES: Record<RentPaymentStatus, React.CSSProperties> = {
  Paid: { backgroundColor: '#d1fae5', color: '#065f46' },
  Pending: { backgroundColor: '#fef9c3', color: '#713f12' },
  Overdue: { backgroundColor: '#fee2e2', color: '#991b1b' },
  Partial: { backgroundColor: '#ffedd5', color: '#9a3412' },
};

function paymentStatusBadge(status: RentPaymentStatus): React.CSSProperties {
  return { ...s.badge, ...STATUS_BADGE_STYLES[status] };
}

function formatDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatAmount(n: number): string {
  return `${n.toLocaleString()} QAR`;
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
      return e.response?.data?.error?.message ?? 'Validation failed. Check your inputs.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
}

const PAYMENT_METHODS: PaymentMethod[] = [
  'Cash',
  'Cheque',
  'Bank Transfer',
  'Credit Card',
  'Debit Card',
  'Online Transfer',
  'Other',
];

// ── Create form state ─────────────────────────────────────────────────────────

interface CreateForm {
  tenantId: string;
  propertyId: string;
  amount: string;
  dueDate: string;
  paidDate: string;
  status: RentPaymentStatus;
  paymentMethod: PaymentMethod | '';
  chequeNumber: string;
  referenceNumber: string;
  notes: string;
}

const emptyCreateForm: CreateForm = {
  tenantId: '',
  propertyId: '',
  amount: '',
  dueDate: '',
  paidDate: '',
  status: 'Pending',
  paymentMethod: '',
  chequeNumber: '',
  referenceNumber: '',
  notes: '',
};

// ── Edit form state ───────────────────────────────────────────────────────────

interface EditForm {
  amount: string;
  dueDate: string;
  paidDate: string;
  status: RentPaymentStatus;
  paymentMethod: PaymentMethod | '';
  chequeNumber: string;
  referenceNumber: string;
  notes: string;
}

function paymentToEditForm(p: ApiRentPayment): EditForm {
  return {
    amount: String(p.amount),
    dueDate: p.dueDate ? p.dueDate.slice(0, 10) : '',
    paidDate: p.paidDate ? p.paidDate.slice(0, 10) : '',
    status: p.status,
    paymentMethod: (p.paymentMethod as PaymentMethod | undefined) ?? '',
    chequeNumber: p.chequeNumber ?? '',
    referenceNumber: p.referenceNumber ?? '',
    notes: p.notes ?? '',
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function RentPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  const [payments, setPayments] = useState<ApiRentPayment[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  const [filterStatus, setFilterStatus] = useState<'' | RentPaymentStatus>('');
  const [filterProperty, setFilterProperty] = useState('');
  const [filterTenant, setFilterTenant] = useState('');
  const [filterMonth, setFilterMonth] = useState('');

  const [propertyOptions, setPropertyOptions] = useState<DropdownItem[]>([]);
  const [tenantOptions, setTenantOptions] = useState<TenantDropdownItem[]>([]);

  // Create payment modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(emptyCreateForm);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Edit payment modal
  const [editTarget, setEditTarget] = useState<ApiRentPayment | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<ApiRentPayment | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Generate invoices confirm
  const [showGenerate, setShowGenerate] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState('');
  const [generateError, setGenerateError] = useState('');

  useEffect(() => {
    propertiesApi.dropdown().then(setPropertyOptions).catch(() => setPropertyOptions([]));
    tenantsApi
      .dropdown({ status: 'Active' })
      .then(setTenantOptions)
      .catch(() => setTenantOptions([]));
  }, []);

  const loadPayments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, unknown> = { page, limit: 25 };
      if (filterStatus) params['status'] = filterStatus;
      if (filterProperty) params['propertyId'] = filterProperty;
      if (filterTenant) params['tenantId'] = filterTenant;
      if (filterMonth) params['month'] = filterMonth;

      const { payments: data, meta: pageMeta } = await rentPaymentsApi.list(
        params as Parameters<typeof rentPaymentsApi.list>[0],
      );
      setPayments(data);
      setMeta(pageMeta);
    } catch {
      setError('Failed to load rent payments. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus, filterProperty, filterTenant, filterMonth]);

  useEffect(() => {
    void loadPayments();
  }, [loadPayments]);

  // ── Create form helpers ───────────────────────────────────────────────────

  function setCreateField(key: keyof CreateForm, value: string) {
    setCreateForm((prev) => ({ ...prev, [key]: value }));
  }

  function openCreateModal() {
    setCreateForm(emptyCreateForm);
    setCreateError('');
    setShowCreateModal(true);
  }

  function handleTenantSelect(tenantId: string) {
    const t = tenantOptions.find((x) => x._id === tenantId);
    setCreateForm((prev) => ({
      ...prev,
      tenantId,
      propertyId: t ? t.propertyId : prev.propertyId,
    }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createForm.tenantId) {
      setCreateError('Please select a tenant.');
      return;
    }
    if (!createForm.propertyId) {
      setCreateError('Property could not be determined from the selected tenant.');
      return;
    }
    if (!createForm.amount || Number(createForm.amount) < 0) {
      setCreateError('Amount is required and must be non-negative.');
      return;
    }
    if (!createForm.dueDate) {
      setCreateError('Due date is required.');
      return;
    }

    setCreateError('');
    setCreating(true);
    try {
      const payload: CreateRentPaymentInput = {
        tenantId: createForm.tenantId,
        propertyId: createForm.propertyId,
        amount: Number(createForm.amount),
        dueDate: new Date(createForm.dueDate).toISOString(),
        status: createForm.status,
        ...(createForm.paidDate
          ? { paidDate: new Date(createForm.paidDate).toISOString() }
          : {}),
        ...(createForm.paymentMethod
          ? { paymentMethod: createForm.paymentMethod as PaymentMethod }
          : {}),
        ...(createForm.chequeNumber.trim()
          ? { chequeNumber: createForm.chequeNumber.trim() }
          : {}),
        ...(createForm.referenceNumber.trim()
          ? { referenceNumber: createForm.referenceNumber.trim() }
          : {}),
        ...(createForm.notes.trim() ? { notes: createForm.notes.trim() } : {}),
      };
      await rentPaymentsApi.create(payload);
      setShowCreateModal(false);
      void loadPayments();
    } catch (err) {
      setCreateError(resolveError(err));
    } finally {
      setCreating(false);
    }
  }

  // ── Edit form helpers ─────────────────────────────────────────────────────

  function openEditModal(p: ApiRentPayment) {
    setEditTarget(p);
    setEditForm(paymentToEditForm(p));
    setEditError('');
  }

  function setEditField(key: keyof EditForm, value: string) {
    setEditForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget || !editForm) return;

    setSaving(true);
    setEditError('');
    try {
      const payload: UpdateRentPaymentInput = {
        amount: Number(editForm.amount),
        dueDate: new Date(editForm.dueDate).toISOString(),
        status: editForm.status,
        ...(editForm.paidDate
          ? { paidDate: new Date(editForm.paidDate).toISOString() }
          : { paidDate: undefined }),
        ...(editForm.paymentMethod
          ? { paymentMethod: editForm.paymentMethod as PaymentMethod }
          : {}),
        ...(editForm.chequeNumber.trim()
          ? { chequeNumber: editForm.chequeNumber.trim() }
          : {}),
        ...(editForm.referenceNumber.trim()
          ? { referenceNumber: editForm.referenceNumber.trim() }
          : {}),
        notes: editForm.notes.trim() || undefined,
      };
      await rentPaymentsApi.update(editTarget._id, payload);
      setEditTarget(null);
      setEditForm(null);
      void loadPayments();
    } catch (err) {
      setEditError(resolveError(err));
    } finally {
      setSaving(false);
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await rentPaymentsApi.remove(deleteTarget._id);
      setDeleteTarget(null);
      void loadPayments();
    } catch {
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  // ── Generate invoices ─────────────────────────────────────────────────────

  function openGenerateModal() {
    setGenerateResult('');
    setGenerateError('');
    setShowGenerate(true);
  }

  async function handleGenerate() {
    setGenerating(true);
    setGenerateError('');
    try {
      const result = await rentPaymentsApi.generate();
      setGenerateResult(result.message);
      void loadPayments();
    } catch (err) {
      setGenerateError(resolveError(err));
    } finally {
      setGenerating(false);
    }
  }

  // ── Label helpers ─────────────────────────────────────────────────────────

  function propertyLabel(propertyId: string): string {
    return propertyOptions.find((p) => p._id === propertyId)?.label ?? '—';
  }

  function tenantLabel(tenantId: string): string {
    const t = tenantOptions.find((x) => x._id === tenantId);
    return t ? `${t.firstName} ${t.lastName}` : `…${tenantId.slice(-6)}`;
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>Rent Payments</h1>
        <div style={s.headerBtns}>
          {isAdmin && (
            <button style={s.generateBtn} type="button" onClick={openGenerateModal}>
              Generate Invoices
            </button>
          )}
          <button style={s.addBtn} type="button" onClick={openCreateModal}>
            + Record Payment
          </button>
        </div>
      </div>

      <div style={s.filterBar}>
        <select
          style={s.filterSelect}
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value as '' | RentPaymentStatus);
            setPage(1);
          }}
        >
          <option value="">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Paid">Paid</option>
          <option value="Overdue">Overdue</option>
          <option value="Partial">Partial</option>
        </select>

        <select
          style={s.filterSelect}
          value={filterProperty}
          onChange={(e) => {
            setFilterProperty(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Properties</option>
          {propertyOptions.map((p) => (
            <option key={p._id} value={p._id}>
              {p.label}
            </option>
          ))}
        </select>

        <select
          style={s.filterSelect}
          value={filterTenant}
          onChange={(e) => {
            setFilterTenant(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Tenants</option>
          {tenantOptions.map((t) => (
            <option key={t._id} value={t._id}>
              {t.firstName} {t.lastName}
            </option>
          ))}
        </select>

        <input
          style={s.monthInput}
          type="month"
          value={filterMonth}
          title="Filter by month"
          onChange={(e) => {
            setFilterMonth(e.target.value);
            setPage(1);
          }}
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
                <th style={s.th}>Tenant</th>
                <th style={s.th}>Property</th>
                <th style={s.th}>Due Date</th>
                <th style={s.th}>Amount</th>
                <th style={s.th}>Status</th>
                <th style={s.th}>Paid Date</th>
                <th style={s.th}>Method</th>
                <th style={s.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ ...s.td, ...s.emptyRow }}>
                    No rent payments found.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr
                    key={p._id}
                    style={p.status === 'Overdue' ? { backgroundColor: '#fff5f5' } : {}}
                  >
                    <td style={{ ...s.td, fontWeight: 500 }}>{tenantLabel(p.tenantId)}</td>
                    <td style={{ ...s.td, fontSize: '0.82rem', color: '#6b7280' }}>
                      {propertyLabel(p.propertyId)}
                    </td>
                    <td style={s.td}>{formatDate(p.dueDate)}</td>
                    <td style={{ ...s.td, fontWeight: 500 }}>{formatAmount(p.amount)}</td>
                    <td style={s.td}>
                      <span style={paymentStatusBadge(p.status)}>{p.status}</span>
                    </td>
                    <td style={{ ...s.td, fontSize: '0.82rem', color: '#6b7280' }}>
                      {formatDate(p.paidDate)}
                    </td>
                    <td style={{ ...s.td, fontSize: '0.82rem', color: '#6b7280' }}>
                      {p.paymentMethod ?? '—'}
                    </td>
                    <td style={s.td}>
                      <button
                        style={{ ...s.actionBtn, ...s.editBtn }}
                        type="button"
                        onClick={() => openEditModal(p)}
                      >
                        Edit
                      </button>
                      <button
                        style={{ ...s.actionBtn, ...s.deleteBtn }}
                        type="button"
                        onClick={() => setDeleteTarget(p)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {meta && meta.totalPages > 1 && (
            <div style={s.pagination}>
              <button
                style={{ ...s.pageBtn, ...(meta.hasPrevPage ? {} : s.pageBtnDisabled) }}
                type="button"
                disabled={!meta.hasPrevPage}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Prev
              </button>
              <span style={s.pageInfo}>
                Page {meta.page} of {meta.totalPages} ({meta.total} total)
              </span>
              <button
                style={{ ...s.pageBtn, ...(meta.hasNextPage ? {} : s.pageBtnDisabled) }}
                type="button"
                disabled={!meta.hasNextPage}
                onClick={() => setPage((p) => p + 1)}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {/* Record Payment modal */}
      {showCreateModal && (
        <div
          style={s.overlay}
          onClick={(e) => e.target === e.currentTarget && setShowCreateModal(false)}
        >
          <div style={s.modal}>
            <h2 style={s.modalTitle}>Record Payment</h2>

            {createError && <div style={s.modalError}>{createError}</div>}

            <form onSubmit={(e) => void handleCreate(e)}>
              <div style={s.field}>
                <label style={s.label} htmlFor="rp-tenant">
                  Tenant *
                </label>
                <select
                  id="rp-tenant"
                  style={s.select}
                  value={createForm.tenantId}
                  onChange={(e) => handleTenantSelect(e.target.value)}
                  disabled={creating}
                  required
                >
                  <option value="">Select tenant…</option>
                  {tenantOptions.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.firstName} {t.lastName}
                    </option>
                  ))}
                </select>
              </div>

              <div style={s.fieldRow}>
                <div style={s.field}>
                  <label style={s.label} htmlFor="rp-amount">
                    Amount (QAR) *
                  </label>
                  <input
                    id="rp-amount"
                    style={s.input}
                    type="number"
                    min="0"
                    step="0.01"
                    value={createForm.amount}
                    onChange={(e) => setCreateField('amount', e.target.value)}
                    disabled={creating}
                    required
                  />
                </div>
                <div style={s.field}>
                  <label style={s.label} htmlFor="rp-duedate">
                    Due Date *
                  </label>
                  <input
                    id="rp-duedate"
                    style={s.input}
                    type="date"
                    value={createForm.dueDate}
                    onChange={(e) => setCreateField('dueDate', e.target.value)}
                    disabled={creating}
                    required
                  />
                </div>
              </div>

              <div style={s.fieldRow}>
                <div style={s.field}>
                  <label style={s.label} htmlFor="rp-status">
                    Status
                  </label>
                  <select
                    id="rp-status"
                    style={s.select}
                    value={createForm.status}
                    onChange={(e) => setCreateField('status', e.target.value)}
                    disabled={creating}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Paid">Paid</option>
                    <option value="Overdue">Overdue</option>
                    <option value="Partial">Partial</option>
                  </select>
                </div>
                <div style={s.field}>
                  <label style={s.label} htmlFor="rp-paiddate">
                    Paid Date
                  </label>
                  <input
                    id="rp-paiddate"
                    style={s.input}
                    type="date"
                    value={createForm.paidDate}
                    onChange={(e) => setCreateField('paidDate', e.target.value)}
                    disabled={creating}
                  />
                </div>
              </div>

              <div style={s.fieldRow}>
                <div style={s.field}>
                  <label style={s.label} htmlFor="rp-method">
                    Payment Method
                  </label>
                  <select
                    id="rp-method"
                    style={s.select}
                    value={createForm.paymentMethod}
                    onChange={(e) => setCreateField('paymentMethod', e.target.value)}
                    disabled={creating}
                  >
                    <option value="">— None —</option>
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={s.field}>
                  <label style={s.label} htmlFor="rp-cheque">
                    Cheque Number
                  </label>
                  <input
                    id="rp-cheque"
                    style={s.input}
                    type="text"
                    value={createForm.chequeNumber}
                    onChange={(e) => setCreateField('chequeNumber', e.target.value)}
                    disabled={creating}
                  />
                </div>
              </div>

              <div style={s.field}>
                <label style={s.label} htmlFor="rp-ref">
                  Reference Number
                </label>
                <input
                  id="rp-ref"
                  style={s.input}
                  type="text"
                  value={createForm.referenceNumber}
                  onChange={(e) => setCreateField('referenceNumber', e.target.value)}
                  disabled={creating}
                />
              </div>

              <div style={s.field}>
                <label style={s.label} htmlFor="rp-notes">
                  Notes
                </label>
                <textarea
                  id="rp-notes"
                  style={s.textarea}
                  value={createForm.notes}
                  onChange={(e) => setCreateField('notes', e.target.value)}
                  disabled={creating}
                />
              </div>

              <div style={s.modalActions}>
                <button
                  style={s.cancelBtn}
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  style={{ ...s.submitBtn, ...(creating ? s.submitBtnDisabled : {}) }}
                  type="submit"
                  disabled={creating}
                >
                  {creating ? 'Saving…' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Payment modal */}
      {editTarget && editForm && (
        <div
          style={s.overlay}
          onClick={(e) => e.target === e.currentTarget && setEditTarget(null)}
        >
          <div style={s.modal}>
            <h2 style={s.modalTitle}>Edit Payment</h2>

            {editError && <div style={s.modalError}>{editError}</div>}

            <form onSubmit={(e) => void handleEdit(e)}>
              <div style={s.fieldRow}>
                <div style={s.field}>
                  <label style={s.label} htmlFor="ep-amount">
                    Amount (QAR) *
                  </label>
                  <input
                    id="ep-amount"
                    style={s.input}
                    type="number"
                    min="0"
                    step="0.01"
                    value={editForm.amount}
                    onChange={(e) => setEditField('amount', e.target.value)}
                    disabled={saving}
                    required
                  />
                </div>
                <div style={s.field}>
                  <label style={s.label} htmlFor="ep-duedate">
                    Due Date *
                  </label>
                  <input
                    id="ep-duedate"
                    style={s.input}
                    type="date"
                    value={editForm.dueDate}
                    onChange={(e) => setEditField('dueDate', e.target.value)}
                    disabled={saving}
                    required
                  />
                </div>
              </div>

              <div style={s.fieldRow}>
                <div style={s.field}>
                  <label style={s.label} htmlFor="ep-status">
                    Status *
                  </label>
                  <select
                    id="ep-status"
                    style={s.select}
                    value={editForm.status}
                    onChange={(e) => setEditField('status', e.target.value)}
                    disabled={saving}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Paid">Paid</option>
                    <option value="Overdue">Overdue</option>
                    <option value="Partial">Partial</option>
                  </select>
                </div>
                <div style={s.field}>
                  <label style={s.label} htmlFor="ep-paiddate">
                    Paid Date
                  </label>
                  <input
                    id="ep-paiddate"
                    style={s.input}
                    type="date"
                    value={editForm.paidDate}
                    onChange={(e) => setEditField('paidDate', e.target.value)}
                    disabled={saving}
                  />
                </div>
              </div>

              <div style={s.fieldRow}>
                <div style={s.field}>
                  <label style={s.label} htmlFor="ep-method">
                    Payment Method
                  </label>
                  <select
                    id="ep-method"
                    style={s.select}
                    value={editForm.paymentMethod}
                    onChange={(e) => setEditField('paymentMethod', e.target.value)}
                    disabled={saving}
                  >
                    <option value="">— None —</option>
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={s.field}>
                  <label style={s.label} htmlFor="ep-cheque">
                    Cheque Number
                  </label>
                  <input
                    id="ep-cheque"
                    style={s.input}
                    type="text"
                    value={editForm.chequeNumber}
                    onChange={(e) => setEditField('chequeNumber', e.target.value)}
                    disabled={saving}
                  />
                </div>
              </div>

              <div style={s.field}>
                <label style={s.label} htmlFor="ep-ref">
                  Reference Number
                </label>
                <input
                  id="ep-ref"
                  style={s.input}
                  type="text"
                  value={editForm.referenceNumber}
                  onChange={(e) => setEditField('referenceNumber', e.target.value)}
                  disabled={saving}
                />
              </div>

              <div style={s.field}>
                <label style={s.label} htmlFor="ep-notes">
                  Notes
                </label>
                <textarea
                  id="ep-notes"
                  style={s.textarea}
                  value={editForm.notes}
                  onChange={(e) => setEditField('notes', e.target.value)}
                  disabled={saving}
                />
              </div>

              <div style={s.modalActions}>
                <button
                  style={s.cancelBtn}
                  type="button"
                  onClick={() => setEditTarget(null)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  style={{ ...s.submitBtn, ...(saving ? s.submitBtnDisabled : {}) }}
                  type="submit"
                  disabled={saving}
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm dialog */}
      {deleteTarget && (
        <div
          style={s.overlay}
          onClick={(e) => e.target === e.currentTarget && setDeleteTarget(null)}
        >
          <div style={{ ...s.modal, width: '400px', padding: '1.5rem' }}>
            <h2 style={{ ...s.modalTitle, marginBottom: '0.75rem' }}>Delete Payment</h2>
            <p style={{ fontSize: '0.875rem', color: '#374151', marginBottom: '1.25rem' }}>
              Are you sure you want to delete this rent payment record (
              <strong>{formatDate(deleteTarget.dueDate)}</strong> —{' '}
              <strong>{formatAmount(deleteTarget.amount)}</strong>)? This action cannot be undone.
            </p>
            <div style={s.modalActions}>
              <button
                style={s.cancelBtn}
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                style={{
                  ...s.submitBtn,
                  backgroundColor: '#dc2626',
                  ...(deleting ? s.submitBtnDisabled : {}),
                }}
                type="button"
                onClick={() => void handleDelete()}
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generate Invoices confirm dialog */}
      {showGenerate && (
        <div
          style={s.overlay}
          onClick={(e) =>
            e.target === e.currentTarget && !generating && setShowGenerate(false)
          }
        >
          <div style={{ ...s.modal, width: '440px', padding: '1.5rem' }}>
            <h2 style={{ ...s.modalTitle, marginBottom: '0.75rem' }}>Generate Invoices</h2>

            {generateResult ? (
              <>
                <div style={s.modalSuccess}>{generateResult}</div>
                <div style={{ ...s.modalActions, marginTop: '0.75rem' }}>
                  <button
                    style={s.cancelBtn}
                    type="button"
                    onClick={() => setShowGenerate(false)}
                  >
                    Close
                  </button>
                </div>
              </>
            ) : (
              <>
                {generateError && <div style={s.modalError}>{generateError}</div>}
                <p style={{ fontSize: '0.875rem', color: '#374151', marginBottom: '1.25rem' }}>
                  This will generate rent invoices for all active tenants who are missing them.
                  The operation is idempotent — no duplicates will be created.
                </p>
                <div style={s.modalActions}>
                  <button
                    style={s.cancelBtn}
                    type="button"
                    onClick={() => setShowGenerate(false)}
                    disabled={generating}
                  >
                    Cancel
                  </button>
                  <button
                    style={{
                      ...s.submitBtn,
                      backgroundColor: '#7c3aed',
                      ...(generating ? s.submitBtnDisabled : {}),
                    }}
                    type="button"
                    onClick={() => void handleGenerate()}
                    disabled={generating}
                  >
                    {generating ? 'Generating…' : 'Generate'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
