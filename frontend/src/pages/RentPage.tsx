import { useState, useEffect, useCallback } from 'react';
import { rentPaymentsApi } from '@api/rent-payments.api';
import { createRentPaymentSchema, editRentPaymentSchema } from '@validations/rent-payment.form.schema';
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
import { sh } from '@/styles/shared';
import { resolveError, zodFieldErrors } from '@utils/formHelpers';
import type { FieldErrors } from '@utils/formHelpers';
import { Pagination } from '@components/common/Pagination';
import { ConfirmDialog } from '@components/common/ConfirmDialog';
import { formatDateLong } from '@utils/formatDate';

// ── Styles ────────────────────────────────────────────────────────────────────

const s = {
  ...sh,
  headerBtns: { display: 'flex', gap: '0.75rem' },
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
  monthInput: {
    padding: '0.45rem 0.65rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '0.875rem',
    color: '#111',
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

function formatAmount(n: number): string {
  return `${n.toLocaleString()} QAR`;
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
  const [createFieldErrors, setCreateFieldErrors] = useState<FieldErrors>({});
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Edit payment modal
  const [editTarget, setEditTarget] = useState<ApiRentPayment | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [editFieldErrors, setEditFieldErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<ApiRentPayment | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Mark as paid
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);
  const [confirmPayTarget, setConfirmPayTarget] = useState<ApiRentPayment | null>(null);

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

  function handleCreateFieldChange(key: keyof CreateForm, value: string) {
    const newForm = { ...createForm, [key]: value };
    setCreateForm(newForm);
    const result = createRentPaymentSchema.safeParse(newForm);
    if (result.success) {
      setCreateFieldErrors((prev) => { const next = { ...prev }; delete next[key as string]; return next; });
    } else {
      const errs = zodFieldErrors(result.error);
      if (errs[key as string]) {
        setCreateFieldErrors((prev) => ({ ...prev, [key]: errs[key as string] }));
      } else {
        setCreateFieldErrors((prev) => { const next = { ...prev }; delete next[key as string]; return next; });
      }
    }
  }

  function openCreateModal() {
    setCreateForm(emptyCreateForm);
    setCreateError('');
    setCreateFieldErrors({});
    setShowCreateModal(true);
  }

  function handleTenantSelect(tenantId: string) {
    const t = tenantOptions.find((x) => x._id === tenantId);
    const newForm = { ...createForm, tenantId, propertyId: t ? t.propertyId : createForm.propertyId };
    setCreateForm(newForm);
    const result = createRentPaymentSchema.safeParse(newForm);
    if (!result.success) {
      const errs = zodFieldErrors(result.error);
      if (errs.tenantId) setCreateFieldErrors((prev) => ({ ...prev, tenantId: errs.tenantId }));
      else setCreateFieldErrors((prev) => { const next = { ...prev }; delete next.tenantId; return next; });
    } else {
      setCreateFieldErrors((prev) => { const next = { ...prev }; delete next.tenantId; return next; });
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const result = createRentPaymentSchema.safeParse(createForm);
    if (!result.success) {
      setCreateFieldErrors(zodFieldErrors(result.error));
      setCreateError(result.error.issues[0]?.message ?? 'Please fix the errors above.');
      return;
    }
    setCreateFieldErrors({});
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

  function handleEditFieldChange(key: keyof EditForm, value: string) {
    if (!editForm) return;
    const newForm = { ...editForm, [key]: value };
    setEditForm(newForm);
    const result = editRentPaymentSchema.safeParse(newForm);
    if (result.success) {
      setEditFieldErrors((prev) => { const next = { ...prev }; delete next[key as string]; return next; });
    } else {
      const errs = zodFieldErrors(result.error);
      if (errs[key as string]) {
        setEditFieldErrors((prev) => ({ ...prev, [key]: errs[key as string] }));
      } else {
        setEditFieldErrors((prev) => { const next = { ...prev }; delete next[key as string]; return next; });
      }
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget || !editForm) return;

    const result = editRentPaymentSchema.safeParse(editForm);
    if (!result.success) {
      setEditFieldErrors(zodFieldErrors(result.error));
      setEditError(result.error.issues[0]?.message ?? 'Please fix the errors above.');
      return;
    }
    setEditFieldErrors({});
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

  // ── Mark as paid ─────────────────────────────────────────────────────────

  async function handleMarkPaid(paymentId: string) {
    setMarkingPaidId(paymentId);
    try {
      const updated = await rentPaymentsApi.update(paymentId, {
        status: 'Paid',
        paidDate: new Date().toISOString(),
      });
      setPayments((prev) => prev.map((p) => (p._id === paymentId ? { ...p, ...updated } : p)));
      setConfirmPayTarget(null);
    } catch {
      // silently ignore — user can retry
    } finally {
      setMarkingPaidId(null);
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
              Generate All Rent
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
          {/* Summary cards */}
          {(() => {
            const todayEnd = new Date();
            todayEnd.setHours(23, 59, 59, 999);
            const paid = payments.filter((p) => p.status === 'Paid');
            const due = payments.filter(
              (p) => p.status !== 'Paid' && new Date(p.dueDate) <= todayEnd,
            );
            const sumAmt = (arr: ApiRentPayment[]) => arr.reduce((acc, p) => acc + p.amount, 0);
            return (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div
                  style={{
                    backgroundColor: '#d1fae5',
                    border: '1px solid #a7f3d0',
                    borderRadius: '8px',
                    padding: '1.25rem 1.5rem',
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      color: '#065f46',
                      textTransform: 'uppercase' as const,
                      letterSpacing: '0.05em',
                      marginBottom: '0.5rem',
                    }}
                  >
                    Total Paid
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#065f46' }}>
                    {formatAmount(sumAmt(paid))}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#059669', marginTop: '0.25rem' }}>
                    {paid.length} payment{paid.length !== 1 ? 's' : ''}
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: '#fef3c7',
                    border: '1px solid #fde68a',
                    borderRadius: '8px',
                    padding: '1.25rem 1.5rem',
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      color: '#92400e',
                      textTransform: 'uppercase' as const,
                      letterSpacing: '0.05em',
                      marginBottom: '0.5rem',
                    }}
                  >
                    Total Due
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#92400e' }}>
                    {formatAmount(sumAmt(due))}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#d97706', marginTop: '0.25rem' }}>
                    {due.length} payment{due.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            );
          })()}

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
                    <td style={s.td}>{formatDateLong(p.dueDate)}</td>
                    <td style={{ ...s.td, fontWeight: 500 }}>{formatAmount(p.amount)}</td>
                    <td style={s.td}>
                      <span style={paymentStatusBadge(p.status)}>{p.status}</span>
                    </td>
                    <td style={{ ...s.td, fontSize: '0.82rem', color: '#6b7280' }}>
                      {formatDateLong(p.paidDate)}
                    </td>
                    <td style={{ ...s.td, fontSize: '0.82rem', color: '#6b7280' }}>
                      {p.paymentMethod ?? '—'}
                    </td>
                    <td style={s.td}>
                      {p.status !== 'Paid' && (
                        <button
                          type="button"
                          disabled={markingPaidId === p._id}
                          onClick={() => setConfirmPayTarget(p)}
                          style={{
                            padding: '0.25rem 0.6rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            border: 'none',
                            borderRadius: '4px',
                            cursor: markingPaidId === p._id ? 'not-allowed' : 'pointer',
                            backgroundColor: '#d1fae5',
                            color: '#065f46',
                            opacity: markingPaidId === p._id ? 0.6 : 1,
                            whiteSpace: 'nowrap' as const,
                          }}
                        >
                          {markingPaidId === p._id ? '…' : '✓ Mark Paid'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {meta && <Pagination meta={meta} onPageChange={setPage} />}
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
                  style={{ ...s.select, ...(createFieldErrors.tenantId ? s.inputError : {}) }}
                  value={createForm.tenantId}
                  onChange={(e) => handleTenantSelect(e.target.value)}
                  disabled={creating}
                >
                  <option value="">Select tenant…</option>
                  {tenantOptions.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.firstName} {t.lastName}
                    </option>
                  ))}
                </select>
                {createFieldErrors.tenantId && <div style={s.fieldError}>{createFieldErrors.tenantId}</div>}
              </div>

              <div style={s.fieldRow}>
                <div style={{ ...s.field, flex: 1 }}>
                  <label style={s.label} htmlFor="rp-amount">
                    Amount (QAR) *
                  </label>
                  <input
                    id="rp-amount"
                    style={{ ...s.input, ...(createFieldErrors.amount ? s.inputError : {}) }}
                    type="number"
                    min="0"
                    step="0.01"
                    value={createForm.amount}
                    onChange={(e) => handleCreateFieldChange('amount', e.target.value)}
                    disabled={creating}
                  />
                  {createFieldErrors.amount && <div style={s.fieldError}>{createFieldErrors.amount}</div>}
                </div>
                <div style={{ ...s.field, flex: 1 }}>
                  <label style={s.label} htmlFor="rp-duedate">
                    Due Date *
                  </label>
                  <input
                    id="rp-duedate"
                    style={{ ...s.input, ...(createFieldErrors.dueDate ? s.inputError : {}) }}
                    type="date"
                    value={createForm.dueDate}
                    onChange={(e) => handleCreateFieldChange('dueDate', e.target.value)}
                    disabled={creating}
                  />
                  {createFieldErrors.dueDate && <div style={s.fieldError}>{createFieldErrors.dueDate}</div>}
                </div>
              </div>

              <div style={s.fieldRow}>
                <div style={{ ...s.field, flex: 1 }}>
                  <label style={s.label} htmlFor="rp-status">
                    Status
                  </label>
                  <select
                    id="rp-status"
                    style={s.select}
                    value={createForm.status}
                    onChange={(e) => handleCreateFieldChange('status', e.target.value)}
                    disabled={creating}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Paid">Paid</option>
                    <option value="Overdue">Overdue</option>
                    <option value="Partial">Partial</option>
                  </select>
                </div>
                <div style={{ ...s.field, flex: 1 }}>
                  <label style={s.label} htmlFor="rp-paiddate">
                    Paid Date
                  </label>
                  <input
                    id="rp-paiddate"
                    style={s.input}
                    type="date"
                    value={createForm.paidDate}
                    onChange={(e) => handleCreateFieldChange('paidDate', e.target.value)}
                    disabled={creating}
                  />
                </div>
              </div>

              <div style={s.fieldRow}>
                <div style={{ ...s.field, flex: 1 }}>
                  <label style={s.label} htmlFor="rp-method">
                    Payment Method
                  </label>
                  <select
                    id="rp-method"
                    style={s.select}
                    value={createForm.paymentMethod}
                    onChange={(e) => handleCreateFieldChange('paymentMethod', e.target.value)}
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
                <div style={{ ...s.field, flex: 1 }}>
                  <label style={s.label} htmlFor="rp-cheque">
                    Cheque Number
                  </label>
                  <input
                    id="rp-cheque"
                    style={s.input}
                    type="text"
                    value={createForm.chequeNumber}
                    onChange={(e) => handleCreateFieldChange('chequeNumber', e.target.value)}
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
                  onChange={(e) => handleCreateFieldChange('referenceNumber', e.target.value)}
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
                  onChange={(e) => handleCreateFieldChange('notes', e.target.value)}
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
                <div style={{ ...s.field, flex: 1 }}>
                  <label style={s.label} htmlFor="ep-amount">
                    Amount (QAR) *
                  </label>
                  <input
                    id="ep-amount"
                    style={{ ...s.input, ...(editFieldErrors.amount ? s.inputError : {}) }}
                    type="number"
                    min="0"
                    step="0.01"
                    value={editForm.amount}
                    onChange={(e) => handleEditFieldChange('amount', e.target.value)}
                    disabled={saving}
                  />
                  {editFieldErrors.amount && <div style={s.fieldError}>{editFieldErrors.amount}</div>}
                </div>
                <div style={{ ...s.field, flex: 1 }}>
                  <label style={s.label} htmlFor="ep-duedate">
                    Due Date *
                  </label>
                  <input
                    id="ep-duedate"
                    style={{ ...s.input, ...(editFieldErrors.dueDate ? s.inputError : {}) }}
                    type="date"
                    value={editForm.dueDate}
                    onChange={(e) => handleEditFieldChange('dueDate', e.target.value)}
                    disabled={saving}
                  />
                  {editFieldErrors.dueDate && <div style={s.fieldError}>{editFieldErrors.dueDate}</div>}
                </div>
              </div>

              <div style={s.fieldRow}>
                <div style={{ ...s.field, flex: 1 }}>
                  <label style={s.label} htmlFor="ep-status">
                    Status *
                  </label>
                  <select
                    id="ep-status"
                    style={s.select}
                    value={editForm.status}
                    onChange={(e) => handleEditFieldChange('status', e.target.value)}
                    disabled={saving}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Paid">Paid</option>
                    <option value="Overdue">Overdue</option>
                    <option value="Partial">Partial</option>
                  </select>
                </div>
                <div style={{ ...s.field, flex: 1 }}>
                  <label style={s.label} htmlFor="ep-paiddate">
                    Paid Date
                  </label>
                  <input
                    id="ep-paiddate"
                    style={s.input}
                    type="date"
                    value={editForm.paidDate}
                    onChange={(e) => handleEditFieldChange('paidDate', e.target.value)}
                    disabled={saving}
                  />
                </div>
              </div>

              <div style={s.fieldRow}>
                <div style={{ ...s.field, flex: 1 }}>
                  <label style={s.label} htmlFor="ep-method">
                    Payment Method
                  </label>
                  <select
                    id="ep-method"
                    style={s.select}
                    value={editForm.paymentMethod}
                    onChange={(e) => handleEditFieldChange('paymentMethod', e.target.value)}
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
                <div style={{ ...s.field, flex: 1 }}>
                  <label style={s.label} htmlFor="ep-cheque">
                    Cheque Number
                  </label>
                  <input
                    id="ep-cheque"
                    style={s.input}
                    type="text"
                    value={editForm.chequeNumber}
                    onChange={(e) => handleEditFieldChange('chequeNumber', e.target.value)}
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
                  onChange={(e) => handleEditFieldChange('referenceNumber', e.target.value)}
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
                  onChange={(e) => handleEditFieldChange('notes', e.target.value)}
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

      {/* Mark as Paid confirm dialog */}
      {confirmPayTarget && (
        <div
          style={s.overlay}
          onClick={(e) =>
            e.target === e.currentTarget && !markingPaidId && setConfirmPayTarget(null)
          }
        >
          <div style={{ ...s.modal, width: '420px', padding: '1.5rem' }}>
            <h2 style={{ ...s.modalTitle, marginBottom: '0.75rem' }}>Confirm Payment</h2>
            <p style={{ fontSize: '0.875rem', color: '#374151', marginBottom: '1rem' }}>
              Are you sure you want to mark this payment as paid?
            </p>

            {/* Payment details summary */}
            <div
              style={{
                backgroundColor: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1rem',
                fontSize: '0.875rem',
              }}
            >
              {(
                [
                  ['Tenant', tenantLabel(confirmPayTarget.tenantId)],
                  ['Property', propertyLabel(confirmPayTarget.propertyId)],
                  ['Due Date', formatDateLong(confirmPayTarget.dueDate)],
                  ['Amount', formatAmount(confirmPayTarget.amount)],
                  ['Current Status', confirmPayTarget.status],
                ] as [string, string][]
              ).map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.3rem 0',
                    borderBottom: label === 'Current Status' ? 'none' : '1px solid #f3f4f6',
                  }}
                >
                  <span style={{ color: '#6b7280' }}>{label}</span>
                  <span style={{ fontWeight: 600, color: '#1f2937' }}>{value}</span>
                </div>
              ))}
            </div>

            <p style={{ fontSize: '0.78rem', color: '#6b7280', marginBottom: '1.25rem' }}>
              Today's date will be recorded as the paid date. This action cannot be undone.
            </p>

            <div style={s.modalActions}>
              <button
                style={s.cancelBtn}
                type="button"
                onClick={() => setConfirmPayTarget(null)}
                disabled={!!markingPaidId}
              >
                Cancel
              </button>
              <button
                style={{
                  ...s.submitBtn,
                  backgroundColor: '#059669',
                  ...(markingPaidId === confirmPayTarget._id ? s.submitBtnDisabled : {}),
                }}
                type="button"
                onClick={() => void handleMarkPaid(confirmPayTarget._id)}
                disabled={markingPaidId === confirmPayTarget._id}
              >
                {markingPaidId === confirmPayTarget._id ? 'Processing…' : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm dialog */}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete Payment"
          message={
            <>
              Are you sure you want to delete this rent payment record (
              <strong>{formatDateLong(deleteTarget.dueDate)}</strong> —{' '}
              <strong>{formatAmount(deleteTarget.amount)}</strong>)? This action cannot be undone.
            </>
          }
          confirmLabel={deleting ? 'Deleting…' : 'Delete'}
          isLoading={deleting}
          isDanger
          onConfirm={() => void handleDelete()}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Generate All Rent confirm dialog */}
      {showGenerate && (
        <div
          style={s.overlay}
          onClick={(e) =>
            e.target === e.currentTarget && !generating && setShowGenerate(false)
          }
        >
          <div style={{ ...s.modal, width: '440px', padding: '1.5rem' }}>
            <h2 style={{ ...s.modalTitle, marginBottom: '0.75rem' }}>Generate All Rent</h2>

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
