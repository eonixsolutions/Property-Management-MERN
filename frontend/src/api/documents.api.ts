import { apiClient } from './axios';
import type { PaginationMeta } from './users.api';

// ── Types ─────────────────────────────────────────────────────────────────────

export type DocumentType =
  | 'Lease Agreement'
  | 'Invoice'
  | 'Receipt'
  | 'Contract'
  | 'Other';

export const DOCUMENT_TYPES: DocumentType[] = [
  'Lease Agreement',
  'Invoice',
  'Receipt',
  'Contract',
  'Other',
];

export interface ApiDocument {
  _id: string;
  userId: string;
  propertyId?: string;
  tenantId?: string;
  documentType: DocumentType;
  title: string;
  filePath: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListDocumentsParams {
  page?: number;
  limit?: number;
  propertyId?: string;
  tenantId?: string;
  documentType?: DocumentType;
  search?: string;
}

// ── API client ─────────────────────────────────────────────────────────────────

export const documentsApi = {
  async list(
    params?: ListDocumentsParams,
  ): Promise<{ documents: ApiDocument[]; meta: PaginationMeta }> {
    const res = await apiClient.get<{
      success: true;
      data: { documents: ApiDocument[]; meta: PaginationMeta };
    }>('/documents', { params });
    return { documents: res.data.data.documents, meta: res.data.data.meta };
  },

  async get(id: string): Promise<{ document: ApiDocument }> {
    const res = await apiClient.get<{
      success: true;
      data: { document: ApiDocument };
    }>(`/documents/${id}`);
    return res.data.data;
  },

  /**
   * Upload a document using multipart/form-data.
   * `file` is the File object from an <input type="file">.
   */
  async upload(
    file: File,
    meta: { title: string; documentType: DocumentType; propertyId?: string; tenantId?: string },
  ): Promise<{ document: ApiDocument }> {
    const form = new FormData();
    form.append('document', file);
    form.append('title', meta.title);
    form.append('documentType', meta.documentType);
    if (meta.propertyId) form.append('propertyId', meta.propertyId);
    if (meta.tenantId) form.append('tenantId', meta.tenantId);

    const res = await apiClient.post<{
      success: true;
      data: { document: ApiDocument };
    }>('/documents', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
  },

  /** Returns the URL to trigger a file download (GET with auth header). */
  downloadUrl(id: string): string {
    return `/api/documents/${id}/download`;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/documents/${id}`);
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
