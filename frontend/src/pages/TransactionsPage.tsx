import { useState, useEffect, useCallback, useRef } from 'react';
import { transactionsApi } from '@api/transactions.api';
import { transactionSchema } from '@validations/transaction.form.schema';
import type {
  ApiTransaction,
  TransactionType,
  RecurringFrequency,
  CreateTransactionInput,
  UpdateTransactionInput,
  ListTransactionsParams,
} from '@api/transactions.api';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '@api/transactions.api';
import type { PaginationMeta } from '@api/users.api';
import { propertiesApi } from '@api/properties.api';
import type { DropdownItem } from '@api/properties.api';
import { tenantsApi } from '@api/tenants.api';
import type { TenantDropdownItem } from '@api/tenants.api';
import { sh } from '@/styles/shared';
import { resolveError, zodFieldErrors } from '@utils/formHelpers';
import type { FieldErrors } from '@utils/formHelpers';
import { Pagination } from '@components/common/Pagination';
import { ConfirmDialog } from '@components/common/ConfirmDialog';
import { formatDateLong } from '@utils/formatDate';
import { formatCurrency } from '@utils/formatCurrency';

// ── Styles ────────────────────────────────────────────────────────────────────

const s = {
  ...sh,
  // Page-specific styles not covered by shared
  dateInput: {
    padding: '0.45rem 0.65rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '0.875rem',
    color: '#111',
  },
  filterLabel: { fontSize: '0.78rem', color: '#6b7280', whiteSpace: 'nowrap' as const },
  summaryBar: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '1rem',
    flexWrap: 'wrap' as const,
  },
  summaryCard: {
    padding: '0.6rem 1rem',
    borderRadius: '6px',
    fontSize: '0.82rem',
    fontWeight: 600,
  },
  checkboxRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.875rem',
  },
  sectionTitle: {
    fontSize: '0.78rem',
    fontWeight: 700,
    color: '#6b7280',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: '0.5rem',
    marginTop: '1rem',
    paddingBottom: '0.35rem',
    borderBottom: '1px solid #f3f4f6',
  },
  // Override field to add flex: 1 for use inside fieldRow
  field: { marginBottom: '0.875rem', flex: 1 } as const,
  // Modal width override for this page (wider form)
  modal: { ...sh.modal, width: '560px' } as const,
} as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function typeBadgeStyle(type: TransactionType): React.CSSProperties {
  return {
    ...s.badge,
    ...(type === 'Income'
      ? { backgroundColor: '#d1fae5', color: '#065f46' }
      : { backgroundColor: '#fee2e2', color: '#991b1b' }),
  };
}

const PAYMENT_METHODS = [
  'Cash',
  'Cheque',
  'Bank Transfer',
  'Credit Card',
  'Debit Card',
  'Online Transfer',
  'Other',
];

// ── Form state ────────────────────────────────────────────────────────────────

interface FormState {
  type: TransactionType | '';
  category: string;
  amount: string;
  transactionDate: string;
  description: string;
  paymentMethod: string;
  referenceNumber: string;
  propertyId: string;
  tenantId: string;
  isRecurring: boolean;
  recurringFrequency: RecurringFrequency | '';
}

const emptyForm: FormState = {
  type: 'Income',
  category: '',
  amount: '',
  transactionDate: new Date().toISOString().slice(0, 10),
  description: '',
  paymentMethod: '',
  referenceNumber: '',
  propertyId: '',
  tenantId: '',
  isRecurring: false,
  recurringFrequency: '',
};

function transactionToForm(t: ApiTransaction): FormState {
  return {
    type: t.type,
    category: t.category,
    amount: String(t.amount),
    transactionDate: t.transactionDate.slice(0, 10),
    description: t.description ?? '',
    paymentMethod: t.paymentMethod ?? '',
    referenceNumber: t.referenceNumber ?? '',
    propertyId: t.propertyId ?? '',
    tenantId: t.tenantId ?? '',
    isRecurring: t.isRecurring,
    recurringFrequency: t.recurringFrequency ?? '',
  };
}

function formToCreatePayload(f: FormState): CreateTransactionInput {
  const strOpt = (v: string) => (v.trim() !== '' ? v.trim() : undefined);
  return {
    type: f.type as TransactionType,
    category: f.category.trim(),
    amount: Number(f.amount),
    transactionDate: new Date(f.transactionDate).toISOString(),
    description: strOpt(f.description),
    paymentMethod: strOpt(f.paymentMethod),
    referenceNumber: strOpt(f.referenceNumber),
    propertyId: strOpt(f.propertyId),
    tenantId: strOpt(f.tenantId),
    isRecurring: f.isRecurring,
    recurringFrequency:
      f.isRecurring && f.recurringFrequency ? f.recurringFrequency : undefined,
  };
}

function formToUpdatePayload(f: FormState): UpdateTransactionInput {
  const strOpt = (v: string) => (v.trim() !== '' ? v.trim() : undefined);
  return {
    type: f.type as TransactionType,
    category: f.category.trim(),
    amount: Number(f.amount),
    transactionDate: new Date(f.transactionDate).toISOString(),
    description: strOpt(f.description),
    paymentMethod: strOpt(f.paymentMethod),
    referenceNumber: strOpt(f.referenceNumber),
    isRecurring: f.isRecurring,
    recurringFrequency:
      f.isRecurring && f.recurringFrequency ? f.recurringFrequency : undefined,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<ApiTransaction[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  // Filters
  const [filterType, setFilterType] = useState<TransactionType | ''>('');
  const [filterProperty, setFilterProperty] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [propertyOptions, setPropertyOptions] = useState<DropdownItem[]>([]);
  const [tenantOptions, setTenantOptions] = useState<TenantDropdownItem[]>([]);

  // Modal state
  const [modal, setModal] = useState<{
    mode: 'add' | 'edit';
    transaction?: ApiTransaction;
  } | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<ApiTransaction | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Load dropdowns once
  useEffect(() => {
    propertiesApi.dropdown().then(setPropertyOptions).catch(() => setPropertyOptions([]));
    tenantsApi.dropdown().then(setTenantOptions).catch(() => setTenantOptions([]));
  }, []);

  // Debounce search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: ListTransactionsParams = { page, limit: 25 };
      if (filterType) params.type = filterType;
      if (filterProperty) params.propertyId = filterProperty;
      if (filterFrom) params.from = new Date(filterFrom).toISOString();
      if (filterTo) params.to = new Date(filterTo).toISOString();
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();

      const { transactions: data, meta: pageMeta } = await transactionsApi.list(params);
      setTransactions(data);
      setMeta(pageMeta);
    } catch {
      setError('Failed to load transactions. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, filterType, filterProperty, filterFrom, filterTo, debouncedSearch]);

  useEffect(() => {
    void loadTransactions();
  }, [loadTransactions]);

  // ── Modal helpers ─────────────────────────────────────────────────────────

  function openAddModal() {
    setForm(emptyForm);
    setModalError('');
    setModal({ mode: 'add' });
  }

  function openEditModal(t: ApiTransaction) {
    setForm(transactionToForm(t));
    setModalError('');
    setModal({ mode: 'edit', transaction: t });
  }

  function closeModal() {
    setModal(null);
    setModalError('');
    setFieldErrors({});
  }

  function handleFieldChange<K extends keyof FormState>(key: K, value: FormState[K]) {
    const newForm = { ...form, [key]: value };
    setForm(newForm);
    const result = transactionSchema.safeParse(newForm);
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = transactionSchema.safeParse(form);
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
        await transactionsApi.create(formToCreatePayload(form));
      } else if (modal?.transaction) {
        await transactionsApi.update(modal.transaction._id, formToUpdatePayload(form));
      }
      closeModal();
      void loadTransactions();
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
      await transactionsApi.remove(deleteTarget._id);
      setDeleteTarget(null);
      void loadTransactions();
    } catch {
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  // ── Label helpers ─────────────────────────────────────────────────────────

  function propertyLabel(propertyId?: string): string {
    if (!propertyId) return '—';
    return propertyOptions.find((p) => p._id === propertyId)?.label ?? '—';
  }

  // Summary of visible transactions
  const incomeItems = transactions.filter((t) => t.type === 'Income');
  const expenseItems = transactions.filter((t) => t.type === 'Expense');
  const totalIncome = incomeItems.reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = expenseItems.reduce((sum, t) => sum + t.amount, 0);
  const netProfit = totalIncome - totalExpense;

  // Category suggestions based on selected type
  const categorySuggestions =
    form.type === 'Income'
      ? INCOME_CATEGORIES
      : form.type === 'Expense'
        ? EXPENSE_CATEGORIES
        : [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>Transactions</h1>
        <button style={s.addBtn} type="button" onClick={openAddModal}>
          + Add Transaction
        </button>
      </div>

      {/* Summary cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1rem',
          marginBottom: '1.25rem',
        }}
      >
        <div
          style={{
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '1rem 1.25rem',
            borderLeft: '4px solid #059669',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}
        >
          <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
            Total Income
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#059669' }}>
            {formatCurrency(totalIncome, 'QAR', 0)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.2rem' }}>
            {incomeItems.length} transaction{incomeItems.length !== 1 ? 's' : ''}
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '1rem 1.25rem',
            borderLeft: '4px solid #dc2626',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}
        >
          <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
            Total Expenses
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#dc2626' }}>
            {formatCurrency(totalExpense, 'QAR', 0)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.2rem' }}>
            {expenseItems.length} transaction{expenseItems.length !== 1 ? 's' : ''}
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '1rem 1.25rem',
            borderLeft: `4px solid ${netProfit >= 0 ? '#1d4ed8' : '#ea580c'}`,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}
        >
          <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
            Net Profit
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: netProfit >= 0 ? '#1d4ed8' : '#ea580c' }}>
            {netProfit >= 0 ? '' : '−'}{formatCurrency(Math.abs(netProfit), 'QAR', 0)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.2rem' }}>
            {netProfit >= 0 ? 'Profit' : 'Loss'} on current page
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div style={s.filterBar}>
        <select
          style={s.filterSelect}
          value={filterType}
          onChange={(e) => {
            setFilterType(e.target.value as TransactionType | '');
            setPage(1);
          }}
        >
          <option value="">All Types</option>
          <option value="Income">Income</option>
          <option value="Expense">Expense</option>
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

        <span style={s.filterLabel}>From</span>
        <input
          style={s.dateInput}
          type="date"
          value={filterFrom}
          title="From date"
          onChange={(e) => {
            setFilterFrom(e.target.value);
            setPage(1);
          }}
        />
        <span style={s.filterLabel}>To</span>
        <input
          style={s.dateInput}
          type="date"
          value={filterTo}
          title="To date"
          onChange={(e) => {
            setFilterTo(e.target.value);
            setPage(1);
          }}
        />

        <input
          style={s.searchInput}
          type="text"
          placeholder="Search description / category…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
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
                <th style={s.th}>Date</th>
                <th style={s.th}>Type</th>
                <th style={s.th}>Category</th>
                <th style={s.th}>Description</th>
                <th style={s.th}>Amount</th>
                <th style={s.th}>Property</th>
                <th style={s.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ ...s.td, ...s.emptyRow }}>
                    No transactions found.
                  </td>
                </tr>
              ) : (
                transactions.map((t) => (
                  <tr key={t._id}>
                    <td style={{ ...s.td, fontSize: '0.82rem', color: '#6b7280' }}>
                      {formatDateLong(t.transactionDate)}
                    </td>
                    <td style={s.td}>
                      <span style={typeBadgeStyle(t.type)}>{t.type}</span>
                    </td>
                    <td style={{ ...s.td, fontSize: '0.82rem' }}>{t.category}</td>
                    <td
                      style={{
                        ...s.td,
                        fontSize: '0.82rem',
                        color: '#6b7280',
                        maxWidth: '200px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={t.description}
                    >
                      {t.description || '—'}
                      {t.isRecurring && (
                        <span
                          style={{
                            ...s.badge,
                            backgroundColor: '#ede9fe',
                            color: '#5b21b6',
                            marginLeft: '0.4rem',
                          }}
                        >
                          {t.recurringFrequency ?? 'Recurring'}
                        </span>
                      )}
                    </td>
                    <td
                      style={{
                        ...s.td,
                        fontWeight: 600,
                        color: t.type === 'Income' ? '#065f46' : '#991b1b',
                      }}
                    >
                      {t.type === 'Expense' ? '−' : '+'}
                      {formatCurrency(t.amount, 'QAR', 0)}
                    </td>
                    <td style={{ ...s.td, fontSize: '0.82rem', color: '#6b7280' }}>
                      {propertyLabel(t.propertyId)}
                    </td>
                    <td style={{ ...s.td, whiteSpace: 'nowrap' as const }}>
                      <button
                        style={{ ...s.actionBtn, ...s.editBtn }}
                        type="button"
                        title="Edit transaction"
                        onClick={() => openEditModal(t)}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        style={{ ...s.actionBtn, ...s.deleteBtn }}
                        type="button"
                        title="Delete transaction"
                        onClick={() => setDeleteTarget(t)}
                      >
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
            <h2 style={s.modalTitle}>
              {modal.mode === 'add' ? 'Add Transaction' : 'Edit Transaction'}
            </h2>

            {modalError && <div style={s.modalError}>{modalError}</div>}

            <form onSubmit={(e) => void handleSubmit(e)}>
              <div style={s.fieldRow}>
                <div style={s.field}>
                  <label style={s.label} htmlFor="tx-type">
                    Type *
                  </label>
                  <select
                    id="tx-type"
                    style={{ ...s.select, ...(fieldErrors.type ? s.inputError : {}) }}
                    value={form.type}
                    onChange={(e) => {
                      const newType = e.target.value as TransactionType;
                      setForm((prev) => ({ ...prev, type: newType, category: '' }));
                      setFieldErrors((prev) => { const next = { ...prev }; delete next.type; delete next.category; return next; });
                    }}
                    disabled={saving}
                  >
                    <option value="">Select type…</option>
                    <option value="Income">Income</option>
                    <option value="Expense">Expense</option>
                  </select>
                  {fieldErrors.type && <div style={s.fieldError}>{fieldErrors.type}</div>}
                  {form.type === 'Income' && (
                    <div style={s.warningBanner}>
                      For rent income, use the <strong>Rent page</strong> instead. Adding rent here will double-count it in reports.
                    </div>
                  )}
                  {form.type === 'Expense' && (
                    <div style={s.warningBanner}>
                      For owner payments, use the <strong>Owners page</strong> instead. Adding them here will double-count in reports.
                    </div>
                  )}
                </div>
                <div style={s.field}>
                  <label style={s.label} htmlFor="tx-amount">
                    Amount (QAR) *
                  </label>
                  <input
                    id="tx-amount"
                    style={{ ...s.input, ...(fieldErrors.amount ? s.inputError : {}) }}
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => handleFieldChange('amount', e.target.value)}
                    disabled={saving}
                  />
                  {fieldErrors.amount && <div style={s.fieldError}>{fieldErrors.amount}</div>}
                </div>
              </div>

              <div style={s.fieldRow}>
                <div style={s.field}>
                  <label style={s.label} htmlFor="tx-category">
                    Category *
                  </label>
                  <select
                    id="tx-category"
                    style={{ ...s.select, ...(fieldErrors.category ? s.inputError : {}) }}
                    value={form.category}
                    onChange={(e) => handleFieldChange('category', e.target.value)}
                    disabled={saving}
                  >
                    <option value="">Select category…</option>
                    {categorySuggestions.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.category && <div style={s.fieldError}>{fieldErrors.category}</div>}
                </div>
                <div style={s.field}>
                  <label style={s.label} htmlFor="tx-date">
                    Transaction Date *
                  </label>
                  <input
                    id="tx-date"
                    style={{ ...s.input, ...(fieldErrors.transactionDate ? s.inputError : {}) }}
                    type="date"
                    value={form.transactionDate}
                    onChange={(e) => handleFieldChange('transactionDate', e.target.value)}
                    disabled={saving}
                  />
                  {fieldErrors.transactionDate && <div style={s.fieldError}>{fieldErrors.transactionDate}</div>}
                </div>
              </div>

              <div style={s.field}>
                <label style={s.label} htmlFor="tx-desc">
                  Description
                </label>
                <textarea
                  id="tx-desc"
                  style={s.textarea}
                  value={form.description}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  disabled={saving}
                  placeholder="Optional notes about this transaction…"
                />
              </div>

              <div style={s.fieldRow}>
                <div style={s.field}>
                  <label style={s.label} htmlFor="tx-method">
                    Payment Method
                  </label>
                  <input
                    id="tx-method"
                    style={s.input}
                    type="text"
                    list="tx-method-list"
                    value={form.paymentMethod}
                    onChange={(e) => handleFieldChange('paymentMethod', e.target.value)}
                    disabled={saving}
                    placeholder="Cash, Cheque…"
                  />
                  <datalist id="tx-method-list">
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                </div>
                <div style={s.field}>
                  <label style={s.label} htmlFor="tx-ref">
                    Reference Number
                  </label>
                  <input
                    id="tx-ref"
                    style={s.input}
                    type="text"
                    value={form.referenceNumber}
                    onChange={(e) => handleFieldChange('referenceNumber', e.target.value)}
                    disabled={saving}
                  />
                </div>
              </div>

              <div style={s.sectionTitle}>Links (optional)</div>

              <div style={s.fieldRow}>
                <div style={s.field}>
                  <label style={s.label} htmlFor="tx-property">
                    Property
                  </label>
                  <select
                    id="tx-property"
                    style={s.select}
                    value={form.propertyId}
                    onChange={(e) => handleFieldChange('propertyId', e.target.value)}
                    disabled={saving}
                  >
                    <option value="">— None —</option>
                    {propertyOptions.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={s.field}>
                  <label style={s.label} htmlFor="tx-tenant">
                    Tenant
                  </label>
                  <select
                    id="tx-tenant"
                    style={s.select}
                    value={form.tenantId}
                    onChange={(e) => handleFieldChange('tenantId', e.target.value)}
                    disabled={saving}
                  >
                    <option value="">— None —</option>
                    {tenantOptions.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.firstName} {t.lastName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={s.sectionTitle}>Recurring</div>

              <div style={s.checkboxRow}>
                <input
                  id="tx-recurring"
                  type="checkbox"
                  checked={form.isRecurring}
                  onChange={(e) => {
                    handleFieldChange('isRecurring', e.target.checked);
                    if (!e.target.checked) handleFieldChange('recurringFrequency', '');
                  }}
                  disabled={saving}
                />
                <label htmlFor="tx-recurring" style={{ fontSize: '0.875rem', color: '#374151' }}>
                  This is a recurring transaction
                </label>
              </div>

              {form.isRecurring && (
                <div style={s.field}>
                  <label style={s.label} htmlFor="tx-freq">
                    Frequency *
                  </label>
                  <select
                    id="tx-freq"
                    style={{ ...s.select, ...(fieldErrors.recurringFrequency ? s.inputError : {}) }}
                    value={form.recurringFrequency}
                    onChange={(e) => handleFieldChange('recurringFrequency', e.target.value as RecurringFrequency)}
                    disabled={saving}
                  >
                    <option value="">Select frequency…</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Yearly">Yearly</option>
                  </select>
                  {fieldErrors.recurringFrequency && <div style={s.fieldError}>{fieldErrors.recurringFrequency}</div>}
                </div>
              )}

              <div style={s.modalActions}>
                <button style={s.cancelBtn} type="button" onClick={closeModal} disabled={saving}>
                  Cancel
                </button>
                <button
                  style={{ ...s.submitBtn, ...(saving ? s.submitBtnDisabled : {}) }}
                  type="submit"
                  disabled={saving}
                >
                  {saving
                    ? 'Saving…'
                    : modal.mode === 'add'
                      ? 'Add Transaction'
                      : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm dialog */}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete Transaction"
          message={
            <>
              Are you sure you want to delete this{' '}
              <strong>
                {deleteTarget.type} — {deleteTarget.category}
              </strong>{' '}
              transaction of <strong>{formatCurrency(deleteTarget.amount, 'QAR', 0)}</strong>? This
              action cannot be undone.
            </>
          }
          confirmLabel="Delete"
          isLoading={deleting}
          isDanger
          onConfirm={() => void handleDelete()}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
