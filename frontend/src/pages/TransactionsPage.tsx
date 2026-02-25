import { useState, useEffect, useCallback, useRef } from 'react';
import type { AxiosError } from 'axios';
import { transactionsApi } from '@api/transactions.api';
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
  dateInput: {
    padding: '0.45rem 0.65rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '0.875rem',
    color: '#111',
  },
  searchInput: {
    padding: '0.45rem 0.65rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '0.875rem',
    minWidth: '200px',
    color: '#111',
  },
  filterLabel: { fontSize: '0.78rem', color: '#6b7280', whiteSpace: 'nowrap' as const },
  errorBanner: {
    backgroundColor: '#fee2e2',
    border: '1px solid #fca5a5',
    color: '#991b1b',
    borderRadius: '4px',
    padding: '0.6rem 0.75rem',
    fontSize: '0.8rem',
    marginBottom: '1rem',
  },
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

function formatDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatAmount(n: number): string {
  return `${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} QAR`;
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
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.type) {
      setModalError('Transaction type is required.');
      return;
    }
    if (!form.category.trim()) {
      setModalError('Category is required.');
      return;
    }
    if (!form.amount || Number(form.amount) < 0) {
      setModalError('Amount is required and must be non-negative.');
      return;
    }
    if (!form.transactionDate) {
      setModalError('Transaction date is required.');
      return;
    }
    if (form.isRecurring && !form.recurringFrequency) {
      setModalError('Please select a recurring frequency.');
      return;
    }

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
  const totalIncome = transactions
    .filter((t) => t.type === 'Income')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.type === 'Expense')
    .reduce((sum, t) => sum + t.amount, 0);

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

      {/* Summary bar */}
      {!loading && transactions.length > 0 && (
        <div style={s.summaryBar}>
          <div
            style={{
              ...s.summaryCard,
              backgroundColor: '#d1fae5',
              color: '#065f46',
            }}
          >
            Income: {formatAmount(totalIncome)}
          </div>
          <div
            style={{
              ...s.summaryCard,
              backgroundColor: '#fee2e2',
              color: '#991b1b',
            }}
          >
            Expenses: {formatAmount(totalExpense)}
          </div>
          <div
            style={{
              ...s.summaryCard,
              backgroundColor: totalIncome - totalExpense >= 0 ? '#eff6ff' : '#fff7ed',
              color: totalIncome - totalExpense >= 0 ? '#1d4ed8' : '#9a3412',
            }}
          >
            Net: {formatAmount(totalIncome - totalExpense)}
          </div>
        </div>
      )}

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
                      {formatDate(t.transactionDate)}
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
                      {formatAmount(t.amount)}
                    </td>
                    <td style={{ ...s.td, fontSize: '0.82rem', color: '#6b7280' }}>
                      {propertyLabel(t.propertyId)}
                    </td>
                    <td style={s.td}>
                      <button
                        style={{ ...s.actionBtn, ...s.editBtn }}
                        type="button"
                        onClick={() => openEditModal(t)}
                      >
                        Edit
                      </button>
                      <button
                        style={{ ...s.actionBtn, ...s.deleteBtn }}
                        type="button"
                        onClick={() => setDeleteTarget(t)}
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
                    style={s.select}
                    value={form.type}
                    onChange={(e) => {
                      setField('type', e.target.value as TransactionType);
                      setField('category', '');
                    }}
                    disabled={saving}
                    required
                  >
                    <option value="Income">Income</option>
                    <option value="Expense">Expense</option>
                  </select>
                </div>
                <div style={s.field}>
                  <label style={s.label} htmlFor="tx-amount">
                    Amount (QAR) *
                  </label>
                  <input
                    id="tx-amount"
                    style={s.input}
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setField('amount', e.target.value)}
                    disabled={saving}
                    required
                  />
                </div>
              </div>

              <div style={s.fieldRow}>
                <div style={s.field}>
                  <label style={s.label} htmlFor="tx-category">
                    Category *
                  </label>
                  <input
                    id="tx-category"
                    style={s.input}
                    type="text"
                    list="tx-category-list"
                    value={form.category}
                    onChange={(e) => setField('category', e.target.value)}
                    disabled={saving}
                    required
                    placeholder="Type or choose…"
                  />
                  <datalist id="tx-category-list">
                    {categorySuggestions.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
                <div style={s.field}>
                  <label style={s.label} htmlFor="tx-date">
                    Transaction Date *
                  </label>
                  <input
                    id="tx-date"
                    style={s.input}
                    type="date"
                    value={form.transactionDate}
                    onChange={(e) => setField('transactionDate', e.target.value)}
                    disabled={saving}
                    required
                  />
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
                  onChange={(e) => setField('description', e.target.value)}
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
                    onChange={(e) => setField('paymentMethod', e.target.value)}
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
                    onChange={(e) => setField('referenceNumber', e.target.value)}
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
                    onChange={(e) => setField('propertyId', e.target.value)}
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
                    onChange={(e) => setField('tenantId', e.target.value)}
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
                    setField('isRecurring', e.target.checked);
                    if (!e.target.checked) setField('recurringFrequency', '');
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
                    style={s.select}
                    value={form.recurringFrequency}
                    onChange={(e) => setField('recurringFrequency', e.target.value as RecurringFrequency)}
                    disabled={saving}
                    required
                  >
                    <option value="">Select frequency…</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Yearly">Yearly</option>
                  </select>
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
        <div
          style={s.overlay}
          onClick={(e) => e.target === e.currentTarget && setDeleteTarget(null)}
        >
          <div style={{ ...s.modal, width: '420px', padding: '1.5rem' }}>
            <h2 style={{ ...s.modalTitle, marginBottom: '0.75rem' }}>Delete Transaction</h2>
            <p style={{ fontSize: '0.875rem', color: '#374151', marginBottom: '1.25rem' }}>
              Are you sure you want to delete this{' '}
              <strong>
                {deleteTarget.type} — {deleteTarget.category}
              </strong>{' '}
              transaction of <strong>{formatAmount(deleteTarget.amount)}</strong>? This action
              cannot be undone.
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
    </div>
  );
}
