import mongoose from 'mongoose';
import type { RequestHandler } from 'express';
import { ApiResponse } from '@utils/ApiResponse';
import { asyncHandler } from '@utils/asyncHandler';
import { UserRole } from '@models/user.model';
import { Property } from '@models/property.model';
import { RentPayment } from '@models/rent-payment.model';
import { Transaction } from '@models/transaction.model';
import { OwnerPayment } from '@models/owner-payment.model';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Parse an ISO date string or default to today. */
function parseDate(val: unknown, fallback: Date): Date {
  if (typeof val === 'string' && val.trim()) {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
  }
  return fallback;
}

/** Aggregate sum from a Transaction match. */
async function txSum(match: Record<string, unknown>): Promise<number> {
  const res = await Transaction.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  return (res[0]?.total as number | undefined) ?? 0;
}

/** Aggregate sum from a RentPayment match. */
async function rpSum(match: Record<string, unknown>): Promise<number> {
  const res = await RentPayment.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  return (res[0]?.total as number | undefined) ?? 0;
}

/** Aggregate sum from an OwnerPayment match. */
async function opSum(match: Record<string, unknown>): Promise<number> {
  const res = await OwnerPayment.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  return (res[0]?.total as number | undefined) ?? 0;
}

// ── BL-04 scope builder ───────────────────────────────────────────────────────

async function buildScopes(
  isAdmin: boolean,
  uid: mongoose.Types.ObjectId,
): Promise<{
  txFilter: Record<string, unknown>;
  rpFilter: Record<string, unknown>;
  opFilter: Record<string, unknown>;
  propFilter: Record<string, unknown>;
  propertyIds: mongoose.Types.ObjectId[];
}> {
  const propFilter = isAdmin ? {} : { userId: uid };
  const properties = await Property.find(propFilter).select('_id currentValue').lean();
  const propertyIds = properties.map((p) => p._id as mongoose.Types.ObjectId);
  const txFilter = isAdmin ? {} : { userId: uid };
  const rpFilter = isAdmin ? {} : { propertyId: { $in: propertyIds } };
  const opFilter = isAdmin ? {} : { propertyId: { $in: propertyIds } };
  return { txFilter, rpFilter, opFilter, propFilter, propertyIds };
}

// ── Balance Sheet ─────────────────────────────────────────────────────────────

/**
 * GET /api/accounting/balance-sheet?asOfDate=YYYY-MM-DD
 */
export const getBalanceSheet: RequestHandler = asyncHandler(async (req, res) => {
  const { role, id: userId } = req.user!;
  const isAdmin = role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;
  const uid = new mongoose.Types.ObjectId(userId);

  const asOfDate = parseDate(req.query['asOfDate'], new Date());
  // End of the asOfDate (23:59:59.999)
  const asOfEnd = new Date(asOfDate);
  asOfEnd.setHours(23, 59, 59, 999);

  const { txFilter, rpFilter, opFilter, propFilter } = await buildScopes(isAdmin, uid);

  const [
    txIncomeToDate,
    txExpensesToDate,
    rentPaidToDate,
    ownerPaidToDate,
    accountsReceivable,
    accountsPayable,
    propertyValue,
  ] = await Promise.all([
    txSum({ ...txFilter, type: 'Income', transactionDate: { $lte: asOfEnd } }),
    txSum({ ...txFilter, type: 'Expense', transactionDate: { $lte: asOfEnd } }),
    rpSum({ ...rpFilter, status: 'Paid', dueDate: { $lte: asOfEnd } }),
    opSum({ ...opFilter, status: 'Paid', paymentMonth: { $lte: asOfEnd } }),
    // Receivables: unpaid/overdue rent due on or before asOfDate
    rpSum({
      ...rpFilter,
      status: { $in: ['Pending', 'Overdue'] },
      dueDate: { $lte: asOfEnd },
    }),
    // Payables: unpaid owner payments on or before asOfDate
    opSum({
      ...opFilter,
      status: { $in: ['Pending', 'Overdue'] },
      paymentMonth: { $lte: asOfEnd },
    }),
    // Fixed assets: sum of current property values
    (async () => {
      const props = await Property.find(propFilter).select('currentValue').lean();
      return props.reduce((s, p) => s + (p.currentValue ?? 0), 0);
    })(),
  ]);

  // Cash = income earned - expenses paid + rent received - owner rent paid
  const cash = txIncomeToDate - txExpensesToDate + rentPaidToDate - ownerPaidToDate;
  const totalCurrentAssets = cash + accountsReceivable;
  const totalAssets = totalCurrentAssets + propertyValue;

  const totalLiabilities = accountsPayable;

  const retainedEarnings = txIncomeToDate + rentPaidToDate - txExpensesToDate - ownerPaidToDate;
  const totalEquity = retainedEarnings;

  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
  const balanced = Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01;

  return ApiResponse.ok(res, {
    asOfDate: asOfDate.toISOString().slice(0, 10),
    assets: {
      currentAssets: {
        cash,
        accountsReceivable,
        total: totalCurrentAssets,
      },
      fixedAssets: {
        propertyValue,
        total: propertyValue,
      },
      total: totalAssets,
    },
    liabilities: {
      currentLiabilities: {
        accountsPayable,
        total: accountsPayable,
      },
      total: totalLiabilities,
    },
    equity: {
      retainedEarnings,
      total: totalEquity,
    },
    totalLiabilitiesAndEquity,
    balanced,
  });
});

// ── Profit & Loss ─────────────────────────────────────────────────────────────

/**
 * GET /api/accounting/profit-loss?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */
export const getProfitLoss: RequestHandler = asyncHandler(async (req, res) => {
  const { role, id: userId } = req.user!;
  const isAdmin = role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;
  const uid = new mongoose.Types.ObjectId(userId);

  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), 0, 1); // Jan 1 this year
  const defaultEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999); // Dec 31

  const startDate = parseDate(req.query['startDate'], defaultStart);
  const endRaw = parseDate(req.query['endDate'], defaultEnd);
  const endDate = new Date(endRaw);
  endDate.setHours(23, 59, 59, 999);

  const { txFilter, rpFilter, opFilter } = await buildScopes(isAdmin, uid);

  const [rentIncome, otherIncome, ownerRent, otherExpenses, incomeByCategory, expensesByCategory] =
    await Promise.all([
      // Rent income: ALL statuses (matches PHP behaviour — due, not necessarily paid)
      rpSum({ ...rpFilter, dueDate: { $gte: startDate, $lte: endDate } }),

      // Other income: transactions
      txSum({ ...txFilter, type: 'Income', transactionDate: { $gte: startDate, $lte: endDate } }),

      // Owner rent: ALL statuses
      opSum({ ...opFilter, paymentMonth: { $gte: startDate, $lte: endDate } }),

      // Other expenses: transactions
      txSum({ ...txFilter, type: 'Expense', transactionDate: { $gte: startDate, $lte: endDate } }),

      // Income by category (transactions only)
      Transaction.aggregate([
        {
          $match: {
            ...txFilter,
            type: 'Income',
            transactionDate: { $gte: startDate, $lte: endDate },
          },
        },
        { $group: { _id: '$category', amount: { $sum: '$amount' } } },
        { $sort: { amount: -1 } },
      ]),

      // Expenses by category (transactions only)
      Transaction.aggregate([
        {
          $match: {
            ...txFilter,
            type: 'Expense',
            transactionDate: { $gte: startDate, $lte: endDate },
          },
        },
        { $group: { _id: '$category', amount: { $sum: '$amount' } } },
        { $sort: { amount: -1 } },
      ]),
    ]);

  const totalRevenue = rentIncome + otherIncome;
  const totalExpenses = ownerRent + otherExpenses;
  const netProfit = totalRevenue - totalExpenses;

  return ApiResponse.ok(res, {
    startDate: startDate.toISOString().slice(0, 10),
    endDate: endRaw.toISOString().slice(0, 10),
    revenue: {
      rentIncome,
      otherIncome,
      total: totalRevenue,
    },
    expenses: {
      ownerRent,
      otherExpenses,
      total: totalExpenses,
    },
    netProfit,
    incomeByCategory: (incomeByCategory as Array<{ _id: string; amount: number }>).map((r) => ({
      category: r._id ?? 'Uncategorised',
      amount: r.amount,
    })),
    expensesByCategory: (expensesByCategory as Array<{ _id: string; amount: number }>).map((r) => ({
      category: r._id ?? 'Uncategorised',
      amount: r.amount,
    })),
  });
});

// ── Trial Balance ─────────────────────────────────────────────────────────────

/**
 * GET /api/accounting/trial-balance?asOfDate=YYYY-MM-DD
 */
export const getTrialBalance: RequestHandler = asyncHandler(async (req, res) => {
  const { role, id: userId } = req.user!;
  const isAdmin = role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;
  const uid = new mongoose.Types.ObjectId(userId);

  const asOfDate = parseDate(req.query['asOfDate'], new Date());
  const asOfEnd = new Date(asOfDate);
  asOfEnd.setHours(23, 59, 59, 999);

  const { txFilter, rpFilter, opFilter, propFilter } = await buildScopes(isAdmin, uid);

  const [txIncome, txExpenses, rentPaid, ownerPaid, receivables, payables] = await Promise.all([
    txSum({ ...txFilter, type: 'Income', transactionDate: { $lte: asOfEnd } }),
    txSum({ ...txFilter, type: 'Expense', transactionDate: { $lte: asOfEnd } }),
    rpSum({ ...rpFilter, status: 'Paid', dueDate: { $lte: asOfEnd } }),
    opSum({ ...opFilter, status: 'Paid', paymentMonth: { $lte: asOfEnd } }),
    rpSum({ ...rpFilter, status: { $in: ['Pending', 'Overdue'] }, dueDate: { $lte: asOfEnd } }),
    opSum({
      ...opFilter,
      status: { $in: ['Pending', 'Overdue'] },
      paymentMonth: { $lte: asOfEnd },
    }),
  ]);

  const props = await Property.find(propFilter).select('currentValue').lean();
  const propertyValue = props.reduce((s, p) => s + (p.currentValue ?? 0), 0);

  const cash = txIncome - txExpenses + rentPaid - ownerPaid;
  const retainedEarnings = txIncome + rentPaid - txExpenses - ownerPaid;

  interface TrialAccount {
    name: string;
    type: 'asset' | 'liability' | 'equity';
    debit: number;
    credit: number;
  }

  const accounts: TrialAccount[] = [
    { name: 'Cash', type: 'asset', debit: Math.max(0, cash), credit: Math.max(0, -cash) },
    { name: 'Accounts Receivable', type: 'asset', debit: receivables, credit: 0 },
    { name: 'Property Value', type: 'asset', debit: propertyValue, credit: 0 },
    { name: 'Accounts Payable', type: 'liability', debit: 0, credit: payables },
    {
      name: 'Retained Earnings',
      type: 'equity',
      debit: Math.max(0, -retainedEarnings),
      credit: Math.max(0, retainedEarnings),
    },
  ];

  const totalDebits = accounts.reduce((s, a) => s + a.debit, 0);
  const totalCredits = accounts.reduce((s, a) => s + a.credit, 0);
  const balanced = Math.abs(totalDebits - totalCredits) < 0.01;

  return ApiResponse.ok(res, {
    asOfDate: asOfDate.toISOString().slice(0, 10),
    accounts,
    totalDebits,
    totalCredits,
    balanced,
  });
});
