import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { AxiosError } from 'axios';
import { maintenanceApi } from '@api/maintenance.api';
import type {
  ApiMaintenanceRequest,
  MaintenancePriority,
  MaintenanceStatus,
  UpdateMaintenanceInput,
} from '@api/maintenance.api';
import { propertiesApi } from '@api/properties.api';
import type { DropdownItem } from '@api/properties.api';

// ── Styles ────────────────────────────────────────────────────────────────────

const s = {
  page: { padding: '1.5rem', maxWidth: '860px' },
  backBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
    padding: '0.4rem 0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    backgroundColor: '#fff',
    fontSize: '0.8rem',
    cursor: 'pointer',
    color: '#374151',
    marginBottom: '1.25rem',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  titleGroup: { display: 'flex', flexDirection: 'column' as const, gap: '0.4rem' },
  title: { fontSize: '1.4rem', fontWeight: 700, color: '#1a1a2e', margin: 0 },
  badgeRow: { display: 'flex', gap: '0.5rem', alignItems: 'center' },
  badge: {
    display: 'inline-block',
    padding: '0.2rem 0.6rem',
    borderRadius: '999px',
    fontSize: '0.75rem',
    fontWeight: 600,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '1.5rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    marginBottom: '1.25rem',
  },
  cardTitle: {
    fontSize: '0.85rem',
    fontWeight: 700,
    color: '#6b7280',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: '1rem',
  },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem 1.5rem' },
  fieldLabel: { fontSize: '0.78rem', color: '#9ca3af', fontWeight: 600, marginBottom: '0.2rem' },
  fieldValue: { fontSize: '0.9rem', color: '#1f2937' },
  descBox: {
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    padding: '0.9rem',
    fontSize: '0.875rem',
    color: '#374151',
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap' as const,
  },
  btn: {
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 500,
  },
  btnPrimary: { backgroundColor: '#1a1a2e', color: '#fff' },
  btnSecondary: { backgroundColor: '#fff', color: '#374151', border: '1px solid #d1d5db' },
  btnDanger: { backgroundColor: '#dc2626', color: '#fff' },
  input: {
    padding: '0.45rem 0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '0.875rem',
    width: '100%',
    boxSizing: 'border-box' as const,
  },
  select: {
    padding: '0.45rem 0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '0.875rem',
    backgroundColor: '#fff',
    width: '100%',
  },
  label: {
    display: 'block',
    fontSize: '0.8rem',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '0.3rem',
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
  modalTitle: { fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem', color: '#1a1a2e' },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.9rem',
    marginBottom: '0.9rem',
  },
  formFull: { marginBottom: '0.9rem' },
  modalActions: {
    display: 'flex',
    gap: '0.75rem',
    justifyContent: 'flex-end',
    marginTop: '1.25rem',
  },
  errText: { color: '#dc2626', fontSize: '0.8rem', marginTop: '0.75rem' },
};

// ── Badge helpers ─────────────────────────────────────────────────────────────

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

// ── Edit form state ───────────────────────────────────────────────────────────

interface EditFormState {
  title: string;
  description: string;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  cost: string;
  completedDate: string;
  notes: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MaintenanceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [request, setRequest] = useState<ApiMaintenanceRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [propertyOptions, setPropertyOptions] = useState<DropdownItem[]>([]);

  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState<EditFormState>({
    title: '',
    description: '',
    priority: 'Medium',
    status: 'Pending',
    cost: '',
    completedDate: '',
    notes: '',
  });
  const [editError, setEditError] = useState('');
  const [saving, setSaving] = useState(false);

  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    maintenanceApi
      .get(id)
      .then(({ request: r }) => setRequest(r))
      .catch(() => setLoadError('Maintenance request not found.'))
      .finally(() => setLoading(false));

    propertiesApi
      .dropdown()
      .then((items) => setPropertyOptions(items))
      .catch(() => {});
  }, [id]);

  const propertyLabel = (pid: string) =>
    propertyOptions.find((o) => o._id === pid)?.label ?? pid;

  function openEdit() {
    if (!request) return;
    setEditForm({
      title: request.title,
      description: request.description ?? '',
      priority: request.priority,
      status: request.status,
      cost: request.cost !== null && request.cost !== undefined ? String(request.cost) : '',
      completedDate: request.completedDate ? request.completedDate.slice(0, 10) : '',
      notes: request.notes ?? '',
    });
    setEditError('');
    setShowEdit(true);
  }

  function setEF<K extends keyof EditFormState>(key: K, value: EditFormState[K]) {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!request || !editForm.title.trim()) {
      setEditError('Title is required.');
      return;
    }
    setSaving(true);
    setEditError('');
    try {
      const payload: UpdateMaintenanceInput = {
        title: editForm.title.trim(),
        description: editForm.description.trim() || null,
        priority: editForm.priority,
        status: editForm.status,
        cost: editForm.cost !== '' ? Number(editForm.cost) : null,
        completedDate: editForm.completedDate
          ? new Date(editForm.completedDate).toISOString()
          : null,
        notes: editForm.notes.trim() || null,
      };
      const { request: updated } = await maintenanceApi.update(request._id, payload);
      setRequest(updated);
      setShowEdit(false);
    } catch (e) {
      const err = e as AxiosError<{ message?: string }>;
      setEditError(err.response?.data?.message ?? 'Save failed. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!request) return;
    setDeleting(true);
    try {
      await maintenanceApi.remove(request._id);
      navigate('/maintenance');
    } catch {
      setDeleting(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return <div style={{ padding: '2rem', color: '#6b7280' }}>Loading…</div>;
  }

  if (loadError || !request) {
    return (
      <div style={s.page}>
        <button style={s.backBtn} onClick={() => navigate(-1)}>
          ← Back
        </button>
        <div style={{ color: '#dc2626' }}>{loadError || 'Not found.'}</div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <button style={s.backBtn} onClick={() => navigate(-1)}>
        ← Back
      </button>

      {/* Header */}
      <div style={s.header}>
        <div style={s.titleGroup}>
          <h1 style={s.title}>{request.title}</h1>
          <div style={s.badgeRow}>
            <PriorityBadge priority={request.priority} />
            <StatusBadge status={request.status} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button style={{ ...s.btn, ...s.btnSecondary }} onClick={openEdit}>
            Edit
          </button>
          <button style={{ ...s.btn, ...s.btnDanger }} onClick={() => setShowDelete(true)}>
            Delete
          </button>
        </div>
      </div>

      {/* Details */}
      <div style={s.card}>
        <div style={s.cardTitle}>Details</div>
        <div style={s.grid}>
          <div>
            <div style={s.fieldLabel}>Property</div>
            <div style={s.fieldValue}>{propertyLabel(request.propertyId)}</div>
          </div>
          <div>
            <div style={s.fieldLabel}>Reported</div>
            <div style={s.fieldValue}>{fmtDate(request.createdAt)}</div>
          </div>
          <div>
            <div style={s.fieldLabel}>Last Updated</div>
            <div style={s.fieldValue}>{fmtDate(request.updatedAt)}</div>
          </div>
          {request.cost !== null && request.cost !== undefined && (
            <div>
              <div style={s.fieldLabel}>Cost (QAR)</div>
              <div style={s.fieldValue}>{request.cost.toLocaleString()}</div>
            </div>
          )}
          {request.completedDate && (
            <div>
              <div style={s.fieldLabel}>Completed Date</div>
              <div style={s.fieldValue}>{fmtDate(request.completedDate)}</div>
            </div>
          )}
        </div>

        {request.description && (
          <div style={{ marginTop: '1.25rem' }}>
            <div style={s.fieldLabel}>Description</div>
            <div style={{ ...s.descBox, marginTop: '0.4rem' }}>{request.description}</div>
          </div>
        )}

        {request.notes && (
          <div style={{ marginTop: '1rem' }}>
            <div style={s.fieldLabel}>Notes</div>
            <div style={{ ...s.descBox, marginTop: '0.4rem' }}>{request.notes}</div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEdit && (
        <div
          style={s.overlay}
          onClick={(e) => e.target === e.currentTarget && setShowEdit(false)}
        >
          <div style={s.modal}>
            <div style={s.modalTitle}>Edit Maintenance Request</div>

            <div style={s.formFull}>
              <label style={s.label}>Title *</label>
              <input
                style={s.input}
                value={editForm.title}
                onChange={(e) => setEF('title', e.target.value)}
              />
            </div>

            <div style={s.formFull}>
              <label style={s.label}>Description</label>
              <textarea
                style={{
                  ...s.input,
                  minHeight: '80px',
                  resize: 'vertical' as const,
                }}
                value={editForm.description}
                onChange={(e) => setEF('description', e.target.value)}
              />
            </div>

            <div style={s.formGrid}>
              <div>
                <label style={s.label}>Priority</label>
                <select
                  style={s.select}
                  value={editForm.priority}
                  onChange={(e) => setEF('priority', e.target.value as MaintenancePriority)}
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
                  value={editForm.status}
                  onChange={(e) => setEF('status', e.target.value as MaintenanceStatus)}
                >
                  {(
                    ['Pending', 'In Progress', 'Completed', 'Cancelled'] as MaintenanceStatus[]
                  ).map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={s.label}>Cost (QAR)</label>
                <input
                  type="number"
                  min="0"
                  style={s.input}
                  value={editForm.cost}
                  onChange={(e) => setEF('cost', e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div>
                <label style={s.label}>Completed Date</label>
                <input
                  type="date"
                  style={s.input}
                  value={editForm.completedDate}
                  onChange={(e) => setEF('completedDate', e.target.value)}
                />
              </div>
            </div>

            <div style={s.formFull}>
              <label style={s.label}>Notes</label>
              <textarea
                style={{
                  ...s.input,
                  minHeight: '60px',
                  resize: 'vertical' as const,
                }}
                value={editForm.notes}
                onChange={(e) => setEF('notes', e.target.value)}
              />
            </div>

            {editError && <div style={s.errText}>{editError}</div>}

            <div style={s.modalActions}>
              <button
                style={{ ...s.btn, ...s.btnSecondary }}
                onClick={() => setShowEdit(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                style={{ ...s.btn, ...s.btnPrimary }}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {showDelete && (
        <div
          style={s.overlay}
          onClick={(e) => e.target === e.currentTarget && setShowDelete(false)}
        >
          <div style={{ ...s.modal, maxWidth: '420px' }}>
            <div style={s.modalTitle}>Delete Maintenance Request?</div>
            <p style={{ color: '#374151', fontSize: '0.9rem' }}>
              This action cannot be undone. You will be redirected to the maintenance list.
            </p>
            <div style={s.modalActions}>
              <button
                style={{ ...s.btn, ...s.btnSecondary }}
                onClick={() => setShowDelete(false)}
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
