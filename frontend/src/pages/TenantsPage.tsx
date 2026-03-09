import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { tenantsApi } from '@api/tenants.api';
import { addTenantSchema, editTenantSchema } from '@validations/tenant.form.schema';
import type {
  ApiTenant,
  TenantStatus,
  CreateTenantInput,
  UpdateTenantInput,
} from '@api/tenants.api';
import type { PaginationMeta } from '@api/users.api';
import { propertiesApi } from '@api/properties.api';
import type { DropdownItem } from '@api/properties.api';
import { sh } from '@/styles/shared';
import { resolveError, zodFieldErrors } from '@utils/formHelpers';
import type { FieldErrors } from '@utils/formHelpers';
import { Pagination } from '@components/common/Pagination';
import { ConfirmDialog } from '@components/common/ConfirmDialog';
import { formatDateLong } from '@utils/formatDate';

// ── Styles ────────────────────────────────────────────────────────────────────

const s = {
  ...sh,
  // Page-specific: wider modal for the tenant form
  modal: { ...sh.modal, width: '600px' },
  // Page-specific: form field needs flex:1 to fill fieldRow columns equally
  field: { ...sh.field, flex: 1 },
  // Page-specific: section dividers within the modal form
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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
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
    setFieldErrors({});
  }

  function handleFieldChange(key: keyof FormState, value: string) {
    const newForm = { ...form, [key]: value };
    setForm(newForm);
    const schema = modal?.mode === 'add' ? addTenantSchema : editTenantSchema;
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const schema = modal?.mode === 'add' ? addTenantSchema : editTenantSchema;
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
                <th style={s.th}>Phone</th>
                <th style={s.th}>Move-in Date</th>
                <th style={s.th}>Status</th>
                <th style={s.th}>Lease Period</th>
                <th style={s.th}>Monthly Rent</th>
                <th style={s.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tenants.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ ...s.td, ...s.emptyRow }}>
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
                    <td style={{ ...s.td, fontSize: '0.82rem' }}>{t.phone ?? '—'}</td>
                    <td style={{ ...s.td, fontSize: '0.82rem' }}>{formatDateLong(t.moveInDate)}</td>
                    <td style={s.td}>
                      <span style={tenantStatusBadge(t.status)}>{t.status}</span>
                    </td>
                    <td style={{ ...s.td, fontSize: '0.82rem' }}>
                      {t.leaseStart || t.leaseEnd
                        ? `${formatDateLong(t.leaseStart)} – ${formatDateLong(t.leaseEnd)}`
                        : '—'}
                    </td>
                    <td style={s.td}>{t.monthlyRent.toLocaleString()} QAR</td>
                    <td style={{ ...s.td, whiteSpace: 'nowrap' as const }}>
                      <div style={{ display: 'flex', gap: '0.1rem', alignItems: 'center' }}>
                        {/* View */}
                        <button
                          style={{ ...s.actionBtn, ...s.viewBtn }}
                          type="button"
                          title="View tenant details"
                          onClick={() => navigate(`/tenants/${t._id}`)}
                        >
                          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                          </svg>
                        </button>
                        {/* Edit */}
                        <button
                          style={{ ...s.actionBtn, ...s.editBtn }}
                          type="button"
                          title="Edit tenant"
                          onClick={() => openEditModal(t)}
                        >
                          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        {/* Delete */}
                        <button
                          style={{ ...s.actionBtn, ...s.deleteBtn }}
                          type="button"
                          title="Delete tenant"
                          onClick={() => setDeleteTarget(t)}
                        >
                          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                            <path d="M10 11v6M14 11v6"/>
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                          </svg>
                        </button>
                      </div>
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
                  style={{ ...s.select, ...(fieldErrors.propertyId ? s.inputError : {}) }}
                  value={form.propertyId}
                  onChange={(e) => handleFieldChange('propertyId', e.target.value)}
                  disabled={saving || modal.mode === 'edit'}
                >
                  <option value="">Select property…</option>
                  {propertyOptions.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.label}
                    </option>
                  ))}
                </select>
                {fieldErrors.propertyId && <div style={s.fieldError}>{fieldErrors.propertyId}</div>}
              </div>

              <div style={s.fieldRow}>
                <div style={s.field}>
                  <label style={s.label} htmlFor="t-first">
                    First Name *
                  </label>
                  <input
                    id="t-first"
                    style={{ ...s.input, ...(fieldErrors.firstName ? s.inputError : {}) }}
                    type="text"
                    value={form.firstName}
                    onChange={(e) => handleFieldChange('firstName', e.target.value)}
                    disabled={saving}
                  />
                  {fieldErrors.firstName && <div style={s.fieldError}>{fieldErrors.firstName}</div>}
                </div>
                <div style={s.field}>
                  <label style={s.label} htmlFor="t-last">
                    Last Name *
                  </label>
                  <input
                    id="t-last"
                    style={{ ...s.input, ...(fieldErrors.lastName ? s.inputError : {}) }}
                    type="text"
                    value={form.lastName}
                    onChange={(e) => handleFieldChange('lastName', e.target.value)}
                    disabled={saving}
                  />
                  {fieldErrors.lastName && <div style={s.fieldError}>{fieldErrors.lastName}</div>}
                </div>
              </div>

              <div style={s.fieldRow}>
                <div style={s.field}>
                  <label style={s.label} htmlFor="t-email">
                    Email
                  </label>
                  <input
                    id="t-email"
                    style={{ ...s.input, ...(fieldErrors.email ? s.inputError : {}) }}
                    type="email"
                    value={form.email}
                    onChange={(e) => handleFieldChange('email', e.target.value)}
                    disabled={saving}
                  />
                  {fieldErrors.email && <div style={s.fieldError}>{fieldErrors.email}</div>}
                </div>
                <div style={s.field}>
                  <label style={s.label} htmlFor="t-phone">
                    Phone
                  </label>
                  <input
                    id="t-phone"
                    style={{ ...s.input, ...(fieldErrors.phone ? s.inputError : {}) }}
                    type="text"
                    value={form.phone}
                    onChange={(e) => handleFieldChange('phone', e.target.value)}
                    disabled={saving}
                  />
                  {fieldErrors.phone && <div style={s.fieldError}>{fieldErrors.phone}</div>}
                </div>
              </div>

              <div style={s.fieldRow}>
                <div style={s.field}>
                  <label style={s.label} htmlFor="t-altphone">
                    Alternate Phone
                  </label>
                  <input
                    id="t-altphone"
                    style={{ ...s.input, ...(fieldErrors.alternatePhone ? s.inputError : {}) }}
                    type="text"
                    value={form.alternatePhone}
                    onChange={(e) => handleFieldChange('alternatePhone', e.target.value)}
                    disabled={saving}
                  />
                  {fieldErrors.alternatePhone && <div style={s.fieldError}>{fieldErrors.alternatePhone}</div>}
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
                    onChange={(e) => handleFieldChange('qatarId', e.target.value)}
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
                    onChange={(e) => handleFieldChange('leaseStart', e.target.value)}
                    disabled={saving}
                  />
                </div>
                <div style={s.field}>
                  <label style={s.label} htmlFor="t-lend">
                    Lease End
                  </label>
                  <input
                    id="t-lend"
                    style={{ ...s.input, ...(fieldErrors.leaseEnd ? s.inputError : {}) }}
                    type="date"
                    value={form.leaseEnd}
                    onChange={(e) => handleFieldChange('leaseEnd', e.target.value)}
                    disabled={saving}
                  />
                  {fieldErrors.leaseEnd && <div style={s.fieldError}>{fieldErrors.leaseEnd}</div>}
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
                    onChange={(e) => handleFieldChange('moveInDate', e.target.value)}
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
                    onChange={(e) => handleFieldChange('moveOutDate', e.target.value)}
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
                    style={{ ...s.input, ...(fieldErrors.monthlyRent ? s.inputError : {}) }}
                    type="number"
                    min="0"
                    value={form.monthlyRent}
                    onChange={(e) => handleFieldChange('monthlyRent', e.target.value)}
                    disabled={saving}
                  />
                  {fieldErrors.monthlyRent && <div style={s.fieldError}>{fieldErrors.monthlyRent}</div>}
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
                    onChange={(e) => handleFieldChange('securityDeposit', e.target.value)}
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
                  onChange={(e) => handleFieldChange('status', e.target.value)}
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
                    style={{ ...s.input, ...(fieldErrors.emergencyName ? s.inputError : {}) }}
                    type="text"
                    value={form.emergencyName}
                    onChange={(e) => handleFieldChange('emergencyName', e.target.value)}
                    disabled={saving}
                  />
                  {fieldErrors.emergencyName && <div style={s.fieldError}>{fieldErrors.emergencyName}</div>}
                </div>
                <div style={s.field}>
                  <label style={s.label} htmlFor="t-ephone">
                    Phone
                  </label>
                  <input
                    id="t-ephone"
                    style={{ ...s.input, ...(fieldErrors.emergencyPhone ? s.inputError : {}) }}
                    type="text"
                    value={form.emergencyPhone}
                    onChange={(e) => handleFieldChange('emergencyPhone', e.target.value)}
                    disabled={saving}
                  />
                  {fieldErrors.emergencyPhone && <div style={s.fieldError}>{fieldErrors.emergencyPhone}</div>}
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
                  onChange={(e) => handleFieldChange('notes', e.target.value)}
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
        <ConfirmDialog
          title="Delete Tenant"
          message={
            <>
              Are you sure you want to delete{' '}
              <strong>
                {deleteTarget.firstName} {deleteTarget.lastName}
              </strong>
              ? Rent payment history will be preserved.
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
