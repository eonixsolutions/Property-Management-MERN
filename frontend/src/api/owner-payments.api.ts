import { apiClient } from './axios';
import type { PaginationMeta } from './users.api';

// ── Types ──────────────────────────────────────────────────────────────────

export type OwnerPaymentStatus = 'Pending' | 'Paid' | 'Overdue';

export type OwnerPaymentMethod = 'Cash' | 'Cheque' | 'Bank Transfer' | 'Online' | 'Other';

export interface ApiOwnerPayment {
  _id: string;
  propertyId: string;
  userId: string;
  amount: number;
  paymentMonth: string; // ISO date (1st of month)
  paidDate?: string;
  chequeNumber?: string;
  paymentMethod?: OwnerPaymentMethod;
  referenceNumber?: string;
  notes?: string;
  status: OwnerPaymentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface OwnerPaymentDropdownItem {
  _id: string;
  propertyId: string;
  amount: number;
  paymentMonth: string;
  status: OwnerPaymentStatus;
}

export interface ListOwnerPaymentsParams {
  page?: number;
  limit?: number;
  propertyId?: string;
  status?: OwnerPaymentStatus;
  /** YYYY-MM */
  month?: string;
}

export interface CreateOwnerPaymentInput {
  propertyId: string;
  amount: number;
  paymentMonth: string;
  status?: OwnerPaymentStatus;
  paidDate?: string;
  paymentMethod?: OwnerPaymentMethod;
  chequeNumber?: string;
  referenceNumber?: string;
  notes?: string;
}

export interface UpdateOwnerPaymentInput {
  amount?: number;
  paymentMonth?: string;
  status?: OwnerPaymentStatus;
  paidDate?: string | null;
  paymentMethod?: OwnerPaymentMethod | null;
  chequeNumber?: string | null;
  referenceNumber?: string | null;
  notes?: string | null;
}

// ── API client ─────────────────────────────────────────────────────────────

export const ownerPaymentsApi = {
  async list(
    params?: ListOwnerPaymentsParams,
  ): Promise<{ payments: ApiOwnerPayment[]; meta: PaginationMeta }> {
    const res = await apiClient.get<{
      success: true;
      data: { payments: ApiOwnerPayment[]; meta: PaginationMeta };
    }>('/owner-payments', { params });
    return { payments: res.data.data.payments, meta: res.data.data.meta };
  },

  async dropdown(propertyId?: string): Promise<{ payments: OwnerPaymentDropdownItem[] }> {
    const res = await apiClient.get<{
      success: true;
      data: { payments: OwnerPaymentDropdownItem[] };
    }>('/owner-payments/dropdown', { params: propertyId ? { propertyId } : {} });
    return res.data.data;
  },

  async get(id: string): Promise<{ payment: ApiOwnerPayment }> {
    const res = await apiClient.get<{ success: true; data: { payment: ApiOwnerPayment } }>(
      `/owner-payments/${id}`,
    );
    return res.data.data;
  },

  async create(data: CreateOwnerPaymentInput): Promise<{ payment: ApiOwnerPayment }> {
    const res = await apiClient.post<{ success: true; data: { payment: ApiOwnerPayment } }>(
      '/owner-payments',
      data,
    );
    return res.data.data;
  },

  async update(id: string, data: UpdateOwnerPaymentInput): Promise<{ payment: ApiOwnerPayment }> {
    const res = await apiClient.put<{ success: true; data: { payment: ApiOwnerPayment } }>(
      `/owner-payments/${id}`,
      data,
    );
    return res.data.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/owner-payments/${id}`);
  },

  async generate(): Promise<{ message: string; count: number }> {
    const res = await apiClient.post<{
      success: true;
      data: { message: string; count: number };
    }>('/owner-payments/generate');
    return res.data.data;
  },
};
