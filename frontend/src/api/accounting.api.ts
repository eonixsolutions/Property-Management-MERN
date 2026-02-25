import { apiClient } from './axios';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BalanceSheet {
  asOfDate: string;
  assets: {
    currentAssets: { cash: number; accountsReceivable: number; total: number };
    fixedAssets: { propertyValue: number; total: number };
    total: number;
  };
  liabilities: {
    currentLiabilities: { accountsPayable: number; total: number };
    total: number;
  };
  equity: { retainedEarnings: number; total: number };
  totalLiabilitiesAndEquity: number;
  balanced: boolean;
}

export interface CategoryAmount {
  category: string;
  amount: number;
}

export interface ProfitLoss {
  startDate: string;
  endDate: string;
  revenue: { rentIncome: number; otherIncome: number; total: number };
  expenses: { ownerRent: number; otherExpenses: number; total: number };
  netProfit: number;
  incomeByCategory: CategoryAmount[];
  expensesByCategory: CategoryAmount[];
}

export interface TrialAccount {
  name: string;
  type: 'asset' | 'liability' | 'equity';
  debit: number;
  credit: number;
}

export interface TrialBalance {
  asOfDate: string;
  accounts: TrialAccount[];
  totalDebits: number;
  totalCredits: number;
  balanced: boolean;
}

// ── API wrapper ───────────────────────────────────────────────────────────────

export const accountingApi = {
  /** GET /accounting/balance-sheet?asOfDate=YYYY-MM-DD */
  async getBalanceSheet(asOfDate?: string): Promise<BalanceSheet> {
    const res = await apiClient.get<{ success: true; data: BalanceSheet }>(
      '/accounting/balance-sheet',
      { params: asOfDate ? { asOfDate } : undefined },
    );
    return res.data.data;
  },

  /** GET /accounting/profit-loss?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD */
  async getProfitLoss(startDate?: string, endDate?: string): Promise<ProfitLoss> {
    const res = await apiClient.get<{ success: true; data: ProfitLoss }>(
      '/accounting/profit-loss',
      {
        params: {
          ...(startDate ? { startDate } : {}),
          ...(endDate ? { endDate } : {}),
        },
      },
    );
    return res.data.data;
  },

  /** GET /accounting/trial-balance?asOfDate=YYYY-MM-DD */
  async getTrialBalance(asOfDate?: string): Promise<TrialBalance> {
    const res = await apiClient.get<{ success: true; data: TrialBalance }>(
      '/accounting/trial-balance',
      { params: asOfDate ? { asOfDate } : undefined },
    );
    return res.data.data;
  },
};
