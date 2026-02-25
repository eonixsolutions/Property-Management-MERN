import { apiClient } from './axios';
import type { PaginationMeta } from './users.api';

// ── Tenant Cheque ──────────────────────────────────────────────────────────

export type TenantChequeStatus = 'Pending' | 'Deposited' | 'Bounced' | 'Cleared';

export interface ApiTenantCheque {
  _id: string;
  userId: string;
  tenantId: string;
  propertyId: string;
  rentPaymentId?: string;
  chequeNumber: string;
  bankName?: string;
  chequeAmount: number;
  chequeDate: string;
  depositDate?: string;
  status: TenantChequeStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListTenantChequesParams {
  page?: number;
  limit?: number;
  propertyId?: string;
  tenantId?: string;
  status?: TenantChequeStatus;
  search?: string;
}

export interface CreateTenantChequeInput {
  tenantId: string;
  propertyId: string;
  rentPaymentId?: string;
  chequeNumber: string;
  bankName?: string;
  chequeAmount: number;
  chequeDate: string;
  depositDate?: string;
  status?: TenantChequeStatus;
  notes?: string;
}

export interface UpdateTenantChequeStatusInput {
  status: TenantChequeStatus;
  depositDate?: string;
  notes?: string | null;
}

// ── Owner Cheque ───────────────────────────────────────────────────────────

export type OwnerChequeStatus = 'Issued' | 'Cleared' | 'Bounced' | 'Cancelled';

export interface ApiOwnerCheque {
  _id: string;
  userId: string;
  propertyId: string;
  ownerPaymentId?: string;
  chequeNumber: string;
  bankName?: string;
  chequeAmount: number;
  chequeDate: string;
  issueDate?: string;
  status: OwnerChequeStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListOwnerChequesParams {
  page?: number;
  limit?: number;
  propertyId?: string;
  status?: OwnerChequeStatus;
  search?: string;
  upcoming?: boolean;
}

export interface CreateOwnerChequeInput {
  propertyId: string;
  ownerPaymentId?: string;
  chequeNumber: string;
  bankName?: string;
  chequeAmount: number;
  chequeDate: string;
  issueDate?: string;
  status?: OwnerChequeStatus;
  notes?: string;
}

export interface UpdateOwnerChequeStatusInput {
  status: OwnerChequeStatus;
  notes?: string | null;
}

export type ChequeBulkMode = 'manual' | 'copy_from';
export type ChequeBulkFrequency = 'Monthly' | 'Weekly';

export interface CreateOwnerChequesBulkInput {
  propertyId: string;
  chequeAmount: number;
  bankName?: string;
  chequeMode: ChequeBulkMode;
  startingChequeNumber?: string;
  sourceChequeId?: string;
  startDate: string;
  numCheques: number;
  frequency: ChequeBulkFrequency;
  notes?: string;
}

// ── API client ─────────────────────────────────────────────────────────────

export const chequesApi = {
  // ── Tenant cheques ──────────────────────────────────────────────────────

  async listTenant(
    params?: ListTenantChequesParams,
  ): Promise<{ cheques: ApiTenantCheque[]; meta: PaginationMeta }> {
    const res = await apiClient.get<{
      success: true;
      data: { cheques: ApiTenantCheque[]; meta: PaginationMeta };
    }>('/cheques/tenant', { params });
    return { cheques: res.data.data.cheques, meta: res.data.data.meta };
  },

  async createTenant(data: CreateTenantChequeInput): Promise<{ cheque: ApiTenantCheque }> {
    const res = await apiClient.post<{ success: true; data: { cheque: ApiTenantCheque } }>(
      '/cheques/tenant',
      data,
    );
    return res.data.data;
  },

  async updateTenantStatus(
    id: string,
    data: UpdateTenantChequeStatusInput,
  ): Promise<{ cheque: ApiTenantCheque }> {
    const res = await apiClient.patch<{ success: true; data: { cheque: ApiTenantCheque } }>(
      `/cheques/tenant/${id}/status`,
      data,
    );
    return res.data.data;
  },

  async removeTenant(id: string): Promise<void> {
    await apiClient.delete(`/cheques/tenant/${id}`);
  },

  // ── Owner cheques ───────────────────────────────────────────────────────

  async listOwner(
    params?: ListOwnerChequesParams,
  ): Promise<{ cheques: ApiOwnerCheque[]; meta: PaginationMeta }> {
    const res = await apiClient.get<{
      success: true;
      data: { cheques: ApiOwnerCheque[]; meta: PaginationMeta };
    }>('/cheques/owner', { params });
    return { cheques: res.data.data.cheques, meta: res.data.data.meta };
  },

  async createOwner(data: CreateOwnerChequeInput): Promise<{ cheque: ApiOwnerCheque }> {
    const res = await apiClient.post<{ success: true; data: { cheque: ApiOwnerCheque } }>(
      '/cheques/owner',
      data,
    );
    return res.data.data;
  },

  async createOwnerBulk(data: CreateOwnerChequesBulkInput): Promise<{
    cheques: ApiOwnerCheque[];
    message: string;
    count: number;
  }> {
    const res = await apiClient.post<{
      success: true;
      data: { cheques: ApiOwnerCheque[]; message: string; count: number };
    }>('/cheques/owner/bulk', data);
    return res.data.data;
  },

  async updateOwnerStatus(
    id: string,
    data: UpdateOwnerChequeStatusInput,
  ): Promise<{ cheque: ApiOwnerCheque }> {
    const res = await apiClient.patch<{ success: true; data: { cheque: ApiOwnerCheque } }>(
      `/cheques/owner/${id}/status`,
      data,
    );
    return res.data.data;
  },

  async removeOwner(id: string): Promise<void> {
    await apiClient.delete(`/cheques/owner/${id}`);
  },
};
