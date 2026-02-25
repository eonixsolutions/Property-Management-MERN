import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type { AxiosError } from 'axios';
import { propertiesApi } from '@api/properties.api';
import type { ApiProperty, ApiPropertyImage, PropertyStatus } from '@api/properties.api';
import { maintenanceApi } from '@api/maintenance.api';
import type { ApiMaintenanceRequest, MaintenancePriority, MaintenanceStatus } from '@api/maintenance.api';
import { documentsApi, formatFileSize } from '@api/documents.api';
import type { ApiDocument, DocumentType } from '@api/documents.api';

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
    textDecoration: 'none' as const,
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
  detailItem: {},
  detailLabel: { fontSize: '0.75rem', color: '#9ca3af', fontWeight: 600, marginBottom: '0.1rem' },
  detailValue: { fontSize: '0.9rem', color: '#111' },
  // Images
  imageGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: '0.75rem',
    marginBottom: '1rem',
  },
  imageWrapper: {
    position: 'relative' as const,
    borderRadius: '6px',
    overflow: 'hidden',
    border: '2px solid transparent',
  },
  imageWrapperPrimary: { borderColor: '#4f8ef7' },
  img: {
    width: '100%',
    height: '120px',
    objectFit: 'cover' as const,
    display: 'block',
  },
  imageOverlay: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    display: 'flex',
    gap: '0.25rem',
    padding: '0.35rem 0.4rem',
    justifyContent: 'flex-end',
  },
  imgBtn: {
    padding: '0.2rem 0.45rem',
    fontSize: '0.7rem',
    borderRadius: '3px',
    cursor: 'pointer',
    border: 'none',
    fontWeight: 600,
  },
  primaryTag: {
    position: 'absolute' as const,
    top: '0.35rem',
    left: '0.35rem',
    backgroundColor: '#4f8ef7',
    color: '#fff',
    fontSize: '0.65rem',
    fontWeight: 700,
    padding: '0.1rem 0.4rem',
    borderRadius: '3px',
  },
  uploadBtn: {
    padding: '0.45rem 0.9rem',
    backgroundColor: '#f9fafb',
    border: '1px dashed #d1d5db',
    borderRadius: '4px',
    fontSize: '0.825rem',
    cursor: 'pointer',
    color: '#374151',
  },
  imageError: {
    color: '#991b1b',
    fontSize: '0.8rem',
    marginTop: '0.5rem',
  },
  // Units table
  unitsTable: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '0.875rem',
  },
  unitsTh: {
    textAlign: 'left' as const,
    padding: '0.5rem 0.75rem',
    fontSize: '0.72rem',
    fontWeight: 600,
    color: '#6b7280',
    borderBottom: '1px solid #e5e7eb',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
  },
  unitsTd: {
    padding: '0.5rem 0.75rem',
    color: '#374151',
    borderBottom: '1px solid #f3f4f6',
  },
  // Placeholder sections
  placeholder: {
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    padding: '1.5rem',
    marginBottom: '1.25rem',
    border: '1px dashed #e5e7eb',
    textAlign: 'center' as const,
  },
  placeholderText: { color: '#9ca3af', fontSize: '0.875rem' },
  errorBanner: {
    backgroundColor: '#fee2e2',
    border: '1px solid #fca5a5',
    color: '#991b1b',
    borderRadius: '4px',
    padding: '0.75rem',
    fontSize: '0.875rem',
  },
} as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function typeBadgeStyle(type: 'master' | 'unit'): React.CSSProperties {
  return {
    ...s.badge,
    ...(type === 'master'
      ? { backgroundColor: '#dbeafe', color: '#1e40af' }
      : { backgroundColor: '#f3f4f6', color: '#374151' }),
  };
}

function statusBadgeStyle(status: PropertyStatus): React.CSSProperties {
  const map: Record<PropertyStatus, React.CSSProperties> = {
    Vacant: { backgroundColor: '#d1fae5', color: '#065f46' },
    Occupied: { backgroundColor: '#fff7ed', color: '#9a3412' },
    'Under Maintenance': { backgroundColor: '#fef9c3', color: '#713f12' },
  };
  return { ...s.badge, ...map[status] };
}

function fmt(val: string | number | undefined, suffix = ''): string {
  if (val === undefined || val === '') return '—';
  return `${val}${suffix}`;
}

function resolveImageError(err: unknown): string {
  const e = err as AxiosError<{ error?: { code?: string; message?: string } }>;
  const code = e.response?.data?.error?.code;
  if (code === 'UPLOAD_ERROR') return e.response?.data?.error?.message ?? 'Upload failed.';
  return 'Failed to process image. Please try again.';
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [property, setProperty] = useState<ApiProperty | null>(null);
  const [units, setUnits] = useState<ApiProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [imageError, setImageError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [maintenanceRequests, setMaintenanceRequests] = useState<ApiMaintenanceRequest[]>([]);
  const [propertyDocuments, setPropertyDocuments] = useState<ApiDocument[]>([]);

  // ── Load property ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    void (async () => {
      setLoading(true);
      setError('');
      try {
        const p = await propertiesApi.get(id);
        setProperty(p);

        // If master, also load its units
        if (p.type === 'master') {
          const { properties: childUnits } = await propertiesApi.list({
            type: 'unit',
            limit: 100,
          } as Parameters<typeof propertiesApi.list>[0]);
          // Filter client-side (API scopes by user; filter by parentPropertyId)
          setUnits(childUnits.filter((u) => u.parentPropertyId === p._id));
        }

        // Load recent maintenance requests for this property
        maintenanceApi
          .list({ propertyId: p._id, limit: 5 })
          .then(({ requests }) => setMaintenanceRequests(requests))
          .catch(() => {});

        // Load recent documents for this property
        documentsApi
          .list({ propertyId: p._id, limit: 5 })
          .then(({ documents }) => setPropertyDocuments(documents))
          .catch(() => {});
      } catch {
        setError('Property not found or you do not have permission to view it.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // ── Image upload ──────────────────────────────────────────────────────
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setImageError('');
    setUploading(true);
    try {
      const updated = await propertiesApi.uploadImage(id, file);
      setProperty(updated);
    } catch (err) {
      setImageError(resolveImageError(err));
    } finally {
      setUploading(false);
      // Reset file input so the same file can be re-selected if needed
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  // ── Delete image ──────────────────────────────────────────────────────
  async function handleDeleteImage(image: ApiPropertyImage) {
    if (!id) return;
    setImageError('');
    try {
      const updated = await propertiesApi.deleteImage(id, image._id);
      setProperty(updated);
    } catch (err) {
      setImageError(resolveImageError(err));
    }
  }

  // ── Set primary image ─────────────────────────────────────────────────
  async function handleSetPrimary(imageId: string) {
    if (!id) return;
    setImageError('');
    try {
      const updated = await propertiesApi.setPrimaryImage(id, imageId);
      setProperty(updated);
    } catch (err) {
      setImageError(resolveImageError(err));
    }
  }

  // ── Render ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={s.page}>
        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Loading…</p>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div style={s.page}>
        <button style={s.backBtn} type="button" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <div style={s.errorBanner}>{error || 'Property not found.'}</div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      {/* Back */}
      <button style={s.backBtn} type="button" onClick={() => navigate(-1)}>
        ← Back to Properties
      </button>

      {/* Header */}
      <div style={s.header}>
        <div style={s.titleGroup}>
          <h1 style={s.title}>{property.propertyName}</h1>
          <div style={s.badgeRow}>
            <span style={typeBadgeStyle(property.type)}>
              {property.type === 'master' ? 'Master' : 'Unit'}
            </span>
            <span style={statusBadgeStyle(property.status)}>{property.status}</span>
            {property.propertyType && (
              <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{property.propertyType}</span>
            )}
          </div>
          {property.type === 'unit' && property.parentPropertyId && (
            <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
              Unit of:{' '}
              <Link
                to={`/properties/${property.parentPropertyId}`}
                style={{ color: '#4f8ef7', textDecoration: 'none' }}
              >
                {property.unitName || 'Master Property'}
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Details card */}
      <div style={s.card}>
        <div style={s.cardTitle}>Property Details</div>
        <div style={s.grid2}>
          <div style={s.detailItem}>
            <div style={s.detailLabel}>Address</div>
            <div style={s.detailValue}>{fmt(property.address)}</div>
          </div>
          <div style={s.detailItem}>
            <div style={s.detailLabel}>City</div>
            <div style={s.detailValue}>{fmt(property.city)}</div>
          </div>
          <div style={s.detailItem}>
            <div style={s.detailLabel}>State</div>
            <div style={s.detailValue}>{fmt(property.state)}</div>
          </div>
          <div style={s.detailItem}>
            <div style={s.detailLabel}>Country</div>
            <div style={s.detailValue}>{fmt(property.country)}</div>
          </div>
          <div style={s.detailItem}>
            <div style={s.detailLabel}>Bedrooms</div>
            <div style={s.detailValue}>{fmt(property.bedrooms)}</div>
          </div>
          <div style={s.detailItem}>
            <div style={s.detailLabel}>Bathrooms</div>
            <div style={s.detailValue}>{fmt(property.bathrooms)}</div>
          </div>
          <div style={s.detailItem}>
            <div style={s.detailLabel}>Square Feet</div>
            <div style={s.detailValue}>{fmt(property.squareFeet, ' sqft')}</div>
          </div>
          <div style={s.detailItem}>
            <div style={s.detailLabel}>Default Rent</div>
            <div style={s.detailValue}>{fmt(property.defaultRent)}</div>
          </div>
          <div style={s.detailItem}>
            <div style={s.detailLabel}>Purchase Price</div>
            <div style={s.detailValue}>{fmt(property.purchasePrice)}</div>
          </div>
          <div style={s.detailItem}>
            <div style={s.detailLabel}>Current Value</div>
            <div style={s.detailValue}>{fmt(property.currentValue)}</div>
          </div>
          <div style={s.detailItem}>
            <div style={s.detailLabel}>Contact Number</div>
            <div style={s.detailValue}>{fmt(property.contactNumber)}</div>
          </div>
          {property.notes && (
            <div style={{ ...s.detailItem, gridColumn: '1 / -1' }}>
              <div style={s.detailLabel}>Notes</div>
              <div style={{ ...s.detailValue, whiteSpace: 'pre-wrap' }}>{property.notes}</div>
            </div>
          )}
        </div>
      </div>

      {/* Owner card */}
      {property.owner && Object.values(property.owner).some(Boolean) && (
        <div style={s.card}>
          <div style={s.cardTitle}>Owner Information</div>
          <div style={s.grid2}>
            {property.owner.name && (
              <div style={s.detailItem}>
                <div style={s.detailLabel}>Name</div>
                <div style={s.detailValue}>{property.owner.name}</div>
              </div>
            )}
            {property.owner.phone && (
              <div style={s.detailItem}>
                <div style={s.detailLabel}>Phone</div>
                <div style={s.detailValue}>{property.owner.phone}</div>
              </div>
            )}
            {property.owner.email && (
              <div style={s.detailItem}>
                <div style={s.detailLabel}>Email</div>
                <div style={s.detailValue}>{property.owner.email}</div>
              </div>
            )}
            {property.owner.monthlyRentAmount !== undefined && (
              <div style={s.detailItem}>
                <div style={s.detailLabel}>Monthly Rent</div>
                <div style={s.detailValue}>{property.owner.monthlyRentAmount}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Images */}
      <div style={s.card}>
        <div style={s.cardTitle}>Images ({property.images.length})</div>

        {property.images.length > 0 && (
          <div style={s.imageGrid}>
            {property.images.map((img) => (
              <div
                key={img._id}
                style={{
                  ...s.imageWrapper,
                  ...(img.isPrimary ? s.imageWrapperPrimary : {}),
                }}
              >
                {img.isPrimary && <div style={s.primaryTag}>Primary</div>}
                <img
                  src={`${import.meta.env.VITE_API_BASE_URL?.replace('/api', '') ?? 'http://localhost:3000'}${img.url}`}
                  alt={img.filename}
                  style={s.img}
                />
                <div style={s.imageOverlay}>
                  {!img.isPrimary && (
                    <button
                      style={{ ...s.imgBtn, backgroundColor: '#4f8ef7', color: '#fff' }}
                      type="button"
                      onClick={() => void handleSetPrimary(img._id)}
                    >
                      Primary
                    </button>
                  )}
                  <button
                    style={{ ...s.imgBtn, backgroundColor: '#dc2626', color: '#fff' }}
                    type="button"
                    onClick={() => void handleDeleteImage(img)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {imageError && <div style={s.imageError}>{imageError}</div>}

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            style={{ display: 'none' }}
            onChange={(e) => void handleFileChange(e)}
          />
          <button
            style={s.uploadBtn}
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? 'Uploading…' : '+ Upload Image'}
          </button>
        </div>
      </div>

      {/* Units — only for master properties */}
      {property.type === 'master' && (
        <div style={s.card}>
          <div style={s.cardTitle}>Units ({units.length})</div>
          {units.length === 0 ? (
            <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
              No units added yet. Add a unit from the{' '}
              <Link to="/properties" style={{ color: '#4f8ef7', textDecoration: 'none' }}>
                Properties page
              </Link>
              .
            </p>
          ) : (
            <table style={s.unitsTable}>
              <thead>
                <tr>
                  <th style={s.unitsTh}>Unit Name</th>
                  <th style={s.unitsTh}>Property Name</th>
                  <th style={s.unitsTh}>Status</th>
                  <th style={s.unitsTh}></th>
                </tr>
              </thead>
              <tbody>
                {units.map((u) => (
                  <tr key={u._id}>
                    <td style={s.unitsTd}>{u.unitName || '—'}</td>
                    <td style={s.unitsTd}>{u.propertyName}</td>
                    <td style={s.unitsTd}>
                      <span style={statusBadgeStyle(u.status)}>{u.status}</span>
                    </td>
                    <td style={s.unitsTd}>
                      <Link
                        to={`/properties/${u._id}`}
                        style={{ color: '#4f8ef7', fontSize: '0.8rem', textDecoration: 'none' }}
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Placeholder sections — future phases */}
      <div style={s.placeholder}>
        <div style={s.placeholderText}>
          <strong>Tenants</strong> — Coming in Phase 3
        </div>
      </div>

      {/* Maintenance Requests — Phase 8 */}
      <div style={s.card}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
          }}
        >
          <div style={s.cardTitle}>Maintenance Requests</div>
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <Link
              to={`/maintenance?propertyId=${property._id}`}
              style={{ fontSize: '0.8rem', color: '#4f8ef7', textDecoration: 'none' }}
            >
              View all →
            </Link>
            <Link
              to={`/maintenance`}
              state={{ prefill: { propertyId: property._id } }}
              style={{
                fontSize: '0.78rem',
                padding: '0.25rem 0.6rem',
                backgroundColor: '#1a1a2e',
                color: '#fff',
                borderRadius: '4px',
                textDecoration: 'none',
              }}
            >
              + New
            </Link>
          </div>
        </div>
        {maintenanceRequests.length === 0 ? (
          <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
            No maintenance requests for this property.
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr>
                {(['Title', 'Priority', 'Status', 'Reported'] as const).map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: 'left',
                      padding: '0.45rem 0.6rem',
                      backgroundColor: '#f9fafb',
                      borderBottom: '1px solid #e5e7eb',
                      fontWeight: 600,
                      color: '#6b7280',
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {maintenanceRequests.map((r) => {
                const priorityColors: Record<MaintenancePriority, { bg: string; color: string }> = {
                  Emergency: { bg: '#fee2e2', color: '#991b1b' },
                  High: { bg: '#ffedd5', color: '#9a3412' },
                  Medium: { bg: '#fef9c3', color: '#713f12' },
                  Low: { bg: '#dbeafe', color: '#1e40af' },
                };
                const statusColors: Record<MaintenanceStatus, { bg: string; color: string }> = {
                  Pending: { bg: '#fef9c3', color: '#713f12' },
                  'In Progress': { bg: '#dbeafe', color: '#1e40af' },
                  Completed: { bg: '#dcfce7', color: '#15803d' },
                  Cancelled: { bg: '#f3f4f6', color: '#6b7280' },
                };
                const pc = priorityColors[r.priority];
                const sc = statusColors[r.status];
                return (
                  <tr key={r._id}>
                    <td style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid #f3f4f6' }}>
                      <Link
                        to={`/maintenance/${r._id}`}
                        style={{ color: '#1a1a2e', fontWeight: 600, textDecoration: 'none' }}
                      >
                        {r.title}
                      </Link>
                    </td>
                    <td style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid #f3f4f6' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '999px',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          backgroundColor: pc.bg,
                          color: pc.color,
                        }}
                      >
                        {r.priority}
                      </span>
                    </td>
                    <td style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid #f3f4f6' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '999px',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          backgroundColor: sc.bg,
                          color: sc.color,
                        }}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid #f3f4f6', color: '#6b7280', fontSize: '0.8rem' }}>
                      {new Date(r.createdAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Documents */}
      <div style={s.card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1a1a2e', margin: 0 }}>Documents</h2>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Link
              to={`/documents?propertyId=${property._id}`}
              style={{ fontSize: '0.8rem', color: '#4f8ef7', textDecoration: 'none' }}
            >
              View all →
            </Link>
            <Link
              to="/documents"
              state={{ prefill: { propertyId: property._id } }}
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
        {propertyDocuments.length === 0 ? (
          <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
            No documents for this property.
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr>
                {(['Title', 'Type', 'Size', 'Uploaded'] as const).map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: 'left',
                      padding: '0.45rem 0.6rem',
                      backgroundColor: '#f9fafb',
                      borderBottom: '1px solid #e5e7eb',
                      fontWeight: 600,
                      color: '#6b7280',
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {propertyDocuments.map((doc) => {
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
                    <td style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid #f3f4f6' }}>
                      <span style={{ fontWeight: 600, color: '#1a1a2e' }}>{doc.title}</span>
                    </td>
                    <td style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid #f3f4f6' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '999px',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          backgroundColor: tc.bg,
                          color: tc.color,
                        }}
                      >
                        {doc.documentType}
                      </span>
                    </td>
                    <td style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid #f3f4f6', color: '#6b7280' }}>
                      {formatFileSize(doc.fileSize)}
                    </td>
                    <td style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid #f3f4f6', color: '#6b7280', fontSize: '0.8rem' }}>
                      {new Date(doc.createdAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
