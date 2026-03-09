import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import type { ZodError } from 'zod';
import { maintenanceApi } from '@api/maintenance.api';
import { maintenanceSchema, editMaintenanceSchema } from '@validations/maintenance.form.schema';
import type {
  ApiMaintenanceRequest,
  ListMaintenanceParams,
  MaintenancePriority,
  MaintenanceStatus,
  CreateMaintenanceInput,
  UpdateMaintenanceInput,
} from '@api/maintenance.api';
import { propertiesApi } from '@api/properties.api';
import type { DropdownItem } from '@api/properties.api';
import { tenantsApi } from '@api/tenants.api';
import type { TenantDropdownItem } from '@api/tenants.api';
import type { PaginationMeta } from '@api/users.api';
import { sh } from '@/styles/shared';
import { resolveError, zodFieldErrors } from '@utils/formHelpers';
import type { FieldErrors } from '@utils/formHelpers';
import { Pagination } from '@components/common/Pagination';
import { ConfirmDialog } from '@components/common/ConfirmDialog';
import { formatDateLong } from '@utils/formatDate';

// ── Styles ────────────────────────────────────────────────────────────────────

const s = {
  ...sh,
  // Page-specific overrides / additions
  page: { padding: '1.5rem', maxWidth: '1100px' },
  title: { fontSize: '1.4rem', fontWeight: 700, color: '#1a1a2e', margin: 0 },
  btn: {
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 500,
  },
  btnPrimary: { backgroundColor: '#1a1a2e', color: '#fff' },
  btnSecondary: {
    backgroundColor: '#fff',
    color: '#374151',
    border: '1px solid #d1d5db',
  },
  btnDanger: { backgroundColor: '#dc2626', color: '#fff' },
  btnSm: { padding: '0.3rem 0.65rem', fontSize: '0.775rem' },
  iconBtn: {
    padding: '0.3rem',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    borderRadius: '4px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    overflow: 'hidden',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.9rem',
    marginBottom: '0.9rem',
  },
  formFull: { marginBottom: '0.9rem' },
  errText: { color: '#dc2626', fontSize: '0.8rem', marginTop: '0.75rem' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const PRIORITY_COLORS: Record<MaintenancePriority, { bg: string; color: string }> = {
  Emergency: { bg: '#fee2e2', color: '#991b1b' },
  High: { bg: '#ffedd5', color: '#9a3412' },
  Medium: { bg: '#fef9c3', color: '#713f12' },
  Low: { bg: '#dbeafe', color: '#1e40af' },
};

const STATUS_COLORS: Record<MaintenanceStatus, { bg: string; color: string }> = {
  Pending: { bg: '#fef9c3', color: '#713f12' },
  'In Progress': { bg: '#dbeafe', color: '#1e40af' },
  Completed: { bg: '#dcfce7', color: '#15803d' },
  Cancelled: { bg: '#f3f4f6', color: '#6b7280' },
};

function PriorityBadge({ priority }: { priority: MaintenancePriority }) {
  const c = PRIORITY_COLORS[priority];
  return <span style={{ ...s.badge, backgroundColor: c.bg, color: c.color }}>{priority}</span>;
}

function StatusBadge({ status }: { status: MaintenanceStatus }) {
  const c = STATUS_COLORS[status];
  return <span style={{ ...s.badge, backgroundColor: c.bg, color: c.color }}>{status}</span>;
}

// ── Default form ──────────────────────────────────────────────────────────────

interface FormState {
  id?: string;
  propertyId: string;
  tenantId: string;
  title: string;
  description: string;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  cost: string;
  completedDate: string;
  notes: string;
}

const defaultForm = (): FormState => ({
  propertyId: '',
  tenantId: '',
  title: '',
  description: '',
  priority: 'Medium',
  status: 'Pending',
  cost: '',
  completedDate: '',
  notes: '',
});

// ── Component ─────────────────────────────────────────────────────────────────

export default function MaintenancePage() {
  const [requests, setRequests] = useState<ApiMaintenanceRequest[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [filterProperty, setFilterProperty] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [propertyOptions, setPropertyOptions] = useState<DropdownItem[]>([]);
  const [tenantOptions, setTenantOptions] = useState<TenantDropdownItem[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [form, setForm] = useState<FormState>(defaultForm());
  const [modalError, setModalError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    propertiesApi
      .dropdown()
      .then((items) => setPropertyOptions(items))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!form.propertyId) {
      setTenantOptions([]);
      return;
    }
    tenantsApi
      .dropdown({ propertyId: form.propertyId, status: 'Active' })
      .then(setTenantOptions)
      .catch(() => setTenantOptions([]));
  }, [form.propertyId]);

  const propertyLabel = (id: string) => propertyOptions.find((o) => o._id === id)?.label ?? id;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: ListMaintenanceParams = { page, limit: 20 };
      if (filterProperty) params.propertyId = filterProperty;
      if (filterStatus) params.status = filterStatus as MaintenanceStatus;
      if (filterPriority) params.priority = filterPriority as MaintenancePriority;
      if (search.trim()) params.search = search.trim();

      const { requests: data, meta: pageMeta } = await maintenanceApi.list(params);
      setRequests(data);
      setMeta(pageMeta);
    } catch {
      setError('Failed to load maintenance requests.');
    } finally {
      setLoading(false);
    }
  }, [page, filterProperty, filterStatus, filterPriority, search]);

  useEffect(() => {
    load();
  }, [load]);

  function handleSearchChange(v: string) {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setSearch(v);
      setPage(1);
    }, 400);
  }

  function openAdd() {
    setForm(defaultForm());
    setModalMode('add');
    setModalError('');
    setFieldErrors({});
    setShowModal(true);
  }

  function openEdit(r: ApiMaintenanceRequest) {
    setForm({
      id: r._id,
      propertyId: r.propertyId,
      tenantId: r.tenantId ?? '',
      title: r.title,
      description: r.description ?? '',
      priority: r.priority,
      status: r.status,
      cost: r.cost !== null && r.cost !== undefined ? String(r.cost) : '',
      completedDate: r.completedDate ? r.completedDate.slice(0, 10) : '',
      notes: r.notes ?? '',
    });
    setModalMode('edit');
    setModalError('');
    setFieldErrors({});
    setShowModal(true);
  }

  function handleFieldChange<K extends keyof FormState>(key: K, value: FormState[K]) {
    const newForm = { ...form, [key]: value };
    setForm(newForm);
    const schema = modalMode === 'add' ? maintenanceSchema : editMaintenanceSchema;
    const result = schema.safeParse(newForm);
    if (result.success) {
      setFieldErrors((prev) => { const next = { ...prev }; delete next[key as string]; return next; });
    } else {
      const errs = zodFieldErrors(result.error as ZodError);
      if (errs[key as string]) {
        setFieldErrors((prev) => ({ ...prev, [key]: errs[key as string] }));
      } else {
        setFieldErrors((prev) => { const next = { ...prev }; delete next[key as string]; return next; });
      }
    }
  }

  async function handleSave() {
    const schema = modalMode === 'add' ? maintenanceSchema : editMaintenanceSchema;
    const result = schema.safeParse(form);
    if (!result.success) {
      setFieldErrors(zodFieldErrors(result.error as ZodError));
      setModalError(result.error.issues[0]?.message ?? 'Please fix the errors above.');
      return;
    }
    setFieldErrors({});
    setSaving(true);
    setModalError('');
    try {
      if (modalMode === 'add') {
        const payload: CreateMaintenanceInput = {
          propertyId: form.propertyId,
          title: form.title.trim(),
          priority: form.priority,
          status: form.status,
        };
        if (form.tenantId) payload.tenantId = form.tenantId;
        if (form.description.trim()) payload.description = form.description.trim();
        if (form.cost !== '') payload.cost = Number(form.cost);
        if (form.completedDate) payload.completedDate = new Date(form.completedDate).toISOString();
        if (form.notes.trim()) payload.notes = form.notes.trim();
        await maintenanceApi.create(payload);
      } else {
        const payload: UpdateMaintenanceInput = {
          title: form.title.trim(),
          description: form.description.trim() || null,
          priority: form.priority,
          status: form.status,
          cost: form.cost !== '' ? Number(form.cost) : null,
          completedDate: form.completedDate
            ? new Date(form.completedDate).toISOString()
            : null,
          notes: form.notes.trim() || null,
        };
        await maintenanceApi.update(form.id!, payload);
      }
      setShowModal(false);
      load();
    } catch (e) {
      setModalError(resolveError(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await maintenanceApi.remove(deleteId);
      setDeleteId(null);
      load();
    } catch {
      // keep dialog open on failure
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <h1 style={s.title}>Maintenance Requests</h1>
        <button style={{ ...s.btn, ...s.btnPrimary }} onClick={openAdd}>
          + New Request
        </button>
      </div>

      {/* Filters */}
      <div style={s.filterBar}>
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
          value={filterPriority}
          onChange={(e) => {
            setFilterPriority(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Priorities</option>
          {(['Emergency', 'High', 'Medium', 'Low'] as MaintenancePriority[]).map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        <select
          style={s.filterSelect}
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Statuses</option>
          {(['Pending', 'In Progress', 'Completed', 'Cancelled'] as MaintenanceStatus[]).map(
            (st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ),
          )}
        </select>

        <input
          style={s.searchInput}
          placeholder="Search title…"
          defaultValue={search}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
      </div>

      {error && <div style={s.errorBanner}>{error}</div>}

      {/* Table */}
      <div style={s.card}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>Loading…</div>
        ) : requests.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>
            No maintenance requests found.
          </div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Title</th>
                <th style={s.th}>Property</th>
                <th style={s.th}>Priority</th>
                <th style={s.th}>Status</th>
                <th style={s.th}>Cost (QAR)</th>
                <th style={s.th}>Reported</th>
                <th style={s.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr
                  key={r._id}
                  style={{
                    backgroundColor: r.priority === 'Emergency' ? '#fff5f5' : undefined,
                  }}
                >
                  <td style={s.td}>
                    <Link
                      to={`/maintenance/${r._id}`}
                      style={{ color: '#1a1a2e', fontWeight: 600, textDecoration: 'none' }}
                    >
                      {r.title}
                    </Link>
                    {r.description && (
                      <div style={{ color: '#6b7280', fontSize: '0.78rem', marginTop: '0.2rem' }}>
                        {r.description.length > 60
                          ? r.description.slice(0, 60) + '…'
                          : r.description}
                      </div>
                    )}
                  </td>
                  <td style={s.td}>{propertyLabel(r.propertyId)}</td>
                  <td style={s.td}>
                    <PriorityBadge priority={r.priority} />
                  </td>
                  <td style={s.td}>
                    <StatusBadge status={r.status} />
                  </td>
                  <td style={s.td}>
                    {r.cost !== null && r.cost !== undefined ? r.cost.toLocaleString() : '—'}
                  </td>
                  <td style={s.td}>{formatDateLong(r.createdAt)}</td>
                  <td style={{ ...s.td, whiteSpace: 'nowrap' as const }}>
                    <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                      <Link
                        to={`/maintenance/${r._id}`}
                        title="View details"
                        style={{ ...s.iconBtn, color: '#6b7280', textDecoration: 'none' }}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </Link>
                      <button
                        style={{ ...s.iconBtn, color: '#1d4ed8' }}
                        title="Edit request"
                        onClick={() => openEdit(r)}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        style={{ ...s.iconBtn, color: '#be123c' }}
                        title="Delete request"
                        onClick={() => setDeleteId(r._id)}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          <path d="M10 11v6M14 11v6" />
                          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {meta && <Pagination meta={meta} onPageChange={setPage} />}

      {/* Add / Edit Modal */}
      {showModal && (
        <div
          style={s.overlay}
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div style={s.modal}>
            <div style={s.modalTitle}>
              {modalMode === 'add' ? 'New Maintenance Request' : 'Edit Request'}
            </div>

            <div style={s.formFull}>
              <label style={s.label}>Property *</label>
              <select
                style={{ ...s.select, ...(fieldErrors.propertyId ? s.inputError : {}) }}
                value={form.propertyId}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, propertyId: e.target.value, tenantId: '' }));
                }}
                disabled={modalMode === 'edit'}
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

            <div style={s.formFull}>
              <label style={s.label}>Title *</label>
              <input
                style={{ ...s.input, ...(fieldErrors.title ? s.inputError : {}) }}
                value={form.title}
                onChange={(e) => handleFieldChange('title', e.target.value)}
                placeholder="e.g. Leaking bathroom pipe"
              />
              {fieldErrors.title && <div style={s.fieldError}>{fieldErrors.title}</div>}
            </div>

            <div style={s.formFull}>
              <label style={s.label}>Tenant (optional)</label>
              <select
                style={s.select}
                value={form.tenantId}
                onChange={(e) => handleFieldChange('tenantId', e.target.value)}
                disabled={!form.propertyId}
              >
                <option value="">
                  {!form.propertyId ? 'Select a property first…' : tenantOptions.length === 0 ? 'No active tenants for this property' : '— None —'}
                </option>
                {tenantOptions.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.firstName} {t.lastName}
                  </option>
                ))}
              </select>
            </div>

            <div style={s.formFull}>
              <label style={s.label}>Description</label>
              <textarea
                style={{
                  ...s.textarea,
                  minHeight: '80px',
                }}
                value={form.description}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                placeholder="Describe the issue…"
              />
            </div>

            <div style={s.formGrid}>
              <div>
                <label style={s.label}>Priority</label>
                <select
                  style={s.select}
                  value={form.priority}
                  onChange={(e) => handleFieldChange('priority', e.target.value as MaintenancePriority)}
                >
                  {(['Emergency', 'High', 'Medium', 'Low'] as MaintenancePriority[]).map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={s.label}>Status</label>
                <select
                  style={s.select}
                  value={form.status}
                  onChange={(e) => handleFieldChange('status', e.target.value as MaintenanceStatus)}
                >
                  {(['Pending', 'In Progress', 'Completed', 'Cancelled'] as MaintenanceStatus[]).map(
                    (st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div>
                <label style={s.label}>Cost (QAR)</label>
                <input
                  type="number"
                  min="0"
                  style={{ ...s.input, ...(fieldErrors.cost ? s.inputError : {}) }}
                  value={form.cost}
                  onChange={(e) => handleFieldChange('cost', e.target.value)}
                  placeholder="0.00"
                />
                {fieldErrors.cost && <div style={s.fieldError}>{fieldErrors.cost}</div>}
              </div>

              <div>
                <label style={s.label}>Completed Date</label>
                <input
                  type="date"
                  style={s.input}
                  value={form.completedDate}
                  onChange={(e) => handleFieldChange('completedDate', e.target.value)}
                />
              </div>
            </div>

            <div style={s.formFull}>
              <label style={s.label}>Notes</label>
              <textarea
                style={s.textarea}
                value={form.notes}
                onChange={(e) => handleFieldChange('notes', e.target.value)}
                placeholder="Additional notes…"
              />
            </div>

            {modalError && <div style={s.errText}>{modalError}</div>}

            <div style={s.modalActions}>
              <button
                style={s.cancelBtn}
                onClick={() => setShowModal(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                style={{ ...s.submitBtn, ...(saving ? s.submitBtnDisabled : {}) }}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving…' : modalMode === 'add' ? 'Create Request' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <ConfirmDialog
          title="Delete Maintenance Request?"
          message="This action cannot be undone."
          confirmLabel="Delete"
          isLoading={deleting}
          isDanger
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  );
}
