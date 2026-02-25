import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AxiosError } from 'axios';
import { propertiesApi } from '@api/properties.api';
import type {
  ApiProperty,
  CreatePropertyInput,
  UpdatePropertyInput,
  DropdownItem,
  PropertyStatus,
  PropertyType,
} from '@api/properties.api';
import type { PaginationMeta } from '@api/users.api';
import { PROPERTY_TYPES } from '@api/properties.api';

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
  // Modal
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

function typeBadge(type: 'master' | 'unit'): React.CSSProperties {
  return {
    ...s.badge,
    ...(type === 'master'
      ? { backgroundColor: '#dbeafe', color: '#1e40af' }
      : { backgroundColor: '#f3f4f6', color: '#374151' }),
  };
}

function statusBadge(status: PropertyStatus): React.CSSProperties {
  const map: Record<PropertyStatus, React.CSSProperties> = {
    Vacant: { backgroundColor: '#d1fae5', color: '#065f46' },
    Occupied: { backgroundColor: '#fff7ed', color: '#9a3412' },
    'Under Maintenance': { backgroundColor: '#fef9c3', color: '#713f12' },
  };
  return { ...s.badge, ...map[status] };
}

function resolveError(err: unknown): string {
  const e = err as AxiosError<{ error?: { code?: string; message?: string } }>;
  const code = e.response?.data?.error?.code;
  switch (code) {
    case 'DUPLICATE':
      return 'A property with this name already exists.';
    case 'FORBIDDEN':
      return e.response?.data?.error?.message ?? 'Permission denied.';
    case 'NOT_FOUND':
      return e.response?.data?.error?.message ?? 'Property not found.';
    case 'CONFLICT':
      return e.response?.data?.error?.message ?? 'Action not allowed.';
    case 'VALIDATION_ERROR':
      return e.response?.data?.error?.message ?? 'Validation failed. Check your inputs.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
}

// ── Form state shape ──────────────────────────────────────────────────────────

interface FormState {
  type: 'master' | 'unit';
  parentPropertyId: string;
  unitName: string;
  propertyName: string;
  propertyType: string;
  status: PropertyStatus;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  bedrooms: string;
  bathrooms: string;
  squareFeet: string;
  purchasePrice: string;
  currentValue: string;
  defaultRent: string;
  contactNumber: string;
  notes: string;
  // Owner fields
  ownerName: string;
  ownerContact: string;
  ownerEmail: string;
  ownerPhone: string;
  ownerMonthlyRent: string;
}

const emptyForm: FormState = {
  type: 'master',
  parentPropertyId: '',
  unitName: '',
  propertyName: '',
  propertyType: '',
  status: 'Vacant',
  address: '',
  city: '',
  state: '',
  zipCode: '',
  country: 'Qatar',
  bedrooms: '',
  bathrooms: '',
  squareFeet: '',
  purchasePrice: '',
  currentValue: '',
  defaultRent: '',
  contactNumber: '',
  notes: '',
  ownerName: '',
  ownerContact: '',
  ownerEmail: '',
  ownerPhone: '',
  ownerMonthlyRent: '',
};

function propertyToForm(p: ApiProperty): FormState {
  return {
    type: p.type,
    parentPropertyId: p.parentPropertyId ?? '',
    unitName: p.unitName ?? '',
    propertyName: p.propertyName,
    propertyType: p.propertyType ?? '',
    status: p.status,
    address: p.address ?? '',
    city: p.city ?? '',
    state: p.state ?? '',
    zipCode: p.zipCode ?? '',
    country: p.country,
    bedrooms: p.bedrooms !== undefined ? String(p.bedrooms) : '',
    bathrooms: p.bathrooms !== undefined ? String(p.bathrooms) : '',
    squareFeet: p.squareFeet !== undefined ? String(p.squareFeet) : '',
    purchasePrice: p.purchasePrice !== undefined ? String(p.purchasePrice) : '',
    currentValue: p.currentValue !== undefined ? String(p.currentValue) : '',
    defaultRent: p.defaultRent !== undefined ? String(p.defaultRent) : '',
    contactNumber: p.contactNumber ?? '',
    notes: p.notes ?? '',
    ownerName: p.owner?.name ?? '',
    ownerContact: p.owner?.contact ?? '',
    ownerEmail: p.owner?.email ?? '',
    ownerPhone: p.owner?.phone ?? '',
    ownerMonthlyRent:
      p.owner?.monthlyRentAmount !== undefined ? String(p.owner.monthlyRentAmount) : '',
  };
}

function formToPayload(f: FormState): CreatePropertyInput {
  const numericOpt = (v: string) => (v.trim() !== '' ? Number(v) : undefined);
  const strOpt = (v: string) => (v.trim() !== '' ? v.trim() : undefined);
  return {
    type: f.type,
    parentPropertyId: f.type === 'unit' && f.parentPropertyId ? f.parentPropertyId : undefined,
    unitName: strOpt(f.unitName),
    propertyName: f.propertyName.trim(),
    propertyType: (strOpt(f.propertyType) as PropertyType | undefined) ?? undefined,
    status: f.status,
    address: strOpt(f.address),
    city: strOpt(f.city),
    state: strOpt(f.state),
    zipCode: strOpt(f.zipCode),
    country: f.country.trim() || 'Qatar',
    bedrooms: numericOpt(f.bedrooms),
    bathrooms: numericOpt(f.bathrooms),
    squareFeet: numericOpt(f.squareFeet),
    purchasePrice: numericOpt(f.purchasePrice),
    currentValue: numericOpt(f.currentValue),
    defaultRent: numericOpt(f.defaultRent),
    contactNumber: strOpt(f.contactNumber),
    notes: strOpt(f.notes),
    owner: {
      name: strOpt(f.ownerName),
      contact: strOpt(f.ownerContact),
      email: strOpt(f.ownerEmail),
      phone: strOpt(f.ownerPhone),
      monthlyRentAmount: numericOpt(f.ownerMonthlyRent),
    },
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PropertiesPage() {
  const navigate = useNavigate();

  // List state
  const [properties, setProperties] = useState<ApiProperty[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  // Filters
  const [filterType, setFilterType] = useState<'' | 'master' | 'unit'>('');
  const [filterStatus, setFilterStatus] = useState<'' | PropertyStatus>('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Modal state
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; property?: ApiProperty } | null>(
    null,
  );
  const [form, setForm] = useState<FormState>(emptyForm);
  const [masterOptions, setMasterOptions] = useState<DropdownItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  // ── Debounce search ──────────────────────────────────────────────────────
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

  // ── Load properties ──────────────────────────────────────────────────────
  const loadProperties = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, unknown> = { page, limit: 25 };
      if (filterType) params['type'] = filterType;
      if (filterStatus) params['status'] = filterStatus;
      if (debouncedSearch.trim()) params['search'] = debouncedSearch.trim();

      const { properties: data, meta: pageMeta } = await propertiesApi.list(
        params as Parameters<typeof propertiesApi.list>[0],
      );
      setProperties(data);
      setMeta(pageMeta);
    } catch {
      setError('Failed to load properties. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, filterType, filterStatus, debouncedSearch]);

  useEffect(() => {
    void loadProperties();
  }, [loadProperties]);

  // ── Open add modal ───────────────────────────────────────────────────────
  async function openAddModal() {
    setForm(emptyForm);
    setModalError('');
    // Load master properties for the unit parent select
    try {
      const items = await propertiesApi.dropdown();
      setMasterOptions(items.filter((i) => i.type === 'master'));
    } catch {
      setMasterOptions([]);
    }
    setModal({ mode: 'add' });
  }

  // ── Open edit modal ──────────────────────────────────────────────────────
  async function openEditModal(p: ApiProperty) {
    setForm(propertyToForm(p));
    setModalError('');
    try {
      const items = await propertiesApi.dropdown();
      setMasterOptions(items.filter((i) => i.type === 'master'));
    } catch {
      setMasterOptions([]);
    }
    setModal({ mode: 'edit', property: p });
  }

  // ── Close modal ──────────────────────────────────────────────────────────
  function closeModal() {
    setModal(null);
    setModalError('');
  }

  // ── Form field change ────────────────────────────────────────────────────
  function setField(key: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // ── Submit ───────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.propertyName.trim()) {
      setModalError('Property name is required.');
      return;
    }
    if (form.type === 'unit' && !form.parentPropertyId) {
      setModalError('Please select a parent property for this unit.');
      return;
    }

    setModalError('');
    setSaving(true);

    try {
      const payload = formToPayload(form);
      if (modal?.mode === 'add') {
        await propertiesApi.create(payload);
      } else if (modal?.property) {
        const { type: _t, ...updatePayload } = payload as UpdatePropertyInput & { type?: string };
        void _t; // type is not updatable via edit form
        await propertiesApi.update(modal.property._id, updatePayload);
      }
      closeModal();
      void loadProperties();
    } catch (err) {
      setModalError(resolveError(err));
    } finally {
      setSaving(false);
    }
  }

  // ── Filter change resets page ────────────────────────────────────────────
  function handleFilterType(v: string) {
    setFilterType(v as '' | 'master' | 'unit');
    setPage(1);
  }

  function handleFilterStatus(v: string) {
    setFilterStatus(v as '' | PropertyStatus);
    setPage(1);
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <h1 style={s.title}>Properties & Units</h1>
        <button style={s.addBtn} type="button" onClick={() => void openAddModal()}>
          + Add Property
        </button>
      </div>

      {/* Filters */}
      <div style={s.filterBar}>
        <select
          style={s.filterSelect}
          value={filterType}
          onChange={(e) => handleFilterType(e.target.value)}
        >
          <option value="">All Types</option>
          <option value="master">Master</option>
          <option value="unit">Unit</option>
        </select>

        <select
          style={s.filterSelect}
          value={filterStatus}
          onChange={(e) => handleFilterStatus(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="Vacant">Vacant</option>
          <option value="Occupied">Occupied</option>
          <option value="Under Maintenance">Under Maintenance</option>
        </select>

        <input
          style={s.searchInput}
          type="text"
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Error */}
      {error && <div style={s.errorBanner}>{error}</div>}

      {/* Table */}
      {loading ? (
        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Loading…</p>
      ) : (
        <>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Property Name</th>
                <th style={s.th}>Type</th>
                <th style={s.th}>Property Type</th>
                <th style={s.th}>Status</th>
                <th style={s.th}>City</th>
                <th style={s.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {properties.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ ...s.td, ...s.emptyRow }}>
                    No properties found.
                  </td>
                </tr>
              ) : (
                properties.map((p) => (
                  <tr key={p._id}>
                    <td style={s.td}>
                      <span style={{ fontWeight: 500 }}>{p.propertyName}</span>
                      {p.unitName && (
                        <span style={{ color: '#9ca3af', fontSize: '0.8rem', marginLeft: '0.4rem' }}>
                          ({p.unitName})
                        </span>
                      )}
                    </td>
                    <td style={s.td}>
                      <span style={typeBadge(p.type)}>
                        {p.type === 'master' ? 'Master' : 'Unit'}
                      </span>
                    </td>
                    <td style={s.td}>{p.propertyType ?? '—'}</td>
                    <td style={s.td}>
                      <span style={statusBadge(p.status)}>{p.status}</span>
                    </td>
                    <td style={s.td}>{p.city ?? '—'}</td>
                    <td style={s.td}>
                      <button
                        style={{ ...s.actionBtn, ...s.viewBtn }}
                        type="button"
                        onClick={() => navigate(`/properties/${p._id}`)}
                      >
                        View
                      </button>
                      <button
                        style={{ ...s.actionBtn, ...s.editBtn }}
                        type="button"
                        onClick={() => void openEditModal(p)}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
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
              {modal.mode === 'add' ? 'Add Property' : 'Edit Property'}
            </h2>

            {modalError && <div style={s.modalError}>{modalError}</div>}

            <form onSubmit={(e) => void handleSubmit(e)}>
              {/* Type — only shown on Add */}
              {modal.mode === 'add' && (
                <div style={s.field}>
                  <label style={s.label} htmlFor="p-type">
                    Type *
                  </label>
                  <select
                    id="p-type"
                    style={s.select}
                    value={form.type}
                    onChange={(e) => setField('type', e.target.value)}
                    disabled={saving}
                  >
                    <option value="master">Master Property</option>
                    <option value="unit">Unit (under a master)</option>
                  </select>
                </div>
              )}

              {/* Parent property — only for units */}
              {form.type === 'unit' && (
                <div style={s.field}>
                  <label style={s.label} htmlFor="p-parent">
                    Parent Property *
                  </label>
                  <select
                    id="p-parent"
                    style={s.select}
                    value={form.parentPropertyId}
                    onChange={(e) => setField('parentPropertyId', e.target.value)}
                    disabled={saving}
                  >
                    <option value="">Select master property…</option>
                    {masterOptions.map((m) => (
                      <option key={m._id} value={m._id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Unit Name */}
              {form.type === 'unit' && (
                <div style={s.field}>
                  <label style={s.label} htmlFor="p-unitname">
                    Unit Name
                  </label>
                  <input
                    id="p-unitname"
                    style={s.input}
                    type="text"
                    placeholder="e.g. Unit 101"
                    value={form.unitName}
                    onChange={(e) => setField('unitName', e.target.value)}
                    disabled={saving}
                  />
                </div>
              )}

              {/* Property Name */}
              <div style={s.field}>
                <label style={s.label} htmlFor="p-name">
                  Property Name *
                </label>
                <input
                  id="p-name"
                  style={s.input}
                  type="text"
                  placeholder="e.g. Tower A"
                  value={form.propertyName}
                  onChange={(e) => setField('propertyName', e.target.value)}
                  disabled={saving}
                  required
                />
              </div>

              <div style={s.fieldRow}>
                {/* Property Type */}
                <div style={s.field}>
                  <label style={s.label} htmlFor="p-type2">
                    Property Type
                  </label>
                  <select
                    id="p-type2"
                    style={s.select}
                    value={form.propertyType}
                    onChange={(e) => setField('propertyType', e.target.value)}
                    disabled={saving}
                  >
                    <option value="">Select type…</option>
                    {PROPERTY_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status */}
                <div style={s.field}>
                  <label style={s.label} htmlFor="p-status">
                    Status
                  </label>
                  <select
                    id="p-status"
                    style={s.select}
                    value={form.status}
                    onChange={(e) => setField('status', e.target.value)}
                    disabled={saving}
                  >
                    <option value="Vacant">Vacant</option>
                    <option value="Occupied">Occupied</option>
                    <option value="Under Maintenance">Under Maintenance</option>
                  </select>
                </div>
              </div>

              {/* Location */}
              <div style={s.sectionTitle}>Location</div>
              <div style={s.field}>
                <label style={s.label} htmlFor="p-address">
                  Address
                </label>
                <input
                  id="p-address"
                  style={s.input}
                  type="text"
                  value={form.address}
                  onChange={(e) => setField('address', e.target.value)}
                  disabled={saving}
                />
              </div>
              <div style={s.fieldRow}>
                <div style={s.field}>
                  <label style={s.label} htmlFor="p-city">
                    City
                  </label>
                  <input
                    id="p-city"
                    style={s.input}
                    type="text"
                    value={form.city}
                    onChange={(e) => setField('city', e.target.value)}
                    disabled={saving}
                  />
                </div>
                <div style={s.field}>
                  <label style={s.label} htmlFor="p-country">
                    Country
                  </label>
                  <input
                    id="p-country"
                    style={s.input}
                    type="text"
                    value={form.country}
                    onChange={(e) => setField('country', e.target.value)}
                    disabled={saving}
                  />
                </div>
              </div>

              {/* Financials */}
              <div style={s.sectionTitle}>Details & Financials</div>
              <div style={s.fieldRow}>
                <div style={s.field}>
                  <label style={s.label} htmlFor="p-beds">
                    Bedrooms
                  </label>
                  <input
                    id="p-beds"
                    style={s.input}
                    type="number"
                    min="0"
                    value={form.bedrooms}
                    onChange={(e) => setField('bedrooms', e.target.value)}
                    disabled={saving}
                  />
                </div>
                <div style={s.field}>
                  <label style={s.label} htmlFor="p-baths">
                    Bathrooms
                  </label>
                  <input
                    id="p-baths"
                    style={s.input}
                    type="number"
                    min="0"
                    value={form.bathrooms}
                    onChange={(e) => setField('bathrooms', e.target.value)}
                    disabled={saving}
                  />
                </div>
                <div style={s.field}>
                  <label style={s.label} htmlFor="p-sqft">
                    Sq. Ft.
                  </label>
                  <input
                    id="p-sqft"
                    style={s.input}
                    type="number"
                    min="0"
                    value={form.squareFeet}
                    onChange={(e) => setField('squareFeet', e.target.value)}
                    disabled={saving}
                  />
                </div>
              </div>
              <div style={s.fieldRow}>
                <div style={s.field}>
                  <label style={s.label} htmlFor="p-rent">
                    Default Rent
                  </label>
                  <input
                    id="p-rent"
                    style={s.input}
                    type="number"
                    min="0"
                    value={form.defaultRent}
                    onChange={(e) => setField('defaultRent', e.target.value)}
                    disabled={saving}
                  />
                </div>
                <div style={s.field}>
                  <label style={s.label} htmlFor="p-contact">
                    Contact Number
                  </label>
                  <input
                    id="p-contact"
                    style={s.input}
                    type="text"
                    value={form.contactNumber}
                    onChange={(e) => setField('contactNumber', e.target.value)}
                    disabled={saving}
                  />
                </div>
              </div>

              {/* Owner */}
              <div style={s.sectionTitle}>Owner Information</div>
              <div style={s.fieldRow}>
                <div style={s.field}>
                  <label style={s.label} htmlFor="p-oname">
                    Owner Name
                  </label>
                  <input
                    id="p-oname"
                    style={s.input}
                    type="text"
                    value={form.ownerName}
                    onChange={(e) => setField('ownerName', e.target.value)}
                    disabled={saving}
                  />
                </div>
                <div style={s.field}>
                  <label style={s.label} htmlFor="p-ophone">
                    Owner Phone
                  </label>
                  <input
                    id="p-ophone"
                    style={s.input}
                    type="text"
                    value={form.ownerPhone}
                    onChange={(e) => setField('ownerPhone', e.target.value)}
                    disabled={saving}
                  />
                </div>
              </div>
              <div style={s.fieldRow}>
                <div style={s.field}>
                  <label style={s.label} htmlFor="p-oemail">
                    Owner Email
                  </label>
                  <input
                    id="p-oemail"
                    style={s.input}
                    type="email"
                    value={form.ownerEmail}
                    onChange={(e) => setField('ownerEmail', e.target.value)}
                    disabled={saving}
                  />
                </div>
                <div style={s.field}>
                  <label style={s.label} htmlFor="p-orent">
                    Owner Monthly Rent
                  </label>
                  <input
                    id="p-orent"
                    style={s.input}
                    type="number"
                    min="0"
                    value={form.ownerMonthlyRent}
                    onChange={(e) => setField('ownerMonthlyRent', e.target.value)}
                    disabled={saving}
                  />
                </div>
              </div>

              {/* Notes */}
              <div style={s.field}>
                <label style={s.label} htmlFor="p-notes">
                  Notes
                </label>
                <textarea
                  id="p-notes"
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
                  {saving
                    ? 'Saving…'
                    : modal.mode === 'add'
                      ? 'Create Property'
                      : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
