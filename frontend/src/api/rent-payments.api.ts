import { apiClient } from './axios';
import type { PaginationMeta } from './users.api';

// ── Types ─────────────────────────────────────────────────────────────────────

export type RentPaymentStatus = 'Pending' | 'Paid' | 'Overdue' | 'Partial';

export type PaymentMethod =
  | 'Cash'
  | 'Cheque'
  | 'Bank Transfer'
  | 'Credit Card'
  | 'Debit Card'
  | 'Online Transfer'
  | 'Other';

export interface ApiRentPayment {
  _id: string;
  tenantId: string;
  propertyId: string;
  amount: number;
  dueDate: string;
  paidDate?: string;
  chequeNumber?: string;
  paymentMethod?: PaymentMethod;
  status: RentPaymentStatus;
  referenceNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListRentPaymentsParams {
  page?: number;
  limit?: number;
  status?: RentPaymentStatus | '';
  propertyId?: string;
  tenantId?: string;
  /** YYYY-MM — filter to a calendar month */
  month?: string;
}

export interface CreateRentPaymentInput {
  tenantId: string;
  propertyId: string;
  amount: number;
  dueDate: string;
  paidDate?: string;
  chequeNumber?: string;
  paymentMethod?: PaymentMethod;
  status?: RentPaymentStatus;
  referenceNumber?: string;
  notes?: string;
}

export type UpdateRentPaymentInput = Partial<Omit<CreateRentPaymentInput, 'tenantId' | 'propertyId'>>;

export interface GenerateInvoicesResult {
  tenantsProcessed: number;
  invoicesGenerated: number;
  message: string;
}

// ── API wrapper ───────────────────────────────────────────────────────────────

export const rentPaymentsApi = {
  /** GET /rent-payments — paginated list with optional filters */
  async list(
    params?: ListRentPaymentsParams,
  ): Promise<{ payments: ApiRentPayment[]; meta: PaginationMeta }> {
    const res = await apiClient.get<{
      success: true;
      data: ApiRentPayment[];
      meta: PaginationMeta;
    }>('/rent-payments', { params });
    return { payments: res.data.data, meta: res.data.meta };
  },

  /** POST /rent-payments — record a payment */
  async create(data: CreateRentPaymentInput): Promise<ApiRentPayment> {
    const res = await apiClient.post<{ success: true; data: { payment: ApiRentPayment } }>(
      '/rent-payments',
      data,
    );
    return res.data.data.payment;
  },

  /** GET /rent-payments/:id */
  async get(id: string): Promise<ApiRentPayment> {
    const res = await apiClient.get<{ success: true; data: { payment: ApiRentPayment } }>(
      `/rent-payments/${id}`,
    );
    return res.data.data.payment;
  },

  /** PUT /rent-payments/:id */
  async update(id: string, data: UpdateRentPaymentInput): Promise<ApiRentPayment> {
    const res = await apiClient.put<{ success: true; data: { payment: ApiRentPayment } }>(
      `/rent-payments/${id}`,
      data,
    );
    return res.data.data.payment;
  },

  /** DELETE /rent-payments/:id */
  async remove(id: string): Promise<void> {
    await apiClient.delete(`/rent-payments/${id}`);
  },

  /** POST /rent-payments/generate — manual trigger (admin only) */
  async generate(): Promise<GenerateInvoicesResult> {
    const res = await apiClient.post<{ success: true; data: GenerateInvoicesResult }>(
      '/rent-payments/generate',
    );
    return res.data.data;
  },
};
