import { apiClient } from './axios';
import type { UserRole } from './auth.types';

// ── Types ─────────────────────────────────────────────────────────────────────

export type UserStatus = 'ACTIVE' | 'SUSPENDED';

export interface ApiUser {
  _id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  phone?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserStats {
  total: number;
  active: number;
  suspended: number;
}

export interface UserProfileStats {
  propertiesCount: number;
  tenantsCount: number;
  transactionsCount: number;
  incomeTotal: number;
  expenseTotal: number;
}

export interface UserProfileProperty {
  _id: string;
  propertyName: string;
  address?: string;
  city?: string;
  propertyType: string;
  status: string;
  createdAt: string;
}

export interface UserProfileTransaction {
  _id: string;
  transactionDate: string;
  type: 'Income' | 'Expense';
  category: string;
  amount: number;
  description?: string;
}

export interface UserProfile {
  user: ApiUser;
  stats: UserProfileStats;
  recentProperties: UserProfileProperty[];
  recentTransactions: UserProfileTransaction[];
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface CreateUserInput {
  email: string;
  password: string;
  role?: UserRole;
  status?: UserStatus;
  phone?: string;
  firstName: string;
  lastName: string;
}

export interface UpdateUserInput {
  email?: string;
  password?: string;
  role?: UserRole;
  status?: UserStatus;
  phone?: string | null; // null clears the field
  firstName?: string;
  lastName?: string;
}

export interface ListUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole | '';
  status?: UserStatus | '';
}

// ── API wrappers ──────────────────────────────────────────────────────────────

export const usersApi = {
  /**
   * GET /users?page=&limit=&search=&role=&status=
   * Returns paginated, filtered list of all users.
   */
  async list(params: ListUsersParams = {}): Promise<{ users: ApiUser[]; meta: PaginationMeta }> {
    const { page = 1, limit = 25, search, role, status } = params;
    const query: Record<string, string | number> = { page, limit };
    if (search) query['search'] = search;
    if (role) query['role'] = role;
    if (status) query['status'] = status;

    const res = await apiClient.get<{
      success: true;
      data: ApiUser[];
      meta: PaginationMeta;
    }>('/users', { params: query });
    return { users: res.data.data, meta: res.data.meta };
  },

  /**
   * GET /users/stats
   * Returns total/active/suspended user counts.
   */
  async stats(): Promise<UserStats> {
    const res = await apiClient.get<{ success: true; data: UserStats }>('/users/stats');
    return res.data.data;
  },

  /**
   * GET /users/:id
   * Returns a single user with activity statistics.
   */
  async getById(id: string): Promise<UserProfile> {
    const res = await apiClient.get<{ success: true; data: UserProfile }>(`/users/${id}`);
    return res.data.data;
  },

  /**
   * POST /users
   * Creates a new user. Returns the created user (without password).
   */
  async create(data: CreateUserInput): Promise<ApiUser> {
    const res = await apiClient.post<{ success: true; data: { user: ApiUser } }>('/users', data);
    return res.data.data.user;
  },

  /**
   * PUT /users/:id
   * Partial update. Returns the updated user (without password).
   */
  async update(id: string, data: UpdateUserInput): Promise<ApiUser> {
    const res = await apiClient.put<{ success: true; data: { user: ApiUser } }>(
      `/users/${id}`,
      data,
    );
    return res.data.data.user;
  },

  /**
   * DELETE /users/:id
   * Hard-deletes a user. Returns 204 No Content on success.
   */
  async remove(id: string): Promise<void> {
    await apiClient.delete(`/users/${id}`);
  },
};
