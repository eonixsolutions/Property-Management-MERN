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
}

export interface DashboardFinancialSummary {
  currentMonthIncome: number;
  currentMonthExpenses: number;
  currentMonthNet: number;
}

export interface DashboardRentStatus {
  activeTenants: number;
  overdueCount: number;
  overdueAmount: number;
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
}

export interface DashboardUpcomingRentPayment {
  _id: string;
  tenantId: string;
  propertyId: string;
  amount: number;
  dueDate: string;
  status: 'Pending' | 'Overdue';
}

export interface DashboardData {
  propertyStats: DashboardPropertyStats;
  financialSummary: DashboardFinancialSummary;
  rentStatus: DashboardRentStatus;
  maintenanceSummary: { pendingCount: number };
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
