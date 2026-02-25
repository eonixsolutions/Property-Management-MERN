import { apiClient } from './axios';
import type { PaginationMeta } from './users.api';

// ── Types ─────────────────────────────────────────────────────────────────────

export type UtilitiesResponsible = 'Tenant' | 'Landlord' | 'Shared';

export interface ApiContract {
  _id: string;
  userId: string;
  tenantId?: string;
  landlordName?: string;
  landlordAddress?: string;
  landlordPhone?: string;
  landlordEmail?: string;
  tenantName?: string;
  tenantPhone?: string;
  tenantEmail?: string;
  tenantAlternatePhone?: string;
  tenantQatarId?: string;
  propertyName?: string;
  propertyAddress?: string;
  propertyCity?: string;
  propertyState?: string;
  propertyZip?: string;
  propertyType?: string;
  propertyBedrooms?: number;
  propertyBathrooms?: number;
  propertySquareFeet?: number;
  leaseStart?: string;
  leaseEnd?: string;
  monthlyRent?: number;
  securityDeposit?: number;
  lateFee?: string;
  returnPeriod?: string;
  noticePeriod?: string;
  holdoverRate?: string;
  petsAllowed: boolean;
  petDeposit?: number;
  utilitiesResponsible?: UtilitiesResponsible;
  governingLaw?: string;
  termsRent?: string;
  termsSecurity?: string;
  termsUse?: string;
  termsMaintenance?: string;
  termsUtilities?: string;
  termsQuiet?: string;
  termsAccess?: string;
  termsPets?: string;
  termsInsurance?: string;
  termsDefault?: string;
  termsTermination?: string;
  termsHoldover?: string;
  termsGoverning?: string;
  termsEntire?: string;
  termsSeverability?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  agreementDate?: string;
  createdAt: string;
  updatedAt: string;
}

export type ContractFormData = Omit<ApiContract, '_id' | 'userId' | 'createdAt' | 'updatedAt'>;

export interface ContractDefaults {
  landlordName?: string;
  landlordEmail?: string;
  landlordPhone?: string;
  governingLaw?: string;
  utilitiesResponsible?: UtilitiesResponsible;
  petsAllowed?: boolean;
  tenantId?: string;
  tenantName?: string;
  tenantPhone?: string;
  tenantEmail?: string;
  tenantAlternatePhone?: string;
  tenantQatarId?: string;
  leaseStart?: string;
  leaseEnd?: string;
  monthlyRent?: number;
  securityDeposit?: number;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  propertyName?: string;
  propertyAddress?: string;
  propertyCity?: string;
  propertyState?: string;
  propertyZip?: string;
  propertyType?: string;
  propertyBedrooms?: number;
  propertyBathrooms?: number;
  propertySquareFeet?: number;
}

// ── API wrapper ───────────────────────────────────────────────────────────────

export const contractsApi = {
  /** GET /contracts — paginated list */
  async list(params?: {
    page?: number;
    limit?: number;
  }): Promise<{ contracts: ApiContract[]; meta: PaginationMeta }> {
    const res = await apiClient.get<{
      success: true;
      data: ApiContract[];
      meta: PaginationMeta;
    }>('/contracts', { params });
    return { contracts: res.data.data, meta: res.data.meta };
  },

  /** GET /contracts/defaults?tenantId=X */
  async getDefaults(tenantId?: string): Promise<ContractDefaults> {
    const res = await apiClient.get<{ success: true; data: { defaults: ContractDefaults } }>(
      '/contracts/defaults',
      { params: tenantId ? { tenantId } : undefined },
    );
    return res.data.data.defaults;
  },

  /** POST /contracts */
  async create(data: ContractFormData): Promise<ApiContract> {
    const res = await apiClient.post<{ success: true; data: { contract: ApiContract } }>(
      '/contracts',
      data,
    );
    return res.data.data.contract;
  },

  /** GET /contracts/:id */
  async get(id: string): Promise<ApiContract> {
    const res = await apiClient.get<{ success: true; data: { contract: ApiContract } }>(
      `/contracts/${id}`,
    );
    return res.data.data.contract;
  },

  /** PUT /contracts/:id */
  async update(id: string, data: ContractFormData): Promise<ApiContract> {
    const res = await apiClient.put<{ success: true; data: { contract: ApiContract } }>(
      `/contracts/${id}`,
      data,
    );
    return res.data.data.contract;
  },

  /** DELETE /contracts/:id */
  async remove(id: string): Promise<void> {
    await apiClient.delete(`/contracts/${id}`);
  },
};
