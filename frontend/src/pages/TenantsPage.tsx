import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AxiosError } from 'axios';
import { tenantsApi } from '@api/tenants.api';
import type {
  ApiTenant,
  TenantStatus,
  CreateTenantInput,
  UpdateTenantInput,
} from '@api/tenants.api';
import type { PaginationMeta } from '@api/users.api';
import { propertiesApi } from '@api/properties.api';
import type { DropdownItem } from '@api/properties.api';

// ── Styles ────────────────────────────────────────────────────────────────────

const s = {
  page: { padding: '1.5rem' },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1.25rem',
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
    minWidth: '220px',
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
  viewBtn: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', color: '#166534' },
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
    width: '600px',
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
    minHeight: '72px',
    resize: 'vertical' as const,
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

function tenantStatusBadge(status: TenantStatus): React.CSSProperties {
  const map: Record<TenantStatus, React.CSSProperties> = {
    Active: { backgroundColor: '#d1fae5', color: '#065f46' },
    Pending: { backgroundColor: '#fef9c3', color: '#713f12' },
    Past: { backgroundColor: '#f3f4f6', color: '#6b7280' },
  };
  return { ...s.badge, ...map[status] };
}

function isExpiringSoon(leaseEnd?: string, status?: TenantStatus): boolean {
  if (!leaseEnd || status !== 'Active') return false;
  const end = new Date(leaseEnd).getTime();
  const now = Date.now();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  return end > now && end - now <= thirtyDays;
}

function formatDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
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

// ── Form state ────────────────────────────────────────────────────────────────

interface FormState {
  propertyId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  alternatePhone: string;
  qatarId: string;
  moveInDate: string;
  moveOutDate: string;
  leaseStart: string;
  leaseEnd: string;
  monthlyRent: string;
  securityDeposit: string;
  status: TenantStatus;
  emergencyName: string;
  emergencyPhone: string;
  notes: string;
}

const emptyForm: FormState = {
  propertyId: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  alternatePhone: '',
  qatarId: '',
  moveInDate: '',
  moveOutDate: '',
  leaseStart: '',
  leaseEnd: '',
  monthlyRent: '',
  securityDeposit: '',
  status: 'Pending',
  emergencyName: '',
  emergencyPhone: '',
  notes: '',
};

function tenantToForm(t: ApiTenant): FormState {
  const toDateInput = (iso?: string) => (iso ? iso.slice(0, 10) : '');
  return {
    propertyId: t.propertyId,
    firstName: t.firstName,
    lastName: t.lastName,
    email: t.email ?? '',
    phone: t.phone ?? '',
    alternatePhone: t.alternatePhone ?? '',
    qatarId: t.qatarId ?? '',
    moveInDate: toDateInput(t.moveInDate),
    moveOutDate: toDateInput(t.moveOutDate),
    leaseStart: toDateInput(t.leaseStart),
    leaseEnd: toDateInput(t.leaseEnd),
    monthlyRent: String(t.monthlyRent),
    securityDeposit: t.securityDeposit !== undefined ? String(t.securityDeposit) : '',
    status: t.status,
    emergencyName: t.emergencyContact?.name ?? '',
    emergencyPhone: t.emergencyContact?.phone ?? '',
    notes: t.notes ?? '',
  };
}

function formToCreatePayload(f: FormState): CreateTenantInput {
  const strOpt = (v: string) => (v.trim() !== '' ? v.trim() : undefined);
  const numOpt = (v: string) => (v.trim() !== '' ? Number(v) : undefined);
  const dateOpt = (v: string) => (v.trim() !== '' ? new Date(v).toISOString() : undefined);
  return {
    propertyId: f.propertyId,
    firstName: f.firstName.trim(),
    lastName: f.lastName.trim(),
    email: strOpt(f.email),
    phone: strOpt(f.phone),
    alternatePhone: strOpt(f.alternatePhone),
    qatarId: strOpt(f.qatarId),
    moveInDate: dateOpt(f.moveInDate),
    moveOutDate: dateOpt(f.moveOutDate),
    leaseStart: dateOpt(f.leaseStart),
    leaseEnd: dateOpt(f.leaseEnd),
    monthlyRent: Number(f.monthlyRent),
    securityDeposit: numOpt(f.securityDeposit),
    status: f.status,
    emergencyContact:
      f.emergencyName || f.emergencyPhone
        ? { name: strOpt(f.emergencyName), phone: strOpt(f.emergencyPhone) }
        : undefined,
    notes: strOpt(f.notes),
  };
}

function formToUpdatePayload(f: FormState): UpdateTenantInput {
  const { propertyId: _pid, ...rest } = formToCreatePayload(f);
  void _pid;
  return rest;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TenantsPage() {
  const navigate = useNavigate();

  const [tenants, setTenants] = useState<ApiTenant[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  const [filterStatus, setFilterStatus] = useState<'' | TenantStatus>('');
  const [filterProperty, setFilterProperty] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [propertyOptions, setPropertyOptions] = useState<DropdownItem[]>([]);

  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; tenant?: ApiTenant } | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<ApiTenant | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    propertiesApi.dropdown().then(setPropertyOptions).catch(() => setPropertyOptions([]));
  }, []);

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

  const loadTenants = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, unknown> = { page, limit: 25 };
      if (filterStatus) params['status'] = filterStatus;
      if (filterProperty) params['propertyId'] = filterProperty;
      if (debouncedSearch.trim()) params['search'] = debouncedSearch.trim();

      const { tenants: data, meta: pageMeta } = await tenantsApi.list(
        params as Parameters<typeof tenantsApi.list>[0],
      );
      setTenants(data);
      setMeta(pageMeta);
    } catch {
      setError('Failed to load tenants. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus, filterProperty, debouncedSearch]);

  useEffect(() => {
    void loadTenants();
  }, [loadTenants]);

  function openAddModal() {
    setForm(emptyForm);
    setModalError('');
    setModal({ mode: 'add' });
  }

  function openEditModal(t: ApiTenant) {
    setForm(tenantToForm(t));
    setModalError('');
    setModal({ mode: 'edit', tenant: t });
  }

  function closeModal() {
    setModal(null);
    setModalError('');
  }

  function setField(key: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setModalError('First and last name are required.');
      return;
    }
    if (!form.propertyId) {
      setModalError('Please select a property.');
      return;
    }
    if (!form.monthlyRent || Number(form.monthlyRent) < 0) {
      setModalError('Monthly rent is required and must be non-negative.');
      return;
    }

    setModalError('');
    setSaving(true);

    try {
      if (modal?.mode === 'add') {
        await tenantsApi.create(formToCreatePayload(form));
      } else if (modal?.tenant) {
        await tenantsApi.update(modal.tenant._id, formToUpdatePayload(form));
      }
      closeModal();
      void loadTenants();
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
      await tenantsApi.remove(deleteTarget._id);
      setDeleteTarget(null);
      void loadTenants();
    } catch {
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  function propertyLabel(propertyId: string): string {
    const found = propertyOptions.find((p) => p._id === propertyId);
    return found?.label ?? '—';
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>Tenants</h1>
        <button style={s.addBtn} type="button" onClick={openAddModal}>
          + Add Tenant
        </button>
      </div>

      <div style={s.filterBar}>
        <select
          style={s.filterSelect}
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value as '' | TenantStatus);
            setPage(1);
          }}
        >
          <option value="">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Pending">Pending</option>
          <option value="Past">Past</option>
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

        <input
          style={s.searchInput}
          type="text"
          placeholder="Search by name…"
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
                <th style={s.th}>Name</th>
                <th style={s.th}>Property</th>
                <th style={s.th}>Status</th>
                <th style={s.th}>Lease Period</th>
                <th style={s.th}>Monthly Rent</th>
                <th style={s.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tenants.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ ...s.td, ...s.emptyRow }}>
                    No tenants found.
                  </td>
                </tr>
              ) : (
                tenants.map((t) => (
                  <tr key={t._id}>
                    <td style={s.td}>
                      <span style={{ fontWeight: 500 }}>
                        {t.firstName} {t.lastName}
                      </span>
                      {isExpiringSoon(t.leaseEnd, t.status) && (
                        <span
                          style={{
                            ...s.badge,
                            backgroundColor: '#fff7ed',
                            color: '#9a3412',
                            marginLeft: '0.5rem',
                          }}
                        >
                          Expiring Soon
                        </span>
                      )}
                    </td>
                    <td style={{ ...s.td, fontSize: '0.82rem', color: '#6b7280' }}>
                      {propertyLabel(t.propertyId)}
                    </td>
                    <td style={s.td}>
                      <span style={tenantStatusBadge(t.status)}>{t.status}</span>
                    </td>
                    <td style={{ ...s.td, fontSize: '0.82rem' }}>
                      {t.leaseStart || t.leaseEnd
                        ? `${formatDate(t.leaseStart)} – ${formatDate(t.leaseEnd)}`
                        : '—'}
                    </td>
                    <td style={s.td}>{t.monthlyRent.toLocaleString()} QAR</td>
                    <td style={s.td}>
                      <button
                        style={{ ...s.actionBtn, ...s.viewBtn }}
                        type="button"
                        onClick={() => navigate(`/tenants/${t._id}`)}
                      >
                        View
                      </button>
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
              {modal.mode === 'add' ? 'Add Tenant' : 'Edit Tenant'}
            </h2>

            {modalError && <div style={s.modalError}>{modalError}</div>}

            <form onSubmit={(e) => void handleSubmit(e)}>
              <div style={s.field}>
                <label style={s.label} htmlFor="t-property">
                  Property *
                </label>
                <select
                  id="t-property"
                  style={s.select}
                  value={form.propertyId}
                  onChange={(e) => setField('propertyId', e.target.value)}
                  disabled={saving || modal.mode === 'edit'}
                  required
                >
                  <option value="">Select property…</option>
                  {propertyOptions.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={s.fieldRow}>
                <div style={s.field}>
                  <label style={s.label} htmlFor="t-first">
                    First Name *
                  </label>
                  <input
                    id="t-first"
                    style={s.input}
                    type="text"
                    value={form.firstName}
                    onChange={(e) => setField('firstName', e.target.value)}
                    disabled={saving}
                    required
                  />
                </div>
                <div style={s.field}>
                  <label style={s.label} htmlFor="t-last">
                    Last Name *
                  </label>
                  <input
                    id="t-last"
                    style={s.input}
                    type="text"
                    value={form.lastName}
                    onChange={(e) => setField('lastName', e.target.value)}
                    disabled={saving}
                    required
                  />
                </div>
              </div>

              <div style={s.fieldRow}>
                <div style={s.field}>
                  <label style={s.label} htmlFor="t-email">
                    Email
                  </label>
                  <input
                    id="t-email"
                    style={s.input}
                    type="email"
                    value={form.email}
                    onChange={(e) => setField('email', e.target.value)}
                    disabled={saving}
                  />
                </div>
                <div style={s.field}>
                  <label style={s.label} htmlFor="t-phone">
                    Phone
                  </label>
                  <input
                    id="t-phone"
                    style={s.input}
                    type="text"
                    value={form.phone}
                    onChange={(e) => setField('phone', e.target.value)}
                    disabled={saving}
                  />
                </div>
              </div>

              <div style={s.fieldRow}>
                <div style={s.field}>
                  <label style={s.label} htmlFor="t-altphone">
                    Alternate Phone
                  </label>
                  <input
                    id="t-altphone"
                    style={s.input}
                    type="text"
                    value={form.alternatePhone}
                    onChange={(e) => setField('alternatePhone', e.target.value)}
                    disabled={saving}
                  />
                </div>
                <div style={s.field}>
                  <label style={s.label} htmlFor="t-qid">
                    Qatar ID
                  </label>
                  <input
                    id="t-qid"
                    style={s.input}
                    type="text"
                    value={form.qatarId}
                    onChange={(e) => setField('qatarId', e.target.value)}
                    disabled={saving}
                  />
                </div>
              </div>

              <div style={s.sectionTitle}>Lease Details</div>
              <div style={s.fieldRow}>
                <div style={s.field}>
                  <label style={s.label} htmlFor="t-lstart">
                    Lease Start
                  </label>
                  <input
                    id="t-lstart"
                    style={s.input}
                    type="date"
                    value={form.leaseStart}
                    onChange={(e) => setField('leaseStart', e.target.value)}
                    disabled={saving}
                  />
                </div>
                <div style={s.field}>
                  <label style={s.label} htmlFor="t-lend">
                    Lease End
                  </label>
                  <input
                    id="t-lend"
                    style={s.input}
                    type="date"
                    value={form.leaseEnd}
                    onChange={(e) => setField('leaseEnd', e.target.value)}
                    disabled={saving}
                  />
                </div>
              </div>

              <div style={s.fieldRow}>
                <div style={s.field}>
                  <label style={s.label} htmlFor="t-movein">
                    Move-in Date
                  </label>
                  <input
                    id="t-movein"
                    style={s.input}
                    type="date"
                    value={form.moveInDate}
                    onChange={(e) => setField('moveInDate', e.target.value)}
                    disabled={saving}
                  />
                </div>
                <div style={s.field}>
                  <label style={s.label} htmlFor="t-moveout">
                    Move-out Date
                  </label>
                  <input
                    id="t-moveout"
                    style={s.input}
                    type="date"
                    value={form.moveOutDate}
                    onChange={(e) => setField('moveOutDate', e.target.value)}
                    disabled={saving}
                  />
                </div>
              </div>

              <div style={s.sectionTitle}>Financials</div>
              <div style={s.fieldRow}>
                <div style={s.field}>
                  <label style={s.label} htmlFor="t-rent">
                    Monthly Rent (QAR) *
                  </label>
                  <input
                    id="t-rent"
                    style={s.input}
                    type="number"
                    min="0"
                    value={form.monthlyRent}
                    onChange={(e) => setField('monthlyRent', e.target.value)}
                    disabled={saving}
                    required
                  />
                </div>
                <div style={s.field}>
                  <label style={s.label} htmlFor="t-deposit">
                    Security Deposit (QAR)
                  </label>
                  <input
                    id="t-deposit"
                    style={s.input}
                    type="number"
                    min="0"
                    value={form.securityDeposit}
                    onChange={(e) => setField('securityDeposit', e.target.value)}
                    disabled={saving}
                  />
                </div>
              </div>

              <div style={s.field}>
                <label style={s.label} htmlFor="t-status">
                  Status
                </label>
                <select
                  id="t-status"
                  style={s.select}
                  value={form.status}
                  onChange={(e) => setField('status', e.target.value)}
                  disabled={saving}
                >
                  <option value="Pending">Pending</option>
                  <option value="Active">Active</option>
                  <option value="Past">Past</option>
                </select>
              </div>

              <div style={s.sectionTitle}>Emergency Contact</div>
              <div style={s.fieldRow}>
                <div style={s.field}>
                  <label style={s.label} htmlFor="t-ename">
                    Name
                  </label>
                  <input
                    id="t-ename"
                    style={s.input}
                    type="text"
                    value={form.emergencyName}
                    onChange={(e) => setField('emergencyName', e.target.value)}
                    disabled={saving}
                  />
                </div>
                <div style={s.field}>
                  <label style={s.label} htmlFor="t-ephone">
                    Phone
                  </label>
                  <input
                    id="t-ephone"
                    style={s.input}
                    type="text"
                    value={form.emergencyPhone}
                    onChange={(e) => setField('emergencyPhone', e.target.value)}
                    disabled={saving}
                  />
                </div>
              </div>

              <div style={s.field}>
                <label style={s.label} htmlFor="t-notes">
                  Notes
                </label>
                <textarea
                  id="t-notes"
                  style={s.textarea}
                  value={form.notes}
                  onChange={(e) => setField('notes', e.target.value)}
                  disabled={saving}
                />
              </div>

              <div style={s.modalActions}>
                <button style={s.cancelBtn} type="button" onClick={closeModal} disabled={saving}>
                  Cancel
                </button>
                <button
                  style={{ ...s.submitBtn, ...(saving ? s.submitBtnDisabled : {}) }}
                  type="submit"
                  disabled={saving}
                >
                  {saving ? 'Saving…' : modal.mode === 'add' ? 'Add Tenant' : 'Save Changes'}
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
            <h2 style={{ ...s.modalTitle, marginBottom: '0.75rem' }}>Delete Tenant</h2>
            <p style={{ fontSize: '0.875rem', color: '#374151', marginBottom: '1.25rem' }}>
              Are you sure you want to delete{' '}
              <strong>
                {deleteTarget.firstName} {deleteTarget.lastName}
              </strong>
              ? Rent payment history will be preserved.
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
