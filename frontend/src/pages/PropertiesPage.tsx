import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { propertiesApi } from '@api/properties.api';
import { propertySchema } from '@validations/property.form.schema';
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
import { sh } from '@/styles/shared';
import { resolveError, zodFieldErrors } from '@utils/formHelpers';
import type { FieldErrors } from '@utils/formHelpers';
import { Pagination } from '@components/common/Pagination';
import { ConfirmDialog } from '@components/common/ConfirmDialog';

// ── Styles ────────────────────────────────────────────────────────────────────

const s = {
  ...sh,
  // Page-specific: purple "+ Unit" button colour
  unitBtn: { color: '#6d28d9' },
  // Page-specific: form section divider label
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
};

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
  purchaseDate: string;
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
  ownerRentStartDate: string;
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
  purchaseDate: '',
  currentValue: '',
  defaultRent: '',
  contactNumber: '',
  notes: '',
  ownerName: '',
  ownerContact: '',
  ownerEmail: '',
  ownerPhone: '',
  ownerMonthlyRent: '',
  ownerRentStartDate: '',
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
    purchaseDate: p.purchaseDate ? p.purchaseDate.slice(0, 10) : '',
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
    ownerRentStartDate: p.owner?.rentStartDate ? p.owner.rentStartDate.slice(0, 10) : '',
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
    purchaseDate: f.purchaseDate.trim() ? new Date(f.purchaseDate).toISOString() : undefined,
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
      rentStartDate: f.ownerRentStartDate.trim()
        ? new Date(f.ownerRentStartDate).toISOString()
        : undefined,
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
  const [modal, setModal] = useState<{
    mode: 'add' | 'edit';
    property?: ApiProperty;
    lockedParentId?: string;
    lockedParentName?: string;
  } | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [masterOptions, setMasterOptions] = useState<DropdownItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');
  const [unitsSumValue, setUnitsSumValue] = useState<number | null>(null);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<ApiProperty | null>(null);
  const [deleting, setDeleting] = useState(false);

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
    setUnitsSumValue(null);
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
    setModalError('');
    setUnitsSumValue(null);
    try {
      const items = await propertiesApi.dropdown();
      setMasterOptions(items.filter((i) => i.type === 'master'));
    } catch {
      setMasterOptions([]);
    }

    // For master properties: fetch child units and sum their currentValue
    if (p.type === 'master') {
      try {
        const { properties: units } = await propertiesApi.list({ parentPropertyId: p._id, limit: 100 });
        const sum = units.reduce((acc, u) => acc + (u.currentValue ?? 0), 0);
        if (sum > 0) {
          setUnitsSumValue(sum);
          setForm({ ...propertyToForm(p), currentValue: String(sum) });
        } else {
          setForm(propertyToForm(p));
        }
      } catch {
        setForm(propertyToForm(p));
      }
    } else {
      setForm(propertyToForm(p));
    }

    setModal({ mode: 'edit', property: p });
  }

  // ── Open +Unit modal (pre-filled parent, locked) ─────────────────────────
  async function openAddUnitModal(parentId: string) {
    const master = properties.find((p) => p._id === parentId);
    setForm({ ...emptyForm, type: 'unit', parentPropertyId: parentId });
    setModalError('');
    try {
      const items = await propertiesApi.dropdown();
      setMasterOptions(items.filter((i) => i.type === 'master'));
    } catch {
      setMasterOptions([]);
    }
    setModal({ mode: 'add', lockedParentId: parentId, lockedParentName: master?.propertyName });
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await propertiesApi.remove(deleteTarget._id);
      setDeleteTarget(null);
      void loadProperties();
    } catch {
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  // ── Close modal ──────────────────────────────────────────────────────────
  function closeModal() {
    setModal(null);
    setModalError('');
    setFieldErrors({});
  }

  // ── Form field change + real-time validation ─────────────────────────────
  function handleFieldChange(key: keyof FormState, value: string | boolean) {
    const newForm = { ...form, [key]: value };
    setForm(newForm);
    const result = propertySchema.safeParse(newForm);
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

  // ── Submit ───────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = propertySchema.safeParse(form);
    if (!result.success) {
      setFieldErrors(zodFieldErrors(result.error));
      setModalError(result.error.issues[0]?.message ?? 'Please fix the errors above.');
      return;
    }
    setFieldErrors({});
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
                <th style={{ ...s.th, paddingLeft: '1.5rem' }}>Property Name</th>
                <th style={s.th}>Type</th>
                <th style={s.th}>Status</th>
                <th style={s.th}>Address</th>
                <th style={s.th}>Tenants</th>
                <th style={s.th}>Monthly Rent</th>
                <th style={s.th}>Current Value</th>
                <th style={s.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {properties.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ ...s.td, ...s.emptyRow }}>
                    No properties found.
                  </td>
                </tr>
              ) : (
                (() => {
                  // Group: masters first, then their units immediately after
                  const masters = properties.filter((p) => p.type === 'master');
                  const unitsByParent = new Map<string, ApiProperty[]>();
                  properties
                    .filter((p) => p.type === 'unit')
                    .forEach((u) => {
                      const pid = u.parentPropertyId ?? '__none__';
                      if (!unitsByParent.has(pid)) unitsByParent.set(pid, []);
                      unitsByParent.get(pid)!.push(u);
                    });
                  // Orphan units (parent not on this page)
                  const orphanUnits = properties.filter(
                    (p) => p.type === 'unit' && !masters.find((m) => m._id === p.parentPropertyId),
                  );

                  const rows: ApiProperty[] = [];
                  masters.forEach((m) => {
                    rows.push(m);
                    (unitsByParent.get(m._id) ?? []).forEach((u) => rows.push(u));
                  });
                  orphanUnits.forEach((u) => rows.push(u));

                  return rows.map((p) => {
                    const isUnit = p.type === 'unit';
                    const address = [p.address, p.city].filter(Boolean).join(', ') || '—';
                    return (
                      <tr
                        key={p._id}
                        style={isUnit ? { backgroundColor: '#fafafa' } : undefined}
                      >
                        <td style={{ ...s.td, paddingLeft: isUnit ? '2.75rem' : '1.5rem' }}>
                          {isUnit && (
                            <span style={{ color: '#d1d5db', marginRight: '0.4rem', fontSize: '0.9rem' }}>
                              ↳
                            </span>
                          )}
                          <span style={{ fontWeight: isUnit ? 400 : 600 }}>{p.propertyName}</span>
                          {p.unitName && (
                            <span style={{ color: '#9ca3af', fontSize: '0.8rem', marginLeft: '0.35rem' }}>
                              ({p.unitName})
                            </span>
                          )}
                          {p.propertyType && (
                            <span style={{ color: '#6b7280', fontSize: '0.75rem', display: 'block' }}>
                              {p.propertyType}
                            </span>
                          )}
                        </td>
                        <td style={{ ...s.td, textAlign: 'center' as const }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'center' }}>
                            <span style={typeBadge(p.type)}>
                              {p.type === 'master' ? 'Master' : 'Unit'}
                            </span>
                            {p.type === 'master' && (
                              <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>
                                {p.unitCount ?? 0} unit{(p.unitCount ?? 0) !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={s.td}>
                          <span style={statusBadge(p.status)}>{p.status}</span>
                        </td>
                        <td style={{ ...s.td, fontSize: '0.82rem', color: '#6b7280' }}>{address}</td>
                        <td style={{ ...s.td, textAlign: 'center' as const }}>
                          {(p.tenantCount ?? 0) > 0 ? (
                            <span
                              style={{
                                ...s.badge,
                                backgroundColor: '#dbeafe',
                                color: '#1e40af',
                              }}
                            >
                              {p.tenantCount}
                            </span>
                          ) : (
                            <span style={{ color: '#d1d5db' }}>—</span>
                          )}
                        </td>
                        <td style={{ ...s.td, fontSize: '0.82rem' }}>
                          {p.defaultRent !== undefined
                            ? `${p.defaultRent.toLocaleString()} QAR`
                            : '—'}
                        </td>
                        <td style={{ ...s.td, fontSize: '0.82rem' }}>
                          {p.currentValue !== undefined
                            ? `${p.currentValue.toLocaleString()} QAR`
                            : '—'}
                        </td>
                        <td style={s.td}>
                          <div style={{ display: 'flex', flexDirection: 'row', gap: '0.1rem', alignItems: 'center', whiteSpace: 'nowrap' }}>
                            <button
                              style={{ ...s.actionBtn, ...s.viewBtn }}
                              type="button"
                              title="View property"
                              onClick={() => navigate(`/properties/${p._id}`)}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                <circle cx="12" cy="12" r="3"/>
                              </svg>
                            </button>
                            <button
                              style={{ ...s.actionBtn, ...s.editBtn }}
                              type="button"
                              title="Edit property"
                              onClick={() => void openEditModal(p)}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                            </button>
                            {p.type === 'master' && (
                              <button
                                style={{ ...s.actionBtn, ...s.unitBtn }}
                                type="button"
                                title="Add unit under this property"
                                onClick={() => void openAddUnitModal(p._id)}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="12" y1="5" x2="12" y2="19"/>
                                  <line x1="5" y1="12" x2="19" y2="12"/>
                                </svg>
                              </button>
                            )}
                            <button
                              style={{ ...s.actionBtn, ...s.deleteBtn }}
                              type="button"
                              title="Delete property"
                              onClick={() => setDeleteTarget(p)}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6l-1 14H6L5 6"/>
                                <path d="M10 11v6M14 11v6"/>
                                <path d="M9 6V4h6v2"/>
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  });
                })()
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {meta && <Pagination meta={meta} onPageChange={setPage} />}
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
                  {modal.lockedParentId ? (
                    <div style={{ ...s.input, color: '#6b7280', backgroundColor: '#f9fafb', cursor: 'not-allowed' }}>
                      Unit (under a master)
                    </div>
                  ) : (
                    <select
                      id="p-type"
                      style={s.select}
                      value={form.type}
                      onChange={(e) => handleFieldChange('type', e.target.value)}
                      disabled={saving}
                    >
                      <option value="master">Master Property</option>
                      <option value="unit">Unit (under a master)</option>
                    </select>
                  )}
                </div>
              )}

              {/* Parent property — only for units */}
              {form.type === 'unit' && (
                <div style={s.field}>
                  <label style={s.label} htmlFor="p-parent">
                    Parent Property *
                  </label>
                  {modal.lockedParentId ? (
                    <div style={{ ...s.input, color: '#6b7280', backgroundColor: '#f9fafb', cursor: 'not-allowed' }}>
                      {modal.lockedParentName ?? modal.lockedParentId}
                    </div>
                  ) : (
                    <select
                      id="p-parent"
                      style={{ ...s.select, ...(fieldErrors.parentPropertyId ? s.inputError : {}) }}
                      value={form.parentPropertyId}
                      onChange={(e) => handleFieldChange('parentPropertyId', e.target.value)}
                      disabled={saving}
                    >
                      <option value="">Select master property…</option>
                      {masterOptions.map((m) => (
                        <option key={m._id} value={m._id}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  )}
                  {fieldErrors.parentPropertyId && <div style={s.fieldError}>{fieldErrors.parentPropertyId}</div>}
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
                    onChange={(e) => handleFieldChange('unitName', e.target.value)}
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
                  style={{ ...s.input, ...(fieldErrors.propertyName ? s.inputError : {}) }}
                  type="text"
                  placeholder="e.g. Tower A"
                  value={form.propertyName}
                  onChange={(e) => handleFieldChange('propertyName', e.target.value)}
                  disabled={saving}
                />
                {fieldErrors.propertyName && <div style={s.fieldError}>{fieldErrors.propertyName}</div>}
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
                    onChange={(e) => handleFieldChange('propertyType', e.target.value)}
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
                    onChange={(e) => handleFieldChange('status', e.target.value)}
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
                  style={{ ...s.input, ...(fieldErrors.address ? s.inputError : {}) }}
                  type="text"
                  value={form.address}
                  onChange={(e) => handleFieldChange('address', e.target.value)}
                  disabled={saving}
                />
                {fieldErrors.address && <div style={s.fieldError}>{fieldErrors.address}</div>}
              </div>
              <div style={s.fieldRow}>
                <div style={s.field}>
                  <label style={s.label} htmlFor="p-city">
                    City
                  </label>
                  <input
                    id="p-city"
                    style={{ ...s.input, ...(fieldErrors.city ? s.inputError : {}) }}
                    type="text"
                    value={form.city}
                    onChange={(e) => handleFieldChange('city', e.target.value)}
                    disabled={saving}
                  />
                  {fieldErrors.city && <div style={s.fieldError}>{fieldErrors.city}</div>}
                </div>
                <div style={s.field}>
                  <label style={s.label} htmlFor="p-state">
                    State / Province
                  </label>
                  <input
                    id="p-state"
                    style={{ ...s.input, ...(fieldErrors.state ? s.inputError : {}) }}
                    type="text"
                    value={form.state}
                    onChange={(e) => handleFieldChange('state', e.target.value)}
                    disabled={saving}
                  />
                  {fieldErrors.state && <div style={s.fieldError}>{fieldErrors.state}</div>}
                </div>
              </div>
              <div style={s.fieldRow}>
                <div style={s.field}>
                  <label style={s.label} htmlFor="p-zip">
                    Zip / Postal Code
                  </label>
                  <input
                    id="p-zip"
                    style={{ ...s.input, ...(fieldErrors.zipCode ? s.inputError : {}) }}
                    type="text"
                    value={form.zipCode}
                    onChange={(e) => handleFieldChange('zipCode', e.target.value)}
                    disabled={saving}
                  />
                  {fieldErrors.zipCode && <div style={s.fieldError}>{fieldErrors.zipCode}</div>}
                </div>
                <div style={s.field}>
                  <label style={s.label} htmlFor="p-country">
                    Country
                  </label>
                  <input
                    id="p-country"
                    style={{ ...s.input, ...(fieldErrors.country ? s.inputError : {}) }}
                    type="text"
                    value={form.country}
                    onChange={(e) => handleFieldChange('country', e.target.value)}
                    disabled={saving}
                  />
                  {fieldErrors.country && <div style={s.fieldError}>{fieldErrors.country}</div>}
                </div>
              </div>

              {/* Details & Financials */}
              <div style={s.sectionTitle}>Details & Financials</div>
              <div style={s.fieldRow}>
                <div style={s.field}>
                  <label style={s.label} htmlFor="p-beds">
                    Bedrooms
                  </label>
                  <input
                    id="p-beds"
                    style={{ ...s.input, ...(fieldErrors.bedrooms ? s.inputError : {}) }}
                    type="number"
                    min="0"
                    value={form.bedrooms}
                    onChange={(e) => handleFieldChange('bedrooms', e.target.value)}
                    disabled={saving}
                  />
                  {fieldErrors.bedrooms && <div style={s.fieldError}>{fieldErrors.bedrooms}</div>}
                </div>
                <div style={s.field}>
                  <label style={s.label} htmlFor="p-baths">
                    Bathrooms
                  </label>
                  <input
                    id="p-baths"
                    style={{ ...s.input, ...(fieldErrors.bathrooms ? s.inputError : {}) }}
                    type="number"
                    min="0"
                    value={form.bathrooms}
                    onChange={(e) => handleFieldChange('bathrooms', e.target.value)}
                    disabled={saving}
                  />
                  {fieldErrors.bathrooms && <div style={s.fieldError}>{fieldErrors.bathrooms}</div>}
                </div>
                <div style={s.field}>
                  <label style={s.label} htmlFor="p-sqft">
                    Sq. Ft.
                  </label>
                  <input
                    id="p-sqft"
                    style={{ ...s.input, ...(fieldErrors.squareFeet ? s.inputError : {}) }}
                    type="number"
                    min="0"
                    value={form.squareFeet}
                    onChange={(e) => handleFieldChange('squareFeet', e.target.value)}
                    disabled={saving}
                  />
                  {fieldErrors.squareFeet && <div style={s.fieldError}>{fieldErrors.squareFeet}</div>}
                </div>
              </div>
              <div style={s.fieldRow}>
                <div style={s.field}>
                  <label style={s.label} htmlFor="p-rent">
                    Default Rent (QAR)
                  </label>
                  <input
                    id="p-rent"
                    style={{ ...s.input, ...(fieldErrors.defaultRent ? s.inputError : {}) }}
                    type="number"
                    min="0"
                    value={form.defaultRent}
                    onChange={(e) => handleFieldChange('defaultRent', e.target.value)}
                    disabled={saving}
                  />
                  {fieldErrors.defaultRent && <div style={s.fieldError}>{fieldErrors.defaultRent}</div>}
                </div>
                <div style={s.field}>
                  <label style={s.label} htmlFor="p-contact">
                    Contact Number
                  </label>
                  <input
                    id="p-contact"
                    style={{ ...s.input, ...(fieldErrors.contactNumber ? s.inputError : {}) }}
                    type="text"
                    value={form.contactNumber}
                    onChange={(e) => handleFieldChange('contactNumber', e.target.value)}
                    disabled={saving}
                  />
                  {fieldErrors.contactNumber && <div style={s.fieldError}>{fieldErrors.contactNumber}</div>}
                  <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                    Shown on the listing page with WhatsApp &amp; Call buttons
                  </div>
                </div>
              </div>

              {/* Purchase Information */}
              <div style={s.sectionTitle}>Purchase Information <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(if purchased)</span></div>
              <div style={s.fieldRow}>
                <div style={s.field}>
                  <label style={s.label} htmlFor="p-pprice">
                    Purchase Price (QAR)
                  </label>
                  <input
                    id="p-pprice"
                    style={{ ...s.input, ...(fieldErrors.purchasePrice ? s.inputError : {}) }}
                    type="number"
                    min="0"
                    value={form.purchasePrice}
                    onChange={(e) => handleFieldChange('purchasePrice', e.target.value)}
                    disabled={saving}
                  />
                  {fieldErrors.purchasePrice && <div style={s.fieldError}>{fieldErrors.purchasePrice}</div>}
                </div>
                <div style={s.field}>
                  <label style={s.label} htmlFor="p-curval">
                    Current Value (QAR)
                  </label>
                  {form.type === 'master' && (
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.3rem', lineHeight: 1.4 }}>
                      {unitsSumValue !== null
                        ? <>Auto-filled from sum of unit values (<strong>QAR {unitsSumValue.toLocaleString()}</strong>). You can override this.</>
                        : 'For master properties, this should equal the sum of all unit values. It is used as the portfolio value on the dashboard.'}
                    </div>
                  )}
                  <input
                    id="p-curval"
                    style={{ ...s.input, ...(fieldErrors.currentValue ? s.inputError : {}) }}
                    type="number"
                    min="0"
                    value={form.currentValue}
                    onChange={(e) => handleFieldChange('currentValue', e.target.value)}
                    disabled={saving}
                  />
                  {fieldErrors.currentValue && <div style={s.fieldError}>{fieldErrors.currentValue}</div>}
                </div>
                <div style={s.field}>
                  <label style={s.label} htmlFor="p-pdate">
                    Purchase Date
                  </label>
                  <input
                    id="p-pdate"
                    style={s.input}
                    type="date"
                    value={form.purchaseDate}
                    onChange={(e) => handleFieldChange('purchaseDate', e.target.value)}
                    disabled={saving}
                  />
                </div>
              </div>

              {/* Owner */}
              <div style={s.sectionTitle}>Owner Information <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(if rented)</span></div>
              <div style={s.fieldRow}>
                <div style={s.field}>
                  <label style={s.label} htmlFor="p-oname">
                    Owner Name
                  </label>
                  <input
                    id="p-oname"
                    style={{ ...s.input, ...(fieldErrors.ownerName ? s.inputError : {}) }}
                    type="text"
                    value={form.ownerName}
                    onChange={(e) => handleFieldChange('ownerName', e.target.value)}
                    disabled={saving}
                  />
                  {fieldErrors.ownerName && <div style={s.fieldError}>{fieldErrors.ownerName}</div>}
                </div>
                <div style={s.field}>
                  <label style={s.label} htmlFor="p-ophone">
                    Owner Phone
                  </label>
                  <input
                    id="p-ophone"
                    style={{ ...s.input, ...(fieldErrors.ownerPhone ? s.inputError : {}) }}
                    type="text"
                    value={form.ownerPhone}
                    onChange={(e) => handleFieldChange('ownerPhone', e.target.value)}
                    disabled={saving}
                  />
                  {fieldErrors.ownerPhone && <div style={s.fieldError}>{fieldErrors.ownerPhone}</div>}
                </div>
              </div>
              <div style={s.fieldRow}>
                <div style={s.field}>
                  <label style={s.label} htmlFor="p-oemail">
                    Owner Email
                  </label>
                  <input
                    id="p-oemail"
                    style={{ ...s.input, ...(fieldErrors.ownerEmail ? s.inputError : {}) }}
                    type="email"
                    value={form.ownerEmail}
                    onChange={(e) => handleFieldChange('ownerEmail', e.target.value)}
                    disabled={saving}
                  />
                  {fieldErrors.ownerEmail && <div style={s.fieldError}>{fieldErrors.ownerEmail}</div>}
                </div>
                <div style={s.field}>
                  <label style={s.label} htmlFor="p-orent">
                    Owner Monthly Rent
                  </label>
                  <input
                    id="p-orent"
                    style={{ ...s.input, ...(fieldErrors.ownerMonthlyRent ? s.inputError : {}) }}
                    type="number"
                    min="0"
                    value={form.ownerMonthlyRent}
                    onChange={(e) => handleFieldChange('ownerMonthlyRent', e.target.value)}
                    disabled={saving}
                  />
                  {fieldErrors.ownerMonthlyRent && <div style={s.fieldError}>{fieldErrors.ownerMonthlyRent}</div>}
                </div>
              </div>
              <div style={s.fieldRow}>
                <div style={s.field}>
                  <label style={s.label} htmlFor="p-ocontact">
                    Owner Contact Address
                  </label>
                  <input
                    id="p-ocontact"
                    style={{ ...s.input, ...(fieldErrors.ownerContact ? s.inputError : {}) }}
                    type="text"
                    placeholder="e.g. P.O. Box 123, Doha"
                    value={form.ownerContact}
                    onChange={(e) => handleFieldChange('ownerContact', e.target.value)}
                    disabled={saving}
                  />
                  {fieldErrors.ownerContact && <div style={s.fieldError}>{fieldErrors.ownerContact}</div>}
                </div>
                <div style={s.field}>
                  <label style={s.label} htmlFor="p-orentstart">
                    Rent Start Date
                  </label>
                  <input
                    id="p-orentstart"
                    style={s.input}
                    type="date"
                    value={form.ownerRentStartDate}
                    onChange={(e) => handleFieldChange('ownerRentStartDate', e.target.value)}
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
                  style={{ ...s.textarea, ...(fieldErrors.notes ? s.inputError : {}) }}
                  value={form.notes}
                  onChange={(e) => handleFieldChange('notes', e.target.value)}
                  disabled={saving}
                />
                {fieldErrors.notes && <div style={s.fieldError}>{fieldErrors.notes}</div>}
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

      {/* Delete confirm dialog */}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete Property"
          message={
            <>
              Are you sure you want to delete{' '}
              <strong>{deleteTarget.propertyName}</strong>? This cannot be undone.
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
