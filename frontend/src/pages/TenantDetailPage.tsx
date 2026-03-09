import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type { AxiosError } from 'axios';
import { tenantsApi } from '@api/tenants.api';
import type { ApiTenant, ApiRentPayment, TenantStatus, RentPaymentStatus } from '@api/tenants.api';
import { rentPaymentsApi } from '@api/rent-payments.api';
import { propertiesApi } from '@api/properties.api';
import type { ApiProperty } from '@api/properties.api';
import { documentsApi, formatFileSize } from '@api/documents.api';
import type { ApiDocument, DocumentType } from '@api/documents.api';
import { chequesApi } from '@api/cheques.api';
import type { ApiTenantCheque, TenantChequeStatus } from '@api/cheques.api';
import { maintenanceApi } from '@api/maintenance.api';
import type { ApiMaintenanceRequest, MaintenancePriority, MaintenanceStatus } from '@api/maintenance.api';
import { transactionsApi } from '@api/transactions.api';
import type { ApiTransaction, TransactionType } from '@api/transactions.api';

// ── Styles ────────────────────────────────────────────────────────────────────

const s = {
  page: { padding: '1.5rem', maxWidth: '900px' },
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
  badgeRow: { display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' as const },
  badge: {
    display: 'inline-block',
    padding: '0.2rem 0.6rem',
    borderRadius: '999px',
    fontSize: '0.75rem',
    fontWeight: 600,
  },
  editBtn: {
    padding: '0.45rem 1rem',
    backgroundColor: '#4f8ef7',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
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
    color: '#374151',
    marginBottom: '1rem',
    paddingBottom: '0.5rem',
    borderBottom: '1px solid #f3f4f6',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.75rem 1.5rem',
  },
  fieldLabel: { fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.15rem' },
  fieldValue: { fontSize: '0.875rem', color: '#1f2937', fontWeight: 500 },
  // Table
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
  },
  th: {
    textAlign: 'left' as const,
    padding: '0.6rem 0.75rem',
    fontSize: '0.72rem',
    fontWeight: 600,
    color: '#6b7280',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  td: {
    padding: '0.65rem 0.75rem',
    fontSize: '0.85rem',
    color: '#374151',
    borderBottom: '1px solid #f3f4f6',
  },
  emptyRow: { textAlign: 'center' as const, color: '#9ca3af', fontSize: '0.85rem' },
  placeholder: {
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    padding: '1.25rem 1.5rem',
    marginBottom: '1.25rem',
    border: '1px dashed #e5e7eb',
  },
  placeholderTitle: { fontSize: '0.875rem', fontWeight: 600, color: '#9ca3af', margin: 0 },
  placeholderText: { fontSize: '0.8rem', color: '#d1d5db', margin: '0.25rem 0 0' },
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
  errorBanner: {
    backgroundColor: '#fee2e2',
    border: '1px solid #fca5a5',
    color: '#991b1b',
    borderRadius: '4px',
    padding: '0.6rem 0.75rem',
    fontSize: '0.875rem',
    marginBottom: '1rem',
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

function rentPaymentBadge(status: RentPaymentStatus): React.CSSProperties {
  const map: Record<RentPaymentStatus, React.CSSProperties> = {
    Paid: { backgroundColor: '#d1fae5', color: '#065f46' },
    Pending: { backgroundColor: '#fef9c3', color: '#713f12' },
    Overdue: { backgroundColor: '#fee2e2', color: '#991b1b' },
    Partial: { backgroundColor: '#fff7ed', color: '#9a3412' },
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

function formatCurrency(amount: number): string {
  return `${amount.toLocaleString()} QAR`;
}

function resolveError(err: unknown): string {
  const e = err as AxiosError<{ error?: { code?: string; message?: string } }>;
  const code = e.response?.data?.error?.code;
  switch (code) {
    case 'FORBIDDEN':
      return e.response?.data?.error?.message ?? 'Permission denied.';
    case 'NOT_FOUND':
      return e.response?.data?.error?.message ?? 'Tenant not found.';
    case 'VALIDATION_ERROR':
      return e.response?.data?.error?.message ?? 'Validation failed.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
}

// ── Edit form state ───────────────────────────────────────────────────────────

interface EditFormState {
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

function tenantToEditForm(t: ApiTenant): EditFormState {
  const toDateInput = (iso?: string) => (iso ? iso.slice(0, 10) : '');
  return {
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

// ── Component ─────────────────────────────────────────────────────────────────

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [tenant, setTenant] = useState<ApiTenant | null>(null);
  const [property, setProperty] = useState<ApiProperty | null>(null);
  const [masterProperty, setMasterProperty] = useState<ApiProperty | null>(null);
  const [payments, setPayments] = useState<ApiRentPayment[]>([]);
  const [tenantDocuments, setTenantDocuments] = useState<ApiDocument[]>([]);
  const [tenantCheques, setTenantCheques] = useState<ApiTenantCheque[]>([]);
  const [tenantMaintenance, setTenantMaintenance] = useState<ApiMaintenanceRequest[]>([]);
  const [tenantTransactions, setTenantTransactions] = useState<ApiTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);
  const [confirmPayTarget, setConfirmPayTarget] = useState<ApiRentPayment | null>(null);

  // ── Load tenant + payments ───────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError('');

    Promise.all([tenantsApi.get(id), tenantsApi.getRentPayments(id)])
      .then(([t, p]) => {
        setTenant(t);
        setPayments(p);
        // Load property details (best-effort, non-blocking)
        propertiesApi.get(t.propertyId).then((prop) => {
          setProperty(prop);
          if (prop.type === 'unit' && prop.parentPropertyId) {
            propertiesApi.get(prop.parentPropertyId).then(setMasterProperty).catch(() => {});
          }
        }).catch(() => {});
        // Load documents for this tenant (best-effort, non-blocking)
        documentsApi
          .list({ tenantId: id, limit: 5 })
          .then(({ documents }) => setTenantDocuments(documents))
          .catch(() => {});
        // Load cheques for this tenant (best-effort, non-blocking)
        chequesApi
          .listTenant({ tenantId: id, limit: 100 })
          .then(({ cheques }) => setTenantCheques(cheques))
          .catch(() => {});
        // Load maintenance requests for this tenant (best-effort, non-blocking)
        maintenanceApi
          .list({ tenantId: id, limit: 100 })
          .then(({ requests }) => setTenantMaintenance(requests))
          .catch(() => {});
        // Load transactions for this tenant (best-effort, non-blocking)
        transactionsApi
          .list({ tenantId: id, limit: 50 })
          .then(({ transactions }) => setTenantTransactions(transactions))
          .catch(() => {});
      })
      .catch(() => setError('Failed to load tenant. Please go back and try again.'))
      .finally(() => setLoading(false));
  }, [id]);

  // ── Mark payment as paid ─────────────────────────────────────────────────
  async function handleMarkPaid(paymentId: string) {
    setMarkingPaidId(paymentId);
    try {
      const updated = await rentPaymentsApi.update(paymentId, {
        status: 'Paid',
        paidDate: new Date().toISOString(),
      });
      setPayments((prev) => prev.map((p) => (p._id === paymentId ? { ...p, ...updated } : p)));
      setConfirmPayTarget(null);
    } catch {
      // silently ignore — user can retry
    } finally {
      setMarkingPaidId(null);
    }
  }

  // ── Edit modal ───────────────────────────────────────────────────────────
  function openEdit() {
    if (!tenant) return;
    setEditForm(tenantToEditForm(tenant));
    setEditError('');
    setEditOpen(true);
  }

  function closeEdit() {
    setEditOpen(false);
    setEditError('');
  }

  function setEditField(key: keyof EditFormState, value: string) {
    setEditForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !editForm) return;

    setEditError('');
    setSaving(true);

    const strOpt = (v: string) => (v.trim() !== '' ? v.trim() : undefined);
    const numOpt = (v: string) => (v.trim() !== '' ? Number(v) : undefined);
    const dateOpt = (v: string) => (v.trim() !== '' ? new Date(v).toISOString() : undefined);

    try {
      const updated = await tenantsApi.update(id, {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        email: strOpt(editForm.email),
        phone: strOpt(editForm.phone),
        alternatePhone: strOpt(editForm.alternatePhone),
        qatarId: strOpt(editForm.qatarId),
        moveInDate: dateOpt(editForm.moveInDate),
        moveOutDate: dateOpt(editForm.moveOutDate),
        leaseStart: dateOpt(editForm.leaseStart),
        leaseEnd: dateOpt(editForm.leaseEnd),
        monthlyRent: Number(editForm.monthlyRent),
        securityDeposit: numOpt(editForm.securityDeposit),
        status: editForm.status,
        emergencyContact:
          editForm.emergencyName || editForm.emergencyPhone
            ? { name: strOpt(editForm.emergencyName), phone: strOpt(editForm.emergencyPhone) }
            : undefined,
        notes: strOpt(editForm.notes),
      });

      setTenant(updated);
      // Refresh payments in case invoice generation was triggered
      const updatedPayments = await tenantsApi.getRentPayments(id);
      setPayments(updatedPayments);
      closeEdit();
    } catch (err) {
      setEditError(resolveError(err));
    } finally {
      setSaving(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={s.page}>
        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Loading…</p>
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div style={s.page}>
        <button style={s.backBtn} type="button" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <div style={s.errorBanner}>{error || 'Tenant not found.'}</div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      {/* Back */}
      <button style={s.backBtn} type="button" onClick={() => navigate(-1)}>
        ← Back
      </button>

      {/* Header */}
      <div style={s.header}>
        <div style={s.titleGroup}>
          <h1 style={s.title}>
            {tenant.firstName} {tenant.lastName}
          </h1>
          <div style={s.badgeRow}>
            <span style={tenantStatusBadge(tenant.status)}>{tenant.status}</span>
            {isExpiringSoon(tenant.leaseEnd, tenant.status) && (
              <span style={{ ...s.badge, backgroundColor: '#fff7ed', color: '#9a3412' }}>
                Expiring Soon
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
          <Link
            to={`/contracts?create=1&tenantId=${tenant._id}`}
            style={{
              padding: '0.45rem 1rem',
              backgroundColor: '#059669',
              color: '#fff',
              borderRadius: '4px',
              fontSize: '0.875rem',
              fontWeight: 600,
              textDecoration: 'none',
              whiteSpace: 'nowrap' as const,
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            Generate Contract
          </Link>
          <button style={s.editBtn} type="button" onClick={openEdit}>
            Edit
          </button>
        </div>
      </div>

      {/* Property */}
      {property && (
        <div style={s.card}>
          <div style={s.cardTitle}>Property</div>
          <div style={s.grid2}>
            <div>
              <div style={s.fieldLabel}>Property Name</div>
              <div style={s.fieldValue}>
                <Link
                  to={`/properties/${property._id}`}
                  style={{ color: '#4f8ef7', textDecoration: 'none', fontWeight: 600 }}
                >
                  {property.propertyName}
                </Link>
              </div>
            </div>
            {masterProperty && (
              <div>
                <div style={s.fieldLabel}>Master Property</div>
                <div style={s.fieldValue}>
                  <Link
                    to={`/properties/${masterProperty._id}`}
                    style={{ color: '#4f8ef7', textDecoration: 'none', fontWeight: 600 }}
                  >
                    {masterProperty.propertyName}
                  </Link>
                </div>
              </div>
            )}
            <div>
              <div style={s.fieldLabel}>Type</div>
              <div style={{ ...s.fieldValue, textTransform: 'capitalize' }}>
                {property.type}{property.unitName ? ` — Unit ${property.unitName}` : ''}
              </div>
            </div>
            {(property.address || property.city) && (
              <div>
                <div style={s.fieldLabel}>Address</div>
                <div style={s.fieldValue}>
                  {[property.address, property.city, property.state, property.country]
                    .filter(Boolean)
                    .join(', ')}
                </div>
              </div>
            )}
            {property.contactNumber && (
              <div>
                <div style={s.fieldLabel}>Contact Number</div>
                <div style={s.fieldValue}>{property.contactNumber}</div>
              </div>
            )}
            <div>
              <div style={s.fieldLabel}>Property Status</div>
              <div style={s.fieldValue}>{property.status}</div>
            </div>
          </div>
        </div>
      )}

      {/* Contact Details */}
      <div style={s.card}>
        <div style={s.cardTitle}>Contact Details</div>
        <div style={s.grid2}>
          <div>
            <div style={s.fieldLabel}>Email</div>
            <div style={s.fieldValue}>{tenant.email || '—'}</div>
          </div>
          <div>
            <div style={s.fieldLabel}>Phone</div>
            <div style={s.fieldValue}>{tenant.phone || '—'}</div>
          </div>
          <div>
            <div style={s.fieldLabel}>Alternate Phone</div>
            <div style={s.fieldValue}>{tenant.alternatePhone || '—'}</div>
          </div>
          <div>
            <div style={s.fieldLabel}>Qatar ID</div>
            <div style={s.fieldValue}>{tenant.qatarId || '—'}</div>
          </div>
        </div>
      </div>

      {/* Lease Details */}
      <div style={s.card}>
        <div style={s.cardTitle}>Lease Details</div>
        <div style={s.grid2}>
          <div>
            <div style={s.fieldLabel}>Lease Start</div>
            <div style={s.fieldValue}>{formatDate(tenant.leaseStart)}</div>
          </div>
          <div>
            <div style={s.fieldLabel}>Lease End</div>
            <div style={s.fieldValue}>{formatDate(tenant.leaseEnd)}</div>
          </div>
          <div>
            <div style={s.fieldLabel}>Move-in Date</div>
            <div style={s.fieldValue}>{formatDate(tenant.moveInDate)}</div>
          </div>
          <div>
            <div style={s.fieldLabel}>Move-out Date</div>
            <div style={s.fieldValue}>{formatDate(tenant.moveOutDate)}</div>
          </div>
          <div>
            <div style={s.fieldLabel}>Monthly Rent</div>
            <div style={s.fieldValue}>{formatCurrency(tenant.monthlyRent)}</div>
          </div>
          <div>
            <div style={s.fieldLabel}>Security Deposit</div>
            <div style={s.fieldValue}>
              {tenant.securityDeposit !== undefined ? formatCurrency(tenant.securityDeposit) : '—'}
            </div>
          </div>
        </div>
        {tenant.notes && (
          <div style={{ marginTop: '1rem' }}>
            <div style={s.fieldLabel}>Notes</div>
            <div style={{ ...s.fieldValue, whiteSpace: 'pre-wrap' }}>{tenant.notes}</div>
          </div>
        )}
      </div>

      {/* Emergency Contact */}
      {(tenant.emergencyContact?.name || tenant.emergencyContact?.phone) && (
        <div style={s.card}>
          <div style={s.cardTitle}>Emergency Contact</div>
          <div style={s.grid2}>
            <div>
              <div style={s.fieldLabel}>Name</div>
              <div style={s.fieldValue}>{tenant.emergencyContact.name || '—'}</div>
            </div>
            <div>
              <div style={s.fieldLabel}>Phone</div>
              <div style={s.fieldValue}>{tenant.emergencyContact.phone || '—'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Rent Payments */}
      <div style={s.card}>
        <div style={s.cardTitle}>Rent Payments</div>
        {/* Payment Statistics */}
        {(() => {
          const paid = payments.filter((p) => p.status === 'Paid');
          const pending = payments.filter((p) => p.status === 'Pending');
          const overdue = payments.filter((p) => p.status === 'Overdue');
          const sumAmt = (arr: ApiRentPayment[]) => arr.reduce((s, p) => s + p.amount, 0);
          const stats: { label: string; count: number; amount: number; color: string; bg: string }[] = [
            { label: 'Total Payments', count: payments.length, amount: sumAmt(payments), color: '#374151', bg: '#f3f4f6' },
            { label: 'Paid', count: paid.length, amount: sumAmt(paid), color: '#065f46', bg: '#d1fae5' },
            { label: 'Pending', count: pending.length, amount: sumAmt(pending), color: '#713f12', bg: '#fef9c3' },
            { label: 'Overdue', count: overdue.length, amount: sumAmt(overdue), color: '#991b1b', bg: '#fee2e2' },
          ];
          return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
              {stats.map((st) => (
                <div key={st.label} style={{ backgroundColor: st.bg, borderRadius: '6px', padding: '0.75rem 1rem' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 600, color: st.color, textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: '0.3rem' }}>
                    {st.label}
                  </div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700, color: st.color }}>{st.count}</div>
                  <div style={{ fontSize: '0.78rem', color: st.color, opacity: 0.75, marginTop: '0.15rem' }}>{formatCurrency(st.amount)}</div>
                </div>
              ))}
            </div>
          );
        })()}
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Due Date</th>
              <th style={s.th}>Amount</th>
              <th style={s.th}>Status</th>
              <th style={s.th}>Paid Date</th>
              <th style={s.th}>Method</th>
              <th style={s.th}>Action</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ ...s.td, ...s.emptyRow }}>
                  No rent payments yet.
                </td>
              </tr>
            ) : (
              payments.map((p) => (
                <tr key={p._id}>
                  <td style={s.td}>{formatDate(p.dueDate)}</td>
                  <td style={s.td}>{formatCurrency(p.amount)}</td>
                  <td style={s.td}>
                    <span style={rentPaymentBadge(p.status)}>{p.status}</span>
                  </td>
                  <td style={s.td}>{formatDate(p.paidDate)}</td>
                  <td style={{ ...s.td, color: '#6b7280' }}>{p.paymentMethod ?? '—'}</td>
                  <td style={s.td}>
                    {p.status !== 'Paid' && (
                      <button
                        type="button"
                        disabled={markingPaidId === p._id}
                        onClick={() => setConfirmPayTarget(p)}
                        style={{
                          padding: '0.25rem 0.6rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          border: 'none',
                          borderRadius: '4px',
                          cursor: markingPaidId === p._id ? 'not-allowed' : 'pointer',
                          backgroundColor: '#d1fae5',
                          color: '#065f46',
                          opacity: markingPaidId === p._id ? 0.6 : 1,
                          whiteSpace: 'nowrap' as const,
                        }}
                      >
                        {markingPaidId === p._id ? '…' : '✓ Mark Paid'}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Documents */}
      <div style={s.card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <div style={s.cardTitle}>Documents</div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Link
              to={`/documents?tenantId=${tenant._id}`}
              style={{ fontSize: '0.8rem', color: '#4f8ef7', textDecoration: 'none' }}
            >
              View all →
            </Link>
            <Link
              to="/documents"
              state={{ prefill: { tenantId: tenant._id } }}
              style={{
                fontSize: '0.78rem',
                padding: '0.25rem 0.6rem',
                backgroundColor: '#1a1a2e',
                color: '#fff',
                borderRadius: '4px',
                textDecoration: 'none',
              }}
            >
              + Upload
            </Link>
          </div>
        </div>
        {tenantDocuments.length === 0 ? (
          <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>No documents for this tenant.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr>
                {(['Title', 'Type', 'Size', 'Uploaded'] as const).map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: 'left',
                      padding: '0.4rem 0.6rem',
                      backgroundColor: '#f9fafb',
                      borderBottom: '1px solid #e5e7eb',
                      fontWeight: 600,
                      color: '#6b7280',
                      fontSize: '0.72rem',
                      textTransform: 'uppercase',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tenantDocuments.map((doc) => {
                const typeColors: Record<DocumentType, { bg: string; color: string }> = {
                  'Lease Agreement': { bg: '#dbeafe', color: '#1e40af' },
                  Invoice: { bg: '#fef9c3', color: '#713f12' },
                  Receipt: { bg: '#dcfce7', color: '#15803d' },
                  Contract: { bg: '#f3e8ff', color: '#6b21a8' },
                  Other: { bg: '#f3f4f6', color: '#6b7280' },
                };
                const tc = typeColors[doc.documentType];
                return (
                  <tr key={doc._id}>
                    <td style={{ padding: '0.45rem 0.6rem', borderBottom: '1px solid #f3f4f6', fontWeight: 600, color: '#1a1a2e' }}>
                      {doc.title}
                    </td>
                    <td style={{ padding: '0.45rem 0.6rem', borderBottom: '1px solid #f3f4f6' }}>
                      <span style={{ display: 'inline-block', padding: '0.12rem 0.45rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 600, backgroundColor: tc.bg, color: tc.color }}>
                        {doc.documentType}
                      </span>
                    </td>
                    <td style={{ padding: '0.45rem 0.6rem', borderBottom: '1px solid #f3f4f6', color: '#6b7280', fontSize: '0.8rem' }}>
                      {formatFileSize(doc.fileSize)}
                    </td>
                    <td style={{ padding: '0.45rem 0.6rem', borderBottom: '1px solid #f3f4f6', color: '#6b7280', fontSize: '0.8rem' }}>
                      {new Date(doc.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Cheques */}
      <div style={s.card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <div style={s.cardTitle}>Cheques</div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Link
              to={`/cheques?tenantId=${tenant._id}`}
              style={{ fontSize: '0.8rem', color: '#4f8ef7', textDecoration: 'none' }}
            >
              View all →
            </Link>
          </div>
        </div>
        {tenantCheques.length === 0 ? (
          <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>No cheques recorded for this tenant.</p>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Cheque #</th>
                <th style={s.th}>Bank</th>
                <th style={s.th}>Amount</th>
                <th style={s.th}>Cheque Date</th>
                <th style={s.th}>Deposit Date</th>
                <th style={s.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {tenantCheques.map((c) => {
                const statusColors: Record<TenantChequeStatus, { bg: string; color: string }> = {
                  Pending:   { bg: '#fef9c3', color: '#713f12' },
                  Deposited: { bg: '#dbeafe', color: '#1e40af' },
                  Cleared:   { bg: '#d1fae5', color: '#065f46' },
                  Bounced:   { bg: '#fee2e2', color: '#991b1b' },
                };
                const sc = statusColors[c.status];
                return (
                  <tr key={c._id}>
                    <td style={{ ...s.td, fontWeight: 600, fontFamily: 'monospace' }}>{c.chequeNumber}</td>
                    <td style={{ ...s.td, color: '#6b7280' }}>{c.bankName ?? '—'}</td>
                    <td style={{ ...s.td, fontWeight: 600 }}>{formatCurrency(c.chequeAmount)}</td>
                    <td style={s.td}>{formatDate(c.chequeDate)}</td>
                    <td style={{ ...s.td, color: '#6b7280' }}>{formatDate(c.depositDate)}</td>
                    <td style={s.td}>
                      <span style={{ display: 'inline-block', padding: '0.18rem 0.55rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 600, backgroundColor: sc.bg, color: sc.color }}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Maintenance Requests */}
      <div style={s.card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <div style={s.cardTitle}>Maintenance Requests</div>
          <Link
            to={`/maintenance?tenantId=${tenant._id}`}
            style={{ fontSize: '0.8rem', color: '#4f8ef7', textDecoration: 'none' }}
          >
            View all →
          </Link>
        </div>
        {tenantMaintenance.length === 0 ? (
          <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>No maintenance requests for this tenant.</p>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Title</th>
                <th style={s.th}>Priority</th>
                <th style={s.th}>Status</th>
                <th style={s.th}>Cost</th>
                <th style={s.th}>Created</th>
                <th style={s.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tenantMaintenance.map((m) => {
                const priorityColors: Record<MaintenancePriority, { bg: string; color: string }> = {
                  Low:       { bg: '#f3f4f6', color: '#6b7280' },
                  Medium:    { bg: '#fef9c3', color: '#713f12' },
                  High:      { bg: '#fff7ed', color: '#9a3412' },
                  Emergency: { bg: '#fee2e2', color: '#991b1b' },
                };
                const statusColors: Record<MaintenanceStatus, { bg: string; color: string }> = {
                  Pending:      { bg: '#fef9c3', color: '#713f12' },
                  'In Progress':{ bg: '#dbeafe', color: '#1e40af' },
                  Completed:    { bg: '#d1fae5', color: '#065f46' },
                  Cancelled:    { bg: '#f3f4f6', color: '#6b7280' },
                };
                const pc = priorityColors[m.priority];
                const sc = statusColors[m.status];
                return (
                  <tr key={m._id}>
                    <td style={{ ...s.td, fontWeight: 600, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</td>
                    <td style={s.td}>
                      <span style={{ display: 'inline-block', padding: '0.18rem 0.55rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 600, backgroundColor: pc.bg, color: pc.color }}>
                        {m.priority}
                      </span>
                    </td>
                    <td style={s.td}>
                      <span style={{ display: 'inline-block', padding: '0.18rem 0.55rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 600, backgroundColor: sc.bg, color: sc.color }}>
                        {m.status}
                      </span>
                    </td>
                    <td style={{ ...s.td, color: '#6b7280' }}>{m.cost !== undefined ? formatCurrency(m.cost) : '—'}</td>
                    <td style={{ ...s.td, color: '#6b7280' }}>{formatDate(m.createdAt)}</td>
                    <td style={s.td}>
                      <Link
                        to={`/maintenance/${m._id}`}
                        style={{ fontSize: '0.78rem', color: '#4f8ef7', textDecoration: 'none', fontWeight: 600 }}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Transactions */}
      <div style={s.card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <div style={s.cardTitle}>Transactions</div>
          <Link
            to={`/transactions?tenantId=${tenant._id}`}
            style={{ fontSize: '0.8rem', color: '#4f8ef7', textDecoration: 'none' }}
          >
            View all →
          </Link>
        </div>
        {tenantTransactions.length === 0 ? (
          <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>No transactions for this tenant.</p>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Date</th>
                <th style={s.th}>Type</th>
                <th style={s.th}>Category</th>
                <th style={s.th}>Amount</th>
                <th style={s.th}>Description</th>
              </tr>
            </thead>
            <tbody>
              {tenantTransactions.map((tx) => {
                const typeStyle: Record<TransactionType, { bg: string; color: string }> = {
                  Income:  { bg: '#d1fae5', color: '#065f46' },
                  Expense: { bg: '#fee2e2', color: '#991b1b' },
                };
                const ts = typeStyle[tx.type];
                return (
                  <tr key={tx._id}>
                    <td style={{ ...s.td, color: '#6b7280' }}>{formatDate(tx.transactionDate)}</td>
                    <td style={s.td}>
                      <span style={{ display: 'inline-block', padding: '0.18rem 0.55rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 600, backgroundColor: ts.bg, color: ts.color }}>
                        {tx.type}
                      </span>
                    </td>
                    <td style={{ ...s.td, color: '#6b7280' }}>{tx.category}</td>
                    <td style={{ ...s.td, fontWeight: 600, color: tx.type === 'Income' ? '#065f46' : '#991b1b' }}>
                      {tx.type === 'Income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </td>
                    <td style={{ ...s.td, color: '#6b7280', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {tx.description ?? '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Mark as Paid confirm dialog */}
      {confirmPayTarget && (
        <div
          style={s.overlay}
          onClick={(e) =>
            e.target === e.currentTarget && !markingPaidId && setConfirmPayTarget(null)
          }
        >
          <div style={{ ...s.modal, width: '400px', padding: '1.5rem' }}>
            <h2 style={{ ...s.modalTitle, marginBottom: '0.75rem' }}>Confirm Payment</h2>
            <p style={{ fontSize: '0.875rem', color: '#374151', marginBottom: '1rem' }}>
              Are you sure you want to mark this payment as paid?
            </p>

            {/* Payment details summary */}
            <div
              style={{
                backgroundColor: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1rem',
                fontSize: '0.875rem',
              }}
            >
              {(
                [
                  ['Due Date', formatDate(confirmPayTarget.dueDate)],
                  ['Amount', formatCurrency(confirmPayTarget.amount)],
                  ['Current Status', confirmPayTarget.status],
                ] as [string, string][]
              ).map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.3rem 0',
                    borderBottom: label === 'Current Status' ? 'none' : '1px solid #f3f4f6',
                  }}
                >
                  <span style={{ color: '#6b7280' }}>{label}</span>
                  <span style={{ fontWeight: 600, color: '#1f2937' }}>{value}</span>
                </div>
              ))}
            </div>

            <p style={{ fontSize: '0.78rem', color: '#6b7280', marginBottom: '1.25rem' }}>
              Today's date will be recorded as the paid date. This action cannot be undone.
            </p>

            <div style={s.modalActions}>
              <button
                style={s.cancelBtn}
                type="button"
                onClick={() => setConfirmPayTarget(null)}
                disabled={!!markingPaidId}
              >
                Cancel
              </button>
              <button
                style={{
                  ...s.submitBtn,
                  backgroundColor: '#059669',
                  ...(markingPaidId === confirmPayTarget._id ? s.submitBtnDisabled : {}),
                }}
                type="button"
                onClick={() => void handleMarkPaid(confirmPayTarget._id)}
                disabled={markingPaidId === confirmPayTarget._id}
              >
                {markingPaidId === confirmPayTarget._id ? 'Processing…' : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editOpen && editForm && (
        <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && closeEdit()}>
          <div style={s.modal}>
            <h2 style={s.modalTitle}>Edit Tenant</h2>

            {editError && <div style={s.modalError}>{editError}</div>}

            <form onSubmit={(e) => void handleEditSubmit(e)}>
              <div style={s.fieldRow}>
                <div style={s.field}>
                  <label style={s.label} htmlFor="ed-first">
                    First Name *
                  </label>
                  <input
                    id="ed-first"
                    style={s.input}
                    type="text"
                    value={editForm.firstName}
                    onChange={(e) => setEditField('firstName', e.target.value)}
                    disabled={saving}
                    required
                  />
                </div>
                <div style={s.field}>
                  <label style={s.label} htmlFor="ed-last">
                    Last Name *
                  </label>
                  <input
                    id="ed-last"
                    style={s.input}
                    type="text"
                    value={editForm.lastName}
                    onChange={(e) => setEditField('lastName', e.target.value)}
                    disabled={saving}
                    required
                  />
                </div>
              </div>

              <div style={s.fieldRow}>
                <div style={s.field}>
                  <label style={s.label} htmlFor="ed-email">
                    Email
                  </label>
                  <input
                    id="ed-email"
                    style={s.input}
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditField('email', e.target.value)}
                    disabled={saving}
                  />
                </div>
                <div style={s.field}>
                  <label style={s.label} htmlFor="ed-phone">
                    Phone
                  </label>
                  <input
                    id="ed-phone"
                    style={s.input}
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditField('phone', e.target.value)}
                    disabled={saving}
                  />
                </div>
              </div>

              <div style={s.fieldRow}>
                <div style={s.field}>
                  <label style={s.label} htmlFor="ed-altphone">
                    Alternate Phone
                  </label>
                  <input
                    id="ed-altphone"
                    style={s.input}
                    type="text"
                    value={editForm.alternatePhone}
                    onChange={(e) => setEditField('alternatePhone', e.target.value)}
                    disabled={saving}
                  />
                </div>
                <div style={s.field}>
                  <label style={s.label} htmlFor="ed-qid">
                    Qatar ID
                  </label>
                  <input
                    id="ed-qid"
                    style={s.input}
                    type="text"
                    value={editForm.qatarId}
                    onChange={(e) => setEditField('qatarId', e.target.value)}
                    disabled={saving}
                  />
                </div>
              </div>

              <div style={s.sectionTitle}>Lease Details</div>
              <div style={s.fieldRow}>
                <div style={s.field}>
                  <label style={s.label} htmlFor="ed-lstart">
                    Lease Start
                  </label>
                  <input
                    id="ed-lstart"
                    style={s.input}
                    type="date"
                    value={editForm.leaseStart}
                    onChange={(e) => setEditField('leaseStart', e.target.value)}
                    disabled={saving}
                  />
                </div>
                <div style={s.field}>
                  <label style={s.label} htmlFor="ed-lend">
                    Lease End
                  </label>
                  <input
                    id="ed-lend"
                    style={s.input}
                    type="date"
                    value={editForm.leaseEnd}
                    onChange={(e) => setEditField('leaseEnd', e.target.value)}
                    disabled={saving}
                  />
                </div>
              </div>

              <div style={s.fieldRow}>
                <div style={s.field}>
                  <label style={s.label} htmlFor="ed-movein">
                    Move-in Date
                  </label>
                  <input
                    id="ed-movein"
                    style={s.input}
                    type="date"
                    value={editForm.moveInDate}
                    onChange={(e) => setEditField('moveInDate', e.target.value)}
                    disabled={saving}
                  />
                </div>
                <div style={s.field}>
                  <label style={s.label} htmlFor="ed-moveout">
                    Move-out Date
                  </label>
                  <input
                    id="ed-moveout"
                    style={s.input}
                    type="date"
                    value={editForm.moveOutDate}
                    onChange={(e) => setEditField('moveOutDate', e.target.value)}
                    disabled={saving}
                  />
                </div>
              </div>

              <div style={s.sectionTitle}>Financials</div>
              <div style={s.fieldRow}>
                <div style={s.field}>
                  <label style={s.label} htmlFor="ed-rent">
                    Monthly Rent (QAR) *
                  </label>
                  <input
                    id="ed-rent"
                    style={s.input}
                    type="number"
                    min="0"
                    value={editForm.monthlyRent}
                    onChange={(e) => setEditField('monthlyRent', e.target.value)}
                    disabled={saving}
                    required
                  />
                </div>
                <div style={s.field}>
                  <label style={s.label} htmlFor="ed-deposit">
                    Security Deposit (QAR)
                  </label>
                  <input
                    id="ed-deposit"
                    style={s.input}
                    type="number"
                    min="0"
                    value={editForm.securityDeposit}
                    onChange={(e) => setEditField('securityDeposit', e.target.value)}
                    disabled={saving}
                  />
                </div>
              </div>

              <div style={s.field}>
                <label style={s.label} htmlFor="ed-status">
                  Status
                </label>
                <select
                  id="ed-status"
                  style={s.select}
                  value={editForm.status}
                  onChange={(e) => setEditField('status', e.target.value)}
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
                  <label style={s.label} htmlFor="ed-ename">
                    Name
                  </label>
                  <input
                    id="ed-ename"
                    style={s.input}
                    type="text"
                    value={editForm.emergencyName}
                    onChange={(e) => setEditField('emergencyName', e.target.value)}
                    disabled={saving}
                  />
                </div>
                <div style={s.field}>
                  <label style={s.label} htmlFor="ed-ephone">
                    Phone
                  </label>
                  <input
                    id="ed-ephone"
                    style={s.input}
                    type="text"
                    value={editForm.emergencyPhone}
                    onChange={(e) => setEditField('emergencyPhone', e.target.value)}
                    disabled={saving}
                  />
                </div>
              </div>

              <div style={s.field}>
                <label style={s.label} htmlFor="ed-notes">
                  Notes
                </label>
                <textarea
                  id="ed-notes"
                  style={s.textarea}
                  value={editForm.notes}
                  onChange={(e) => setEditField('notes', e.target.value)}
                  disabled={saving}
                />
              </div>

              <div style={s.modalActions}>
                <button style={s.cancelBtn} type="button" onClick={closeEdit} disabled={saving}>
                  Cancel
                </button>
                <button
                  style={{ ...s.submitBtn, ...(saving ? s.submitBtnDisabled : {}) }}
                  type="submit"
                  disabled={saving}
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
