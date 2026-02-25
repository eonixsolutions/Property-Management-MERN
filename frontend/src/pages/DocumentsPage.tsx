import { useState, useEffect, useCallback, useRef } from 'react';
import type { AxiosError } from 'axios';
import { apiClient } from '@api/axios';
import { documentsApi, DOCUMENT_TYPES, formatFileSize } from '@api/documents.api';
import type { ApiDocument, DocumentType, ListDocumentsParams } from '@api/documents.api';
import type { PaginationMeta } from '@api/users.api';
import { propertiesApi } from '@api/properties.api';
import type { DropdownItem } from '@api/properties.api';
import { tenantsApi } from '@api/tenants.api';
import type { TenantDropdownItem } from '@api/tenants.api';

// ── Styles ─────────────────────────────────────────────────────────────────

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
  uploadBtn: {
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
  searchInput: {
    padding: '0.45rem 0.65rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '0.875rem',
    minWidth: '200px',
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
    letterSpacing: '0.04em',
  },
  td: { padding: '0.75rem 1rem', borderBottom: '1px solid #f3f4f6', fontSize: '0.875rem' },
  emptyRow: { textAlign: 'center' as const, color: '#9ca3af', padding: '2rem' },
  badge: {
    display: 'inline-block',
    padding: '0.15rem 0.55rem',
    borderRadius: '999px',
    fontSize: '0.72rem',
    fontWeight: 600,
  },
  pagination: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: '1.25rem',
    fontSize: '0.875rem',
  },
  pageBtn: {
    padding: '0.35rem 0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    fontSize: '0.8rem',
  },
  actionBtn: {
    padding: '0.25rem 0.55rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    fontSize: '0.78rem',
    color: '#374151',
  },
  dangerBtn: {
    padding: '0.25rem 0.55rem',
    border: '1px solid #fca5a5',
    borderRadius: '4px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    fontSize: '0.78rem',
    color: '#991b1b',
  },
  // Modal
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '1rem',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '1.5rem',
    width: '100%',
    maxWidth: '520px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
    maxHeight: '90vh',
    overflowY: 'auto' as const,
  },
  modalTitle: { fontSize: '1.1rem', fontWeight: 700, color: '#1a1a2e', marginBottom: '1.25rem' },
  field: { marginBottom: '1rem' },
  label: { display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' },
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
  fileInput: {
    display: 'block',
    width: '100%',
    padding: '0.5rem',
    border: '1px dashed #d1d5db',
    borderRadius: '4px',
    fontSize: '0.875rem',
    cursor: 'pointer',
    boxSizing: 'border-box' as const,
  },
  fileHint: { fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.3rem' },
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
  modalError: {
    backgroundColor: '#fee2e2',
    border: '1px solid #fca5a5',
    color: '#991b1b',
    borderRadius: '4px',
    padding: '0.5rem 0.65rem',
    fontSize: '0.8rem',
    marginBottom: '0.875rem',
  },
  // Delete dialog
  confirmOverlay: {
    position: 'fixed' as const,
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1100,
    padding: '1rem',
  },
  confirmBox: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '1.5rem',
    width: '100%',
    maxWidth: '380px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
  },
  confirmTitle: { fontWeight: 700, marginBottom: '0.5rem', color: '#1a1a2e' },
  confirmText: { fontSize: '0.875rem', color: '#374151', marginBottom: '1.25rem' },
  confirmActions: { display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' },
  deleteBtn: {
    padding: '0.5rem 1rem',
    backgroundColor: '#ef4444',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
} as const;

// ── Helpers ───────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<DocumentType, { bg: string; color: string }> = {
  'Lease Agreement': { bg: '#dbeafe', color: '#1e40af' },
  Invoice: { bg: '#fef9c3', color: '#713f12' },
  Receipt: { bg: '#dcfce7', color: '#15803d' },
  Contract: { bg: '#f3e8ff', color: '#6b21a8' },
  Other: { bg: '#f3f4f6', color: '#6b7280' },
};

function TypeBadge({ type }: { type: DocumentType }) {
  const c = TYPE_COLORS[type];
  return (
    <span style={{ ...s.badge, backgroundColor: c.bg, color: c.color }}>{type}</span>
  );
}

function resolveError(err: unknown): string {
  const e = err as AxiosError<{ error?: { code?: string; message?: string } }>;
  const code = e.response?.data?.error?.code;
  switch (code) {
    case 'UPLOAD_ERROR': return e.response?.data?.error?.message ?? 'Upload failed.';
    case 'VALIDATION_ERROR': return e.response?.data?.error?.message ?? 'Validation failed.';
    case 'NOT_FOUND': return 'Document not found.';
    case 'FORBIDDEN': return 'You do not have permission.';
    default: return 'An unexpected error occurred.';
  }
}

async function downloadFile(id: string, originalName: string) {
  const res = await apiClient.get<Blob>(`/documents/${id}/download`, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = originalName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Upload form state ─────────────────────────────────────────────────────

interface UploadForm {
  title: string;
  documentType: DocumentType;
  propertyId: string;
  tenantId: string;
}

const emptyForm = (): UploadForm => ({
  title: '',
  documentType: 'Other',
  propertyId: '',
  tenantId: '',
});

// ── Component ─────────────────────────────────────────────────────────────

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<ApiDocument[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  const [filterType, setFilterType] = useState<DocumentType | ''>('');
  const [filterProperty, setFilterProperty] = useState('');
  const [filterTenant, setFilterTenant] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [propertyOptions, setPropertyOptions] = useState<DropdownItem[]>([]);
  const [tenantOptions, setTenantOptions] = useState<TenantDropdownItem[]>([]);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [form, setForm] = useState<UploadForm>(emptyForm());
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [deleteTarget, setDeleteTarget] = useState<ApiDocument | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to page 1 on filter change
  useEffect(() => { setPage(1); }, [filterType, filterProperty, filterTenant, debouncedSearch]);

  // Load dropdowns once
  useEffect(() => {
    propertiesApi.dropdown().then(setPropertyOptions).catch(() => setPropertyOptions([]));
    tenantsApi.dropdown().then(setTenantOptions).catch(() => setTenantOptions([]));
  }, []);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: ListDocumentsParams = { page, limit: 20 };
      if (filterType) params.documentType = filterType;
      if (filterProperty) params.propertyId = filterProperty;
      if (filterTenant) params.tenantId = filterTenant;
      if (debouncedSearch) params.search = debouncedSearch;
      const { documents: docs, meta: m } = await documentsApi.list(params);
      setDocuments(docs);
      setMeta(m);
    } catch {
      setError('Failed to load documents.');
    } finally {
      setLoading(false);
    }
  }, [page, filterType, filterProperty, filterTenant, debouncedSearch]);

  useEffect(() => { void loadDocuments(); }, [loadDocuments]);

  function openUpload() {
    setForm(emptyForm());
    setSelectedFile(null);
    setUploadError('');
    setUploadOpen(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function closeUpload() { setUploadOpen(false); setUploadError(''); }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile) { setUploadError('Please select a file.'); return; }
    if (!form.title.trim()) { setUploadError('Title is required.'); return; }
    setUploadError('');
    setUploading(true);
    try {
      await documentsApi.upload(selectedFile, {
        title: form.title.trim(),
        documentType: form.documentType,
        propertyId: form.propertyId || undefined,
        tenantId: form.tenantId || undefined,
      });
      closeUpload();
      void loadDocuments();
    } catch (err) {
      setUploadError(resolveError(err));
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(doc: ApiDocument) {
    setDownloadingId(doc._id);
    try {
      await downloadFile(doc._id, doc.originalName);
    } catch {
      // silently fail — browser may show its own error
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await documentsApi.remove(deleteTarget._id);
      setDeleteTarget(null);
      void loadDocuments();
    } catch {
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  function propertyLabel(id: string): string {
    return propertyOptions.find((p) => p._id === id)?.label ?? id.slice(-6);
  }

  function tenantLabel(id: string): string {
    const t = tenantOptions.find((t) => t._id === id);
    return t ? `${t.firstName} ${t.lastName}` : id.slice(-6);
  }

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <h1 style={s.title}>Documents</h1>
        <button style={s.uploadBtn} type="button" onClick={openUpload}>
          + Upload Document
        </button>
      </div>

      {/* Filter bar */}
      <div style={s.filterBar}>
        <select
          style={s.filterSelect}
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as DocumentType | '')}
        >
          <option value="">All Types</option>
          {DOCUMENT_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <select
          style={s.filterSelect}
          value={filterProperty}
          onChange={(e) => setFilterProperty(e.target.value)}
        >
          <option value="">All Properties</option>
          {propertyOptions.map((p) => (
            <option key={p._id} value={p._id}>{p.label}</option>
          ))}
        </select>

        <select
          style={s.filterSelect}
          value={filterTenant}
          onChange={(e) => setFilterTenant(e.target.value)}
        >
          <option value="">All Tenants</option>
          {tenantOptions.map((t) => (
            <option key={t._id} value={t._id}>{t.firstName} {t.lastName}</option>
          ))}
        </select>

        <input
          style={s.searchInput}
          type="text"
          placeholder="Search by title…"
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
        <table style={s.table}>
          <thead>
            <tr>
              {(['Title', 'Type', 'Property', 'Tenant', 'Size', 'Uploaded', 'Actions'] as const).map((h) => (
                <th key={h} style={s.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {documents.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ ...s.td, ...s.emptyRow }}>No documents found.</td>
              </tr>
            ) : (
              documents.map((doc) => (
                <tr key={doc._id}>
                  <td style={s.td}>
                    <span style={{ fontWeight: 600, color: '#1a1a2e' }}>{doc.title}</span>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.15rem' }}>
                      {doc.originalName}
                    </div>
                  </td>
                  <td style={s.td}>
                    <TypeBadge type={doc.documentType} />
                  </td>
                  <td style={{ ...s.td, color: '#6b7280' }}>
                    {doc.propertyId ? propertyLabel(doc.propertyId) : '—'}
                  </td>
                  <td style={{ ...s.td, color: '#6b7280' }}>
                    {doc.tenantId ? tenantLabel(doc.tenantId) : '—'}
                  </td>
                  <td style={{ ...s.td, color: '#6b7280' }}>
                    {formatFileSize(doc.fileSize)}
                  </td>
                  <td style={{ ...s.td, color: '#6b7280' }}>
                    {new Date(doc.createdAt).toLocaleDateString('en-GB', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })}
                  </td>
                  <td style={s.td}>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button
                        style={s.actionBtn}
                        type="button"
                        disabled={downloadingId === doc._id}
                        onClick={() => void handleDownload(doc)}
                      >
                        {downloadingId === doc._id ? '…' : '↓ Download'}
                      </button>
                      <button
                        style={s.dangerBtn}
                        type="button"
                        onClick={() => setDeleteTarget(doc)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div style={s.pagination}>
          <button
            style={s.pageBtn}
            type="button"
            disabled={!meta.hasPrevPage}
            onClick={() => setPage((p) => p - 1)}
          >
            ← Prev
          </button>
          <span style={{ color: '#6b7280' }}>
            Page {meta.page} of {meta.totalPages}
          </span>
          <button
            style={s.pageBtn}
            type="button"
            disabled={!meta.hasNextPage}
            onClick={() => setPage((p) => p + 1)}
          >
            Next →
          </button>
        </div>
      )}

      {/* Upload modal */}
      {uploadOpen && (
        <div
          style={s.overlay}
          onClick={(e) => { if (e.target === e.currentTarget) closeUpload(); }}
        >
          <div style={s.modal}>
            <h2 style={s.modalTitle}>Upload Document</h2>

            {uploadError && <div style={s.modalError}>{uploadError}</div>}

            <form onSubmit={(e) => void handleUpload(e)}>
              {/* File picker */}
              <div style={s.field}>
                <label style={s.label}>File *</label>
                <input
                  ref={fileInputRef}
                  style={s.fileInput}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                  disabled={uploading}
                />
                <p style={s.fileHint}>
                  Allowed: PDF, Word, Excel, JPEG, PNG, TXT · Max 10 MB
                </p>
              </div>

              {/* Title */}
              <div style={s.field}>
                <label style={s.label} htmlFor="doc-title">Title *</label>
                <input
                  id="doc-title"
                  style={s.input}
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  disabled={uploading}
                  maxLength={255}
                  placeholder="e.g. Lease Agreement 2024"
                />
              </div>

              {/* Document type */}
              <div style={s.field}>
                <label style={s.label} htmlFor="doc-type">Document Type *</label>
                <select
                  id="doc-type"
                  style={s.select}
                  value={form.documentType}
                  onChange={(e) => setForm((f) => ({ ...f, documentType: e.target.value as DocumentType }))}
                  disabled={uploading}
                >
                  {DOCUMENT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Property */}
              <div style={s.field}>
                <label style={s.label} htmlFor="doc-property">Property (optional)</label>
                <select
                  id="doc-property"
                  style={s.select}
                  value={form.propertyId}
                  onChange={(e) => setForm((f) => ({ ...f, propertyId: e.target.value, tenantId: '' }))}
                  disabled={uploading}
                >
                  <option value="">— None —</option>
                  {propertyOptions.map((p) => (
                    <option key={p._id} value={p._id}>{p.label}</option>
                  ))}
                </select>
              </div>

              {/* Tenant */}
              <div style={s.field}>
                <label style={s.label} htmlFor="doc-tenant">Tenant (optional)</label>
                <select
                  id="doc-tenant"
                  style={s.select}
                  value={form.tenantId}
                  onChange={(e) => setForm((f) => ({ ...f, tenantId: e.target.value }))}
                  disabled={uploading}
                >
                  <option value="">— None —</option>
                  {(form.propertyId
                    ? tenantOptions.filter((t) => t.propertyId === form.propertyId)
                    : tenantOptions
                  ).map((t) => (
                    <option key={t._id} value={t._id}>{t.firstName} {t.lastName}</option>
                  ))}
                </select>
              </div>

              <div style={s.modalActions}>
                <button
                  style={s.cancelBtn}
                  type="button"
                  onClick={closeUpload}
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button style={s.submitBtn} type="submit" disabled={uploading}>
                  {uploading ? 'Uploading…' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div style={s.confirmOverlay}>
          <div style={s.confirmBox}>
            <p style={s.confirmTitle}>Delete document?</p>
            <p style={s.confirmText}>
              "<strong>{deleteTarget.title}</strong>" will be permanently deleted along with its
              file. This cannot be undone.
            </p>
            <div style={s.confirmActions}>
              <button
                style={s.cancelBtn}
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button
                style={s.deleteBtn}
                type="button"
                disabled={deleting}
                onClick={() => void handleDelete()}
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
