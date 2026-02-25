import { apiClient } from './axios';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ApiSettings {
  _id: string;
  userId: string;
  currency: string;
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateSettingsInput {
  currency?: string;
  timezone?: string;
}

// ── API wrappers ──────────────────────────────────────────────────────────────

export const settingsApi = {
  /**
   * GET /settings
   * Returns the authenticated user's settings.
   */
  async get(): Promise<ApiSettings> {
    const res = await apiClient.get<{ success: true; data: { settings: ApiSettings } }>('/settings');
    return res.data.data.settings;
  },

  /**
   * PUT /settings
   * Partially updates the authenticated user's settings.
   */
  async update(data: UpdateSettingsInput): Promise<ApiSettings> {
    const res = await apiClient.put<{ success: true; data: { settings: ApiSettings } }>(
      '/settings',
      data,
    );
    return res.data.data.settings;
  },
};
