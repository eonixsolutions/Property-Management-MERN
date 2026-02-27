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
  createdAt: string;
  updatedAt: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
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

// ── API wrappers ──────────────────────────────────────────────────────────────

export const usersApi = {
  /**
   * GET /users?page=&limit=
   * Returns paginated list of all users.
   */
  async list(page = 1, limit = 25): Promise<{ users: ApiUser[]; meta: PaginationMeta }> {
    const res = await apiClient.get<{
      success: true;
      data: ApiUser[];
      meta: PaginationMeta;
    }>('/users', { params: { page, limit } });
    return { users: res.data.data, meta: res.data.meta };
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
