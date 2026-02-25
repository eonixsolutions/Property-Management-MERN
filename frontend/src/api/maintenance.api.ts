import { apiClient } from './axios';
import type { PaginationMeta } from './users.api';

// ── Types ─────────────────────────────────────────────────────────────────────

export type MaintenancePriority = 'Low' | 'Medium' | 'High' | 'Emergency';
export type MaintenanceStatus = 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';

export interface ApiMaintenanceRequest {
  _id: string;
  userId: string;
  propertyId: string;
  tenantId?: string;
  title: string;
  description?: string;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  cost?: number;
  completedDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListMaintenanceParams {
  page?: number;
  limit?: number;
  propertyId?: string;
  status?: MaintenanceStatus;
  priority?: MaintenancePriority;
  search?: string;
}

export interface CreateMaintenanceInput {
  propertyId: string;
  tenantId?: string;
  title: string;
  description?: string;
  priority?: MaintenancePriority;
  status?: MaintenanceStatus;
  cost?: number;
  completedDate?: string;
  notes?: string;
}

export interface UpdateMaintenanceInput {
  title?: string;
  description?: string | null;
  priority?: MaintenancePriority;
  status?: MaintenanceStatus;
  cost?: number | null;
  completedDate?: string | null;
  notes?: string | null;
}

// ── API client ─────────────────────────────────────────────────────────────────

export const maintenanceApi = {
  async list(
    params?: ListMaintenanceParams,
  ): Promise<{ requests: ApiMaintenanceRequest[]; meta: PaginationMeta }> {
    const res = await apiClient.get<{
      success: true;
      data: ApiMaintenanceRequest[];
      meta: PaginationMeta;
    }>('/maintenance', { params });
    return { requests: res.data.data, meta: res.data.meta };
  },

  async get(id: string): Promise<{ request: ApiMaintenanceRequest }> {
    const res = await apiClient.get<{
      success: true;
      data: { request: ApiMaintenanceRequest };
    }>(`/maintenance/${id}`);
    return res.data.data;
  },

  async create(data: CreateMaintenanceInput): Promise<{ request: ApiMaintenanceRequest }> {
    const res = await apiClient.post<{
      success: true;
      data: { request: ApiMaintenanceRequest };
    }>('/maintenance', data);
    return res.data.data;
  },

  async update(id: string, data: UpdateMaintenanceInput): Promise<{ request: ApiMaintenanceRequest }> {
    const res = await apiClient.put<{
      success: true;
      data: { request: ApiMaintenanceRequest };
    }>(`/maintenance/${id}`, data);
    return res.data.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/maintenance/${id}`);
  },
};
