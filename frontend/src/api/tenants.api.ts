import { apiClient } from './axios';
import type { PaginationMeta } from './users.api';

// ── Types ─────────────────────────────────────────────────────────────────────

export type TenantStatus = 'Active' | 'Past' | 'Pending';
export type RentPaymentStatus = 'Pending' | 'Paid' | 'Overdue' | 'Partial';

export interface ApiEmergencyContact {
  name?: string;
  phone?: string;
}

export interface ApiTenant {
  _id: string;
  propertyId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  alternatePhone?: string;
  qatarId?: string;
  moveInDate?: string;
  moveOutDate?: string;
  leaseStart?: string;
  leaseEnd?: string;
  monthlyRent: number;
  securityDeposit?: number;
  status: TenantStatus;
  emergencyContact?: ApiEmergencyContact;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiRentPayment {
  _id: string;
  tenantId: string;
  propertyId: string;
  amount: number;
  dueDate: string;
  paidDate?: string;
  chequeNumber?: string;
  paymentMethod?: string;
  status: RentPaymentStatus;
  referenceNumber?: string;
  notes?: string;
  createdAt: string;
}

export interface TenantDropdownItem {
  _id: string;
  firstName: string;
  lastName: string;
  status: TenantStatus;
  propertyId: string;
}

export interface ListTenantsParams {
  page?: number;
  limit?: number;
  status?: TenantStatus | '';
  propertyId?: string;
  search?: string;
}

export interface CreateTenantInput {
  propertyId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  alternatePhone?: string;
  qatarId?: string;
  moveInDate?: string;
  moveOutDate?: string;
  leaseStart?: string;
  leaseEnd?: string;
  monthlyRent: number;
  securityDeposit?: number;
  status?: TenantStatus;
  emergencyContact?: ApiEmergencyContact;
  notes?: string;
}

export type UpdateTenantInput = Partial<Omit<CreateTenantInput, 'propertyId'>>;

// ── API wrapper ───────────────────────────────────────────────────────────────

export const tenantsApi = {
  /** GET /tenants — paginated list */
  async list(params?: ListTenantsParams): Promise<{ tenants: ApiTenant[]; meta: PaginationMeta }> {
    const res = await apiClient.get<{
      success: true;
      data: ApiTenant[];
      meta: PaginationMeta;
    }>('/tenants', { params });
    return { tenants: res.data.data, meta: res.data.meta };
  },

  /** POST /tenants — create */
  async create(data: CreateTenantInput): Promise<ApiTenant> {
    const res = await apiClient.post<{ success: true; data: { tenant: ApiTenant } }>('/tenants', data);
    return res.data.data.tenant;
  },

  /** GET /tenants/:id */
  async get(id: string): Promise<ApiTenant> {
    const res = await apiClient.get<{ success: true; data: { tenant: ApiTenant } }>(`/tenants/${id}`);
    return res.data.data.tenant;
  },

  /** PUT /tenants/:id */
  async update(id: string, data: UpdateTenantInput): Promise<ApiTenant> {
    const res = await apiClient.put<{ success: true; data: { tenant: ApiTenant } }>(`/tenants/${id}`, data);
    return res.data.data.tenant;
  },

  /** DELETE /tenants/:id */
  async remove(id: string): Promise<void> {
    await apiClient.delete(`/tenants/${id}`);
  },

  /** GET /tenants/dropdown */
  async dropdown(params?: { propertyId?: string; status?: TenantStatus }): Promise<TenantDropdownItem[]> {
    const res = await apiClient.get<{ success: true; data: { items: TenantDropdownItem[] } }>(
      '/tenants/dropdown',
      { params },
    );
    return res.data.data.items;
  },

  /** GET /tenants/:id/rent-payments */
  async getRentPayments(id: string): Promise<ApiRentPayment[]> {
    const res = await apiClient.get<{ success: true; data: { payments: ApiRentPayment[] } }>(
      `/tenants/${id}/rent-payments`,
    );
    return res.data.data.payments;
  },
};
