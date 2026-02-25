import { apiClient } from './axios';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ReportSummary {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  receivables: number;
  payables: number;
}

export interface PropertyUnit {
  propertyId: string;
  propertyName: string;
  income: number;
  expenses: number;
  netProfit: number;
}

export interface PropertyPerformanceItem {
  propertyId: string;
  propertyName: string;
  income: number;
  expenses: number;
  netProfit: number;
  units: PropertyUnit[];
}

export interface MonthlyBreakdownItem {
  month: string; // YYYY-MM
  income: number;
  expenses: number;
  netProfit: number;
  receivables: number;
  payables: number;
}

export interface PropertyAmountItem {
  propertyId: string;
  propertyName: string;
  amount: number;
}

export interface ReportData {
  startDate: string;
  endDate: string;
  summary: ReportSummary;
  propertyPerformance: PropertyPerformanceItem[];
  monthlyBreakdown: MonthlyBreakdownItem[];
  receivablesByProperty: PropertyAmountItem[];
  payablesByProperty: PropertyAmountItem[];
}

// ── API wrapper ───────────────────────────────────────────────────────────────

export const reportsApi = {
  /** GET /reports?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD */
  async get(startDate?: string, endDate?: string): Promise<ReportData> {
    const res = await apiClient.get<{ success: true; data: ReportData }>('/reports', {
      params: {
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
      },
    });
    return res.data.data;
  },
};
