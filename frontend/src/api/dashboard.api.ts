import { apiClient } from './axios';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DashboardPropertyStats {
  total: number;
  masters: number;
  units: number;
  occupied: number;
  vacant: number;
  underMaintenance: number;
  occupancyRate: number;
  totalPropertyValue: number;
  vacantUnitsCount: number;
  vacantUnitsValue: number;
}

export interface DashboardFinancialSummary {
  currentMonthIncome: number;
  currentMonthExpenses: number;
  currentMonthNet: number;
  cashOnCashReturn: number;
}

export interface DashboardRentStatus {
  activeTenants: number;
  overdueCount: number;
  overdueAmount: number;
  overdueOwnerCount: number;
  overdueOwnerAmount: number;
  upcomingAmount: number;
  thisMonthReceived: number;
}

export interface DashboardCashflowItem {
  month: string; // YYYY-MM
  income: number;
  expenses: number;
  net: number;
}

export interface DashboardExpenseCategory {
  category: string;
  amount: number;
}

export interface DashboardRecentTransaction {
  _id: string;
  type: 'Income' | 'Expense';
  category: string;
  amount: number;
  description?: string;
  transactionDate: string;
  propertyId?: { _id: string; propertyName: string } | string | null;
}

export interface DashboardUpcomingRentPayment {
  _id: string;
  tenantId: { _id: string; firstName: string; lastName: string } | string;
  propertyId: { _id: string; propertyName: string } | string;
  amount: number;
  dueDate: string;
  status: 'Pending' | 'Overdue';
}

export interface DashboardMaintenanceRequest {
  _id: string;
  title: string;
  priority: 'Low' | 'Medium' | 'High' | 'Emergency';
  status: 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';
  propertyId: { _id: string; propertyName: string } | string;
  createdAt: string;
}

export interface DashboardMaintenanceSummary {
  pendingCount: number;
  recentRequests: DashboardMaintenanceRequest[];
}

export interface DashboardData {
  propertyStats: DashboardPropertyStats;
  financialSummary: DashboardFinancialSummary;
  rentStatus: DashboardRentStatus;
  maintenanceSummary: DashboardMaintenanceSummary;
  cashflow: DashboardCashflowItem[];
  recentTransactions: DashboardRecentTransaction[];
  upcomingRentPayments: DashboardUpcomingRentPayment[];
  expensesByCategory: DashboardExpenseCategory[];
}

// ── API wrapper ───────────────────────────────────────────────────────────────

export const dashboardApi = {
  /** GET /dashboard — all KPIs in one call */
  async get(): Promise<DashboardData> {
    const res = await apiClient.get<{ success: true; data: DashboardData }>('/dashboard');
    return res.data.data;
  },
};
