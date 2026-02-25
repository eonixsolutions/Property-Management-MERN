import { apiClient } from './axios';
import type { PaginationMeta } from './users.api';

// ── Types ─────────────────────────────────────────────────────────────────────

export type TransactionType = 'Income' | 'Expense';
export type RecurringFrequency = 'Monthly' | 'Weekly' | 'Yearly';

export interface ApiTransaction {
  _id: string;
  userId: string;
  propertyId?: string;
  tenantId?: string;
  type: TransactionType;
  category: string;
  amount: number;
  description?: string;
  transactionDate: string;
  paymentMethod?: string;
  referenceNumber?: string;
  isRecurring: boolean;
  recurringFrequency?: RecurringFrequency;
  createdAt: string;
  updatedAt: string;
}

export interface ListTransactionsParams {
  page?: number;
  limit?: number;
  type?: TransactionType | '';
  category?: string;
  propertyId?: string;
  tenantId?: string;
  from?: string;
  to?: string;
  search?: string;
}

export interface CreateTransactionInput {
  propertyId?: string;
  tenantId?: string;
  type: TransactionType;
  category: string;
  amount: number;
  description?: string;
  transactionDate: string;
  paymentMethod?: string;
  referenceNumber?: string;
  isRecurring?: boolean;
  recurringFrequency?: RecurringFrequency;
}

export type UpdateTransactionInput = Partial<Omit<CreateTransactionInput, 'propertyId' | 'tenantId'>>;

/** Suggested categories for the datalist — combined for convenience */
export const INCOME_CATEGORIES = [
  'Rent',
  'Security Deposit',
  'Late Fee',
  'Maintenance Fee',
  'Parking Fee',
  'Other Income',
] as const;

export const EXPENSE_CATEGORIES = [
  'Maintenance',
  'Repairs',
  'Utilities',
  'Insurance',
  'Property Tax',
  'Management Fee',
  'Cleaning',
  'Legal Fees',
  'Other Expense',
] as const;

// ── API wrapper ───────────────────────────────────────────────────────────────

export const transactionsApi = {
  /** GET /transactions — paginated list */
  async list(
    params?: ListTransactionsParams,
  ): Promise<{ transactions: ApiTransaction[]; meta: PaginationMeta }> {
    const res = await apiClient.get<{
      success: true;
      data: ApiTransaction[];
      meta: PaginationMeta;
    }>('/transactions', { params });
    return { transactions: res.data.data, meta: res.data.meta };
  },

  /** POST /transactions — create */
  async create(data: CreateTransactionInput): Promise<ApiTransaction> {
    const res = await apiClient.post<{ success: true; data: { transaction: ApiTransaction } }>(
      '/transactions',
      data,
    );
    return res.data.data.transaction;
  },

  /** GET /transactions/:id */
  async get(id: string): Promise<ApiTransaction> {
    const res = await apiClient.get<{ success: true; data: { transaction: ApiTransaction } }>(
      `/transactions/${id}`,
    );
    return res.data.data.transaction;
  },

  /** PUT /transactions/:id */
  async update(id: string, data: UpdateTransactionInput): Promise<ApiTransaction> {
    const res = await apiClient.put<{ success: true; data: { transaction: ApiTransaction } }>(
      `/transactions/${id}`,
      data,
    );
    return res.data.data.transaction;
  },

  /** DELETE /transactions/:id */
  async remove(id: string): Promise<void> {
    await apiClient.delete(`/transactions/${id}`);
  },
};
