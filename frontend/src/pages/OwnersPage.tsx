import { useState, useEffect, useCallback } from 'react';
import type { AxiosError } from 'axios';
import { ownerPaymentsApi } from '@api/owner-payments.api';
import type {
  ApiOwnerPayment,
  OwnerPaymentStatus,
  OwnerPaymentMethod,
  CreateOwnerPaymentInput,
  UpdateOwnerPaymentInput,
} from '@api/owner-payments.api';
import type { PaginationMeta } from '@api/users.api';
import { propertiesApi } from '@api/properties.api';
import type { DropdownItem } from '@api/properties.api';
import { useAuth } from '@context/AuthContext';

// ── Styles ─────────────────────────────────────────────────────────────────

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
  summaryBar: { display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' as const },
  summaryCard: {
    padding: '0.6rem 1rem',
    borderRadius: '6px',
    fontSize: '0.82rem',
    fontWeight: 600,
    minWidth: '120px',
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

const STATUS_STYLES: Record<OwnerPaymentStatus, React.CSSProperties> = {
  Pending: { backgroundColor: '#fef9c3', color: '#713f12' },
  Paid: { backgroundColor: '#d1fae5', color: '#065f46' },
  Overdue: { backgroundColor: '#fee2e2', color: '#991b1b' },
};

function statusBadge(status: OwnerPaymentStatus): React.CSSProperties {
  return { ...s.badge, ...STATUS_STYLES[status] };
}

function formatAmount(n: number): string {
  return `${n.toLocaleString()} QAR`;
}

function formatMonth(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

function formatDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function resolveError(err: unknown): string {
  const e = err as AxiosError<{ error?: { code?: string; message?: string } }>;
  const code = e.response?.data?.error?.code;
  switch (code) {
    case 'FORBIDDEN': return e.response?.data?.error?.message ?? 'Permission denied.';
    case 'NOT_FOUND': return e.response?.data?.error?.message ?? 'Resource not found.';
    case 'VALIDATION_ERROR': return e.response?.data?.error?.message ?? 'Validation failed.';
    default: return 'An unexpected error occurred.';
  }
}

const PAYMENT_METHODS: OwnerPaymentMethod[] = ['Cash', 'Cheque', 'Bank Transfer', 'Online', 'Other'];

// ── Form ───────────────────────────────────────────────────────────────────

interface FormState {
  propertyId: string;
  amount: string;
  paymentMonth: string;
  status: OwnerPaymentStatus;
  paidDate: string;
  paymentMethod: OwnerPaymentMethod | '';
  chequeNumber: string;
  referenceNumber: string;
  notes: string;
}

const emptyForm: FormState = {
  propertyId: '',
  amount: '',
  paymentMonth: new Date().toISOString().slice(0, 7), // YYYY-MM
  status: 'Pending',
  paidDate: '',
  paymentMethod: '',
  chequeNumber: '',
  referenceNumber: '',
  notes: '',
};

function paymentToForm(p: ApiOwnerPayment): FormState {
  return {
    propertyId: p.propertyId,
    amount: String(p.amount),
    paymentMonth: p.paymentMonth.slice(0, 7),
    status: p.status,
    paidDate: p.paidDate ? p.paidDate.slice(0, 10) : '',
    paymentMethod: (p.paymentMethod as OwnerPaymentMethod | undefined) ?? '',
    chequeNumber: p.chequeNumber ?? '',
    referenceNumber: p.referenceNumber ?? '',
    notes: p.notes ?? '',
  };
}

// ── Component ──────────────────────────────────────────────────────────────

export default function OwnersPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [payments, setPayments] = useState<ApiOwnerPayment[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  const [filterProperty, setFilterProperty] = useState('');
  const [filterStatus, setFilterStatus] = useState<OwnerPaymentStatus | ''>('');
  const [filterMonth, setFilterMonth] = useState('');

  const [propertyOptions, setPropertyOptions] = useState<DropdownItem[]>([]);

  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; payment?: ApiOwnerPayment } | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<ApiOwnerPayment | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [showGenerate, setShowGenerate] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState('');
  const [generateError, setGenerateError] = useState('');

  useEffect(() => {
    propertiesApi.dropdown().then(setPropertyOptions).catch(() => setPropertyOptions([]));
  }, []);

  const loadPayments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, unknown> = { page, limit: 25 };
      if (filterProperty) params['propertyId'] = filterProperty;
      if (filterStatus) params['status'] = filterStatus;
      if (filterMonth) params['month'] = filterMonth;
      const { payments: data, meta: pageMeta } = await ownerPaymentsApi.list(
        params as Parameters<typeof ownerPaymentsApi.list>[0],
      );
      setPayments(data);
      setMeta(pageMeta);
    } catch {
      setError('Failed to load owner payments.');
    } finally {
      setLoading(false);
    }
  }, [page, filterProperty, filterStatus, filterMonth]);

  useEffect(() => { void loadPayments(); }, [loadPayments]);

  function setField(key: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function openAddModal() {
    setForm(emptyForm);
    setModalError('');
    setModal({ mode: 'add' });
  }

  function openEditModal(p: ApiOwnerPayment) {
    setForm(paymentToForm(p));
    setModalError('');
    setModal({ mode: 'edit', payment: p });
  }

  function closeModal() { setModal(null); setModalError(''); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.propertyId) { setModalError('Please select a property.'); return; }
    if (!form.amount || Number(form.amount) < 0) { setModalError('Amount is required.'); return; }
    if (!form.paymentMonth) { setModalError('Payment month is required.'); return; }

    setModalError('');
    setSaving(true);
    try {
      if (modal?.mode === 'add') {
        const payload: CreateOwnerPaymentInput = {
          propertyId: form.propertyId,
          amount: Number(form.amount),
          paymentMonth: `${form.paymentMonth}-01`,
          status: form.status,
          paidDate: form.paidDate || undefined,
          paymentMethod: form.paymentMethod as OwnerPaymentMethod || undefined,
          chequeNumber: form.chequeNumber || undefined,
          referenceNumber: form.referenceNumber || undefined,
          notes: form.notes || undefined,
        };
        await ownerPaymentsApi.create(payload);
      } else if (modal?.payment) {
        const payload: UpdateOwnerPaymentInput = {
          amount: Number(form.amount),
          paymentMonth: `${form.paymentMonth}-01`,
          status: form.status,
          paidDate: form.paidDate || null,
          paymentMethod: form.paymentMethod as OwnerPaymentMethod || null,
          chequeNumber: form.chequeNumber || null,
          referenceNumber: form.referenceNumber || null,
          notes: form.notes || null,
        };
        await ownerPaymentsApi.update(modal.payment._id, payload);
      }
      closeModal();
      void loadPayments();
    } catch (err) {
      setModalError(resolveError(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await ownerPaymentsApi.remove(deleteTarget._id);
      setDeleteTarget(null);
      void loadPayments();
    } catch {
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    setGenerateError('');
    try {
      const result = await ownerPaymentsApi.generate();
      setGenerateResult(result.message);
      void loadPayments();
    } catch (err) {
      setGenerateError(resolveError(err));
    } finally {
      setGenerating(false);
    }
  }

  function propertyLabel(propertyId: string): string {
    return propertyOptions.find((p) => p._id === propertyId)?.label ?? '—';
  }

  // Summary
  const pendingTotal = payments.filter((p) => p.status === 'Pending').reduce((s, p) => s + p.amount, 0);
  const paidTotal = payments.filter((p) => p.status === 'Paid').reduce((s, p) => s + p.amount, 0);
  const overdueTotal = payments.filter((p) => p.status === 'Overdue').reduce((s, p) => s + p.amount, 0);

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>Owner Payments</h1>
        <div style={s.headerBtns}>
          {isSuperAdmin && (
            <button style={s.generateBtn} type="button" onClick={() => { setGenerateResult(''); setGenerateError(''); setShowGenerate(true); }}>
              Generate Payments
            </button>
          )}
          <button style={s.addBtn} type="button" onClick={openAddModal}>
            + Add Payment
          </button>
        </div>
      </div>

      <div style={s.filterBar}>
        <select style={s.filterSelect} value={filterProperty} onChange={(e) => { setFilterProperty(e.target.value); setPage(1); }}>
          <option value="">All Properties</option>
          {propertyOptions.map((p) => <option key={p._id} value={p._id}>{p.label}</option>)}
        </select>
        <select style={s.filterSelect} value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value as OwnerPaymentStatus | ''); setPage(1); }}>
          <option value="">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Paid">Paid</option>
          <option value="Overdue">Overdue</option>
        </select>
        <input style={s.monthInput} type="month" value={filterMonth} title="Filter by month" onChange={(e) => { setFilterMonth(e.target.value); setPage(1); }} />
      </div>

      {error && <div style={s.errorBanner}>{error}</div>}

      {!loading && payments.length > 0 && (
        <div style={s.summaryBar}>
          <div style={{ ...s.summaryCard, backgroundColor: '#fef9c3', color: '#713f12' }}>
            Pending: {formatAmount(pendingTotal)}
          </div>
          <div style={{ ...s.summaryCard, backgroundColor: '#d1fae5', color: '#065f46' }}>
            Paid: {formatAmount(paidTotal)}
          </div>
          {overdueTotal > 0 && (
            <div style={{ ...s.summaryCard, backgroundColor: '#fee2e2', color: '#991b1b' }}>
              Overdue: {formatAmount(overdueTotal)}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Loading…</p>
      ) : (
        <>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Property</th>
                <th style={s.th}>Month</th>
                <th style={s.th}>Amount</th>
                <th style={s.th}>Status</th>
                <th style={s.th}>Paid Date</th>
                <th style={s.th}>Method</th>
                <th style={s.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr><td colSpan={7} style={{ ...s.td, ...s.emptyRow }}>No owner payments found.</td></tr>
              ) : (
                payments.map((p) => (
                  <tr key={p._id} style={p.status === 'Overdue' ? { backgroundColor: '#fff5f5' } : {}}>
                    <td style={s.td}>{propertyLabel(p.propertyId)}</td>
                    <td style={s.td}>{formatMonth(p.paymentMonth)}</td>
                    <td style={{ ...s.td, fontWeight: 600 }}>{formatAmount(p.amount)}</td>
                    <td style={s.td}><span style={statusBadge(p.status)}>{p.status}</span></td>
                    <td style={{ ...s.td, fontSize: '0.82rem', color: '#6b7280' }}>{formatDate(p.paidDate)}</td>
                    <td style={{ ...s.td, fontSize: '0.82rem', color: '#6b7280' }}>{p.paymentMethod ?? '—'}</td>
                    <td style={s.td}>
                      <button style={{ ...s.actionBtn, ...s.editBtn }} type="button" onClick={() => openEditModal(p)}>Edit</button>
                      <button style={{ ...s.actionBtn, ...s.deleteBtn }} type="button" onClick={() => setDeleteTarget(p)}>Delete</button>
                    </td>
                  </tr>
                ))
              )}
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

      {/* Add / Edit modal */}
      {modal && (
        <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div style={s.modal}>
            <h2 style={s.modalTitle}>{modal.mode === 'add' ? 'Add Owner Payment' : 'Edit Owner Payment'}</h2>
            {modalError && <div style={s.modalError}>{modalError}</div>}
            <form onSubmit={(e) => void handleSubmit(e)}>
              <div style={s.field}>
                <label style={s.label} htmlFor="op-property">Property *</label>
                <select id="op-property" style={s.select} value={form.propertyId} onChange={(e) => setField('propertyId', e.target.value)} disabled={saving || modal.mode === 'edit'} required>
                  <option value="">Select property…</option>
                  {propertyOptions.map((p) => <option key={p._id} value={p._id}>{p.label}</option>)}
                </select>
              </div>

              <div style={s.fieldRow}>
                <div style={s.field}>
                  <label style={s.label} htmlFor="op-amount">Amount (QAR) *</label>
                  <input id="op-amount" style={s.input} type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setField('amount', e.target.value)} disabled={saving} required />
                </div>
                <div style={s.field}>
                  <label style={s.label} htmlFor="op-month">Payment Month *</label>
                  <input id="op-month" style={s.input} type="month" value={form.paymentMonth} onChange={(e) => setField('paymentMonth', e.target.value)} disabled={saving} required />
                </div>
              </div>

              <div style={s.fieldRow}>
                <div style={s.field}>
                  <label style={s.label} htmlFor="op-status">Status</label>
                  <select id="op-status" style={s.select} value={form.status} onChange={(e) => setField('status', e.target.value)} disabled={saving}>
                    <option value="Pending">Pending</option>
                    <option value="Paid">Paid</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                </div>
                <div style={s.field}>
                  <label style={s.label} htmlFor="op-paiddate">Paid Date</label>
                  <input id="op-paiddate" style={s.input} type="date" value={form.paidDate} onChange={(e) => setField('paidDate', e.target.value)} disabled={saving} />
                </div>
              </div>

              <div style={s.fieldRow}>
                <div style={s.field}>
                  <label style={s.label} htmlFor="op-method">Payment Method</label>
                  <select id="op-method" style={s.select} value={form.paymentMethod} onChange={(e) => setField('paymentMethod', e.target.value)} disabled={saving}>
                    <option value="">— None —</option>
                    {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div style={s.field}>
                  <label style={s.label} htmlFor="op-cheque">Cheque Number</label>
                  <input id="op-cheque" style={s.input} type="text" value={form.chequeNumber} onChange={(e) => setField('chequeNumber', e.target.value)} disabled={saving} />
                </div>
              </div>

              <div style={s.field}>
                <label style={s.label} htmlFor="op-ref">Reference Number</label>
                <input id="op-ref" style={s.input} type="text" value={form.referenceNumber} onChange={(e) => setField('referenceNumber', e.target.value)} disabled={saving} />
              </div>

              <div style={s.field}>
                <label style={s.label} htmlFor="op-notes">Notes</label>
                <textarea id="op-notes" style={s.textarea} value={form.notes} onChange={(e) => setField('notes', e.target.value)} disabled={saving} />
              </div>

              <div style={s.modalActions}>
                <button style={s.cancelBtn} type="button" onClick={closeModal} disabled={saving}>Cancel</button>
                <button style={{ ...s.submitBtn, ...(saving ? s.submitBtnDisabled : {}) }} type="submit" disabled={saving}>
                  {saving ? 'Saving…' : modal.mode === 'add' ? 'Add Payment' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && setDeleteTarget(null)}>
          <div style={{ ...s.modal, width: '400px', padding: '1.5rem' }}>
            <h2 style={{ ...s.modalTitle, marginBottom: '0.75rem' }}>Delete Owner Payment</h2>
            <p style={{ fontSize: '0.875rem', color: '#374151', marginBottom: '1.25rem' }}>
              Delete the <strong>{formatMonth(deleteTarget.paymentMonth)}</strong> payment of{' '}
              <strong>{formatAmount(deleteTarget.amount)}</strong>? This cannot be undone.
            </p>
            <div style={s.modalActions}>
              <button style={s.cancelBtn} type="button" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</button>
              <button style={{ ...s.submitBtn, backgroundColor: '#dc2626', ...(deleting ? s.submitBtnDisabled : {}) }} type="button" onClick={() => void handleDelete()} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generate payments confirm */}
      {showGenerate && (
        <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && !generating && setShowGenerate(false)}>
          <div style={{ ...s.modal, width: '440px', padding: '1.5rem' }}>
            <h2 style={{ ...s.modalTitle, marginBottom: '0.75rem' }}>Generate Owner Payments</h2>
            {generateResult ? (
              <>
                <div style={s.modalSuccess}>{generateResult}</div>
                <div style={{ ...s.modalActions, marginTop: '0.75rem' }}>
                  <button style={s.cancelBtn} type="button" onClick={() => setShowGenerate(false)}>Close</button>
                </div>
              </>
            ) : (
              <>
                {generateError && <div style={s.modalError}>{generateError}</div>}
                <p style={{ fontSize: '0.875rem', color: '#374151', marginBottom: '1.25rem' }}>
                  This will generate owner payment records for all properties with an owner rental
                  configuration. The operation is idempotent — no duplicates will be created.
                </p>
                <div style={s.modalActions}>
                  <button style={s.cancelBtn} type="button" onClick={() => setShowGenerate(false)} disabled={generating}>Cancel</button>
                  <button style={{ ...s.submitBtn, backgroundColor: '#7c3aed', ...(generating ? s.submitBtnDisabled : {}) }} type="button" onClick={() => void handleGenerate()} disabled={generating}>
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
