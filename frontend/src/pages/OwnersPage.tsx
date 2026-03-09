import { useState, useEffect, useCallback } from 'react';
import { ownerPaymentsApi } from '@api/owner-payments.api';
import { addOwnerPaymentSchema, editOwnerPaymentSchema } from '@validations/owner-payment.form.schema';
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
import { sh } from '@/styles/shared';
import { resolveError, zodFieldErrors } from '@utils/formHelpers';
import type { FieldErrors } from '@utils/formHelpers';
import { Pagination } from '@components/common/Pagination';
import { ConfirmDialog } from '@components/common/ConfirmDialog';
import { formatDateLong } from '@utils/formatDate';
import { formatCurrency } from '@utils/formatCurrency';

// ── Styles ─────────────────────────────────────────────────────────────────

const s = {
  ...sh,
  // page-specific overrides / additions
  field: { marginBottom: '0.875rem', flex: 1 },
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
  summaryBar: { display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' as const },
  summaryCard: {
    padding: '0.6rem 1rem',
    borderRadius: '6px',
    fontSize: '0.82rem',
    fontWeight: 600,
    minWidth: '120px',
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

function formatMonth(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<ApiOwnerPayment | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);

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

  function handleFieldChange(key: keyof FormState, value: string) {
    const newForm = { ...form, [key]: value };
    setForm(newForm);
    const schema = modal?.mode === 'add' ? addOwnerPaymentSchema : editOwnerPaymentSchema;
    const result = schema.safeParse(newForm);
    if (result.success) {
      setFieldErrors((prev) => { const next = { ...prev }; delete next[key as string]; return next; });
    } else {
      const errs = zodFieldErrors(result.error);
      if (errs[key as string]) {
        setFieldErrors((prev) => ({ ...prev, [key]: errs[key as string] }));
      } else {
        setFieldErrors((prev) => { const next = { ...prev }; delete next[key as string]; return next; });
      }
    }
  }

  function openAddModal() {
    setForm(emptyForm);
    setModalError('');
    setFieldErrors({});
    setModal({ mode: 'add' });
  }

  function openEditModal(p: ApiOwnerPayment) {
    setForm(paymentToForm(p));
    setModalError('');
    setFieldErrors({});
    setModal({ mode: 'edit', payment: p });
  }

  function closeModal() { setModal(null); setModalError(''); setFieldErrors({}); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const schema = modal?.mode === 'add' ? addOwnerPaymentSchema : editOwnerPaymentSchema;
    const result = schema.safeParse(form);
    if (!result.success) {
      setFieldErrors(zodFieldErrors(result.error));
      setModalError(result.error.issues[0]?.message ?? 'Please fix the errors above.');
      return;
    }
    setFieldErrors({});
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

  async function handleMarkPaid(id: string) {
    setMarkingPaidId(id);
    try {
      await ownerPaymentsApi.update(id, {
        status: 'Paid',
        paidDate: new Date().toISOString().slice(0, 10),
      });
      void loadPayments();
    } catch {
      // silently ignore — table will retain current state
    } finally {
      setMarkingPaidId(null);
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

  function ownerName(propertyId: string): string {
    return propertyOptions.find((p) => p._id === propertyId)?.ownerName ?? '—';
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
            Pending: {formatCurrency(pendingTotal, 'QAR', 0)}
          </div>
          <div style={{ ...s.summaryCard, backgroundColor: '#d1fae5', color: '#065f46' }}>
            Paid: {formatCurrency(paidTotal, 'QAR', 0)}
          </div>
          {overdueTotal > 0 && (
            <div style={{ ...s.summaryCard, backgroundColor: '#fee2e2', color: '#991b1b' }}>
              Overdue: {formatCurrency(overdueTotal, 'QAR', 0)}
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
                <th style={s.th}>Owner</th>
                <th style={s.th}>Month</th>
                <th style={s.th}>Amount</th>
                <th style={s.th}>Status</th>
                <th style={s.th}>Paid Date</th>
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
                    <td style={{ ...s.td, fontSize: '0.82rem', color: '#6b7280' }}>{ownerName(p.propertyId)}</td>
                    <td style={s.td}>{formatMonth(p.paymentMonth)}</td>
                    <td style={{ ...s.td, fontWeight: 600 }}>{formatCurrency(p.amount, 'QAR', 0)}</td>
                    <td style={s.td}><span style={statusBadge(p.status)}>{p.status}</span></td>
                    <td style={{ ...s.td, fontSize: '0.82rem', color: '#6b7280' }}>{formatDateLong(p.paidDate)}</td>
                    <td style={{ ...s.td, whiteSpace: 'nowrap' as const }}>
                      {p.status !== 'Paid' && (
                        <button
                          style={{ ...s.actionBtn, color: '#065f46' }}
                          type="button"
                          title="Mark as Paid"
                          disabled={markingPaidId === p._id}
                          onClick={() => void handleMarkPaid(p._id)}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </button>
                      )}
                      <button style={{ ...s.actionBtn, ...s.editBtn }} type="button" title="Edit payment" onClick={() => openEditModal(p)}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button style={{ ...s.actionBtn, ...s.deleteBtn }} type="button" title="Delete payment" onClick={() => setDeleteTarget(p)}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          <path d="M10 11v6M14 11v6" />
                          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {meta && <Pagination meta={meta} onPageChange={setPage} />}
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
                <select id="op-property" style={{ ...s.select, ...(fieldErrors.propertyId ? s.inputError : {}) }} value={form.propertyId} onChange={(e) => handleFieldChange('propertyId', e.target.value)} disabled={saving || modal.mode === 'edit'}>
                  <option value="">Select property…</option>
                  {propertyOptions.map((p) => <option key={p._id} value={p._id}>{p.label}</option>)}
                </select>
                {fieldErrors.propertyId && <div style={s.fieldError}>{fieldErrors.propertyId}</div>}
              </div>

              <div style={s.fieldRow}>
                <div style={s.field}>
                  <label style={s.label} htmlFor="op-amount">Amount (QAR) *</label>
                  <input id="op-amount" style={{ ...s.input, ...(fieldErrors.amount ? s.inputError : {}) }} type="number" min="0" step="0.01" value={form.amount} onChange={(e) => handleFieldChange('amount', e.target.value)} disabled={saving} />
                  {fieldErrors.amount && <div style={s.fieldError}>{fieldErrors.amount}</div>}
                </div>
                <div style={s.field}>
                  <label style={s.label} htmlFor="op-month">Payment Month *</label>
                  <input id="op-month" style={{ ...s.input, ...(fieldErrors.paymentMonth ? s.inputError : {}) }} type="month" value={form.paymentMonth} onChange={(e) => handleFieldChange('paymentMonth', e.target.value)} disabled={saving} />
                  {fieldErrors.paymentMonth && <div style={s.fieldError}>{fieldErrors.paymentMonth}</div>}
                </div>
              </div>

              <div style={s.fieldRow}>
                <div style={s.field}>
                  <label style={s.label} htmlFor="op-status">Status</label>
                  <select id="op-status" style={s.select} value={form.status} onChange={(e) => handleFieldChange('status', e.target.value)} disabled={saving}>
                    <option value="Pending">Pending</option>
                    <option value="Paid">Paid</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                </div>
                <div style={s.field}>
                  <label style={s.label} htmlFor="op-paiddate">Paid Date</label>
                  <input id="op-paiddate" style={s.input} type="date" value={form.paidDate} onChange={(e) => handleFieldChange('paidDate', e.target.value)} disabled={saving} />
                </div>
              </div>

              <div style={s.fieldRow}>
                <div style={s.field}>
                  <label style={s.label} htmlFor="op-method">Payment Method</label>
                  <select id="op-method" style={s.select} value={form.paymentMethod} onChange={(e) => handleFieldChange('paymentMethod', e.target.value)} disabled={saving}>
                    <option value="">— None —</option>
                    {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div style={s.field}>
                  <label style={s.label} htmlFor="op-cheque">Cheque Number</label>
                  <input id="op-cheque" style={s.input} type="text" value={form.chequeNumber} onChange={(e) => handleFieldChange('chequeNumber', e.target.value)} disabled={saving} />
                </div>
              </div>

              <div style={s.field}>
                <label style={s.label} htmlFor="op-ref">Reference Number</label>
                <input id="op-ref" style={s.input} type="text" value={form.referenceNumber} onChange={(e) => handleFieldChange('referenceNumber', e.target.value)} disabled={saving} />
              </div>

              <div style={s.field}>
                <label style={s.label} htmlFor="op-notes">Notes</label>
                <textarea id="op-notes" style={s.textarea} value={form.notes} onChange={(e) => handleFieldChange('notes', e.target.value)} disabled={saving} />
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
        <ConfirmDialog
          title="Delete Owner Payment"
          message={
            <>
              Delete the <strong>{formatMonth(deleteTarget.paymentMonth)}</strong> payment of{' '}
              <strong>{formatCurrency(deleteTarget.amount, 'QAR', 0)}</strong>? This cannot be undone.
            </>
          }
          confirmLabel={deleting ? 'Deleting…' : 'Delete'}
          isLoading={deleting}
          isDanger
          onConfirm={() => void handleDelete()}
          onCancel={() => setDeleteTarget(null)}
        />
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
