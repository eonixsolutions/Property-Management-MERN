import { apiClient } from './axios';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface NotificationSummary {
  overdueRent: {
    count: number;
    totalAmount: number;
  };
  rentDueSoon: {
    count: number;
  };
  leasesExpiringSoon: {
    count: number;
  };
  maintenancePending: {
    count: number;
  };
  tenantChequesUpcoming: {
    count: number;
  };
  ownerChequesUpcoming: {
    count: number;
  };
  totalCount: number;
}

// ── API wrapper ───────────────────────────────────────────────────────────────

export const notificationsApi = {
  /** GET /notifications — returns the notification summary for the current user */
  async get(): Promise<NotificationSummary> {
    const res = await apiClient.get<{ success: true; data: NotificationSummary }>(
      '/notifications',
    );
    return res.data.data;
  },
};
