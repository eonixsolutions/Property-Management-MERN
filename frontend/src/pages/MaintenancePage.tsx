import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import type { AxiosError } from 'axios';
import { maintenanceApi } from '@api/maintenance.api';
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
import type { PaginationMeta } from '@api/users.api';

// ── Styles ────────────────────────────────────────────────────────────────────

const s = {
  page: { padding: '1.5rem', maxWidth: '1100px' },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.25rem',
  },
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
  filterBar: {
    display: 'flex',
    gap: '0.75rem',
    flexWrap: 'wrap' as const,
    marginBottom: '1rem',
    alignItems: 'center',
  },
  input: {
    padding: '0.45rem 0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '0.875rem',
    minWidth: '160px',
  },
  select: {
    padding: '0.45rem 0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '0.875rem',
    backgroundColor: '#fff',
  },
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: '0.875rem' },
  th: {
    textAlign: 'left' as const,
    padding: '0.6rem 0.75rem',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
    fontWeight: 600,
    color: '#374151',
    whiteSpace: 'nowrap' as const,
  },
  td: {
    padding: '0.65rem 0.75rem',
    borderBottom: '1px solid #f3f4f6',
    verticalAlign: 'top' as const,
  },
  badge: {
    display: 'inline-block',
    padding: '0.18rem 0.55rem',
    borderRadius: '999px',
    fontSize: '0.72rem',
    fontWeight: 600,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    overflow: 'hidden',
  },
  pagination: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
    marginTop: '1rem',
    justifyContent: 'flex-end',
  },
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '10px',
    padding: '1.75rem',
    width: '560px',
    maxWidth: '95vw',
    maxHeight: '90vh',
    overflowY: 'auto' as const,
  },
  modalTitle: {
    fontSize: '1.1rem',
    fontWeight: 700,
    marginBottom: '1.25rem',
    color: '#1a1a2e',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.9rem',
    marginBottom: '0.9rem',
  },
  formFull: { marginBottom: '0.9rem' },
  label: {
    display: 'block',
    fontSize: '0.8rem',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '0.3rem',
  },
  modalActions: {
    display: 'flex',
    gap: '0.75rem',
    justifyContent: 'flex-end',
    marginTop: '1.25rem',
  },
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

function fmtDate(dateStr?: string) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ── Default form ──────────────────────────────────────────────────────────────

interface FormState {
  id?: string;
  propertyId: string;
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

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [form, setForm] = useState<FormState>(defaultForm());
  const [modalError, setModalError] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    propertiesApi
      .dropdown()
      .then((items) => setPropertyOptions(items))
      .catch(() => {});
  }, []);

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
    setShowModal(true);
  }

  function openEdit(r: ApiMaintenanceRequest) {
    setForm({
      id: r._id,
      propertyId: r.propertyId,
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
    setShowModal(true);
  }

  function setF<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!form.propertyId) {
      setModalError('Property is required.');
      return;
    }
    if (!form.title.trim()) {
      setModalError('Title is required.');
      return;
    }
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
      const err = e as AxiosError<{ message?: string }>;
      setModalError(err.response?.data?.message ?? 'Save failed. Please try again.');
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
          style={s.select}
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
          style={s.select}
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
          style={s.select}
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
          style={s.input}
          placeholder="Search title…"
          defaultValue={search}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
      </div>

      {error && <div style={s.errText}>{error}</div>}

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
                  <td style={s.td}>{fmtDate(r.createdAt)}</td>
                  <td style={s.td}>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <Link
                        to={`/maintenance/${r._id}`}
                        style={{
                          ...s.btn,
                          ...s.btnSecondary,
                          ...s.btnSm,
                          textDecoration: 'none',
                          display: 'inline-block',
                        }}
                      >
                        View
                      </Link>
                      <button
                        style={{ ...s.btn, ...s.btnSecondary, ...s.btnSm }}
                        onClick={() => openEdit(r)}
                      >
                        Edit
                      </button>
                      <button
                        style={{ ...s.btn, ...s.btnDanger, ...s.btnSm }}
                        onClick={() => setDeleteId(r._id)}
                      >
                        Delete
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
      {meta && meta.totalPages > 1 && (
        <div style={s.pagination}>
          <button
            style={{ ...s.btn, ...s.btnSecondary, ...s.btnSm }}
            disabled={!meta.hasPrevPage}
            onClick={() => setPage((p) => p - 1)}
          >
            ← Prev
          </button>
          <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
            Page {meta.page} of {meta.totalPages}
          </span>
          <button
            style={{ ...s.btn, ...s.btnSecondary, ...s.btnSm }}
            disabled={!meta.hasNextPage}
            onClick={() => setPage((p) => p + 1)}
          >
            Next →
          </button>
        </div>
      )}

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
                style={{ ...s.select, width: '100%' }}
                value={form.propertyId}
                onChange={(e) => setF('propertyId', e.target.value)}
                disabled={modalMode === 'edit'}
              >
                <option value="">Select property…</option>
                {propertyOptions.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={s.formFull}>
              <label style={s.label}>Title *</label>
              <input
                style={{ ...s.input, width: '100%', boxSizing: 'border-box' as const }}
                value={form.title}
                onChange={(e) => setF('title', e.target.value)}
                placeholder="e.g. Leaking bathroom pipe"
              />
            </div>

            <div style={s.formFull}>
              <label style={s.label}>Description</label>
              <textarea
                style={{
                  ...s.input,
                  width: '100%',
                  boxSizing: 'border-box' as const,
                  minHeight: '80px',
                  resize: 'vertical' as const,
                }}
                value={form.description}
                onChange={(e) => setF('description', e.target.value)}
                placeholder="Describe the issue…"
              />
            </div>

            <div style={s.formGrid}>
              <div>
                <label style={s.label}>Priority</label>
                <select
                  style={{ ...s.select, width: '100%' }}
                  value={form.priority}
                  onChange={(e) => setF('priority', e.target.value as MaintenancePriority)}
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
                  style={{ ...s.select, width: '100%' }}
                  value={form.status}
                  onChange={(e) => setF('status', e.target.value as MaintenanceStatus)}
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
                  style={{ ...s.input, width: '100%', boxSizing: 'border-box' as const }}
                  value={form.cost}
                  onChange={(e) => setF('cost', e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div>
                <label style={s.label}>Completed Date</label>
                <input
                  type="date"
                  style={{ ...s.input, width: '100%', boxSizing: 'border-box' as const }}
                  value={form.completedDate}
                  onChange={(e) => setF('completedDate', e.target.value)}
                />
              </div>
            </div>

            <div style={s.formFull}>
              <label style={s.label}>Notes</label>
              <textarea
                style={{
                  ...s.input,
                  width: '100%',
                  boxSizing: 'border-box' as const,
                  minHeight: '60px',
                  resize: 'vertical' as const,
                }}
                value={form.notes}
                onChange={(e) => setF('notes', e.target.value)}
                placeholder="Additional notes…"
              />
            </div>

            {modalError && <div style={s.errText}>{modalError}</div>}

            <div style={s.modalActions}>
              <button
                style={{ ...s.btn, ...s.btnSecondary }}
                onClick={() => setShowModal(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                style={{ ...s.btn, ...s.btnPrimary }}
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
        <div
          style={s.overlay}
          onClick={(e) => e.target === e.currentTarget && setDeleteId(null)}
        >
          <div style={{ ...s.modal, maxWidth: '420px' }}>
            <div style={s.modalTitle}>Delete Maintenance Request?</div>
            <p style={{ color: '#374151', fontSize: '0.9rem' }}>
              This action cannot be undone.
            </p>
            <div style={s.modalActions}>
              <button
                style={{ ...s.btn, ...s.btnSecondary }}
                onClick={() => setDeleteId(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                style={{ ...s.btn, ...s.btnDanger }}
                onClick={handleDelete}
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

