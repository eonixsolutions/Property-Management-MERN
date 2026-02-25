import mongoose from 'mongoose';
import type { RequestHandler } from 'express';
import { ApiResponse } from '@utils/ApiResponse';
import { asyncHandler } from '@utils/asyncHandler';
import { UserRole } from '@models/user.model';
import { Property } from '@models/property.model';
import { Tenant } from '@models/tenant.model';
import { RentPayment } from '@models/rent-payment.model';
import { Transaction } from '@models/transaction.model';
import { OwnerPayment } from '@models/owner-payment.model';
import { MaintenanceRequest } from '@models/maintenance-request.model';

// ── Helpers ───────────────────────────────────────────────────────────────────

function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

/** Build an array of the last N month keys (YYYY-MM), oldest first. */
function last12Months(): string[] {
  const now = new Date();
  const result: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push(monthKey(d.getFullYear(), d.getMonth() + 1));
  }
  return result;
}

// ── Controller ────────────────────────────────────────────────────────────────

/**
 * GET /api/dashboard
 *
 * Returns all KPIs in a single call. BL-04 scoped for STAFF users.
 */
export const getDashboard: RequestHandler = asyncHandler(async (req, res) => {
  const { role, id: userId } = req.user!;
  const isAdmin = role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;

  // ── Date boundaries ────────────────────────────────────────────────────────
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thirtyDaysLater = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const twelveMonthsAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1);

  // ── BL-04 scoping ─────────────────────────────────────────────────────────
  const uid = new mongoose.Types.ObjectId(userId);
  const propOwnerFilter = isAdmin ? {} : { userId: uid };

  // Fetch properties for stats + scoping
  const properties = await Property.find(propOwnerFilter)
    .select('_id type status propertyName currentValue purchasePrice')
    .lean();

  const propertyIds = properties.map((p) => p._id as mongoose.Types.ObjectId);

  // Scope filters for child models
  const txFilter = isAdmin ? {} : { userId: uid };
  const rpFilter = isAdmin ? {} : { propertyId: { $in: propertyIds } };
  const opFilter = isAdmin ? {} : { propertyId: { $in: propertyIds } };
  const mxFilter = isAdmin ? {} : { userId: uid };
  const tenantFilter = isAdmin ? {} : { propertyId: { $in: propertyIds } };

  // ── Parallel aggregations ─────────────────────────────────────────────────
  const [
    activeTenants,
    pendingMaintenance,
    // Current-month financials
    monthTxIncomeResult,
    monthTxExpensesResult,
    monthRentReceivedResult,
    monthOwnerPaidResult,
    // Overdue rent
    overdueRentResult,
    // Upcoming rent (next 30 days)
    upcomingRentResult,
    // 12-month cashflow aggregations
    txByMonth,
    rentByMonth,
    ownerByMonth,
    // Recent data
    recentTransactions,
    upcomingRentPayments,
    expensesByCategory,
  ] = await Promise.all([
    // Active tenant count
    Tenant.countDocuments({ ...tenantFilter, status: 'Active' }),

    // Pending + In Progress maintenance count
    MaintenanceRequest.countDocuments({ ...mxFilter, status: { $in: ['Pending', 'In Progress'] } }),

    // This-month income transactions
    Transaction.aggregate([
      {
        $match: {
          ...txFilter,
          type: 'Income',
          transactionDate: { $gte: monthStart, $lt: nextMonthStart },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),

    // This-month expense transactions
    Transaction.aggregate([
      {
        $match: {
          ...txFilter,
          type: 'Expense',
          transactionDate: { $gte: monthStart, $lt: nextMonthStart },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),

    // This-month rent received (Paid)
    RentPayment.aggregate([
      {
        $match: { ...rpFilter, status: 'Paid', dueDate: { $gte: monthStart, $lt: nextMonthStart } },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),

    // This-month owner payments paid
    OwnerPayment.aggregate([
      {
        $match: {
          ...opFilter,
          status: 'Paid',
          paymentMonth: { $gte: monthStart, $lt: nextMonthStart },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),

    // Overdue rent (status=Overdue OR status=Pending with past dueDate)
    RentPayment.aggregate([
      {
        $match: {
          ...rpFilter,
          $or: [{ status: 'Overdue' }, { status: 'Pending', dueDate: { $lt: today } }],
        },
      },
      { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: '$amount' } } },
    ]),

    // Upcoming rent (next 30 days, pending)
    RentPayment.aggregate([
      {
        $match: {
          ...rpFilter,
          status: 'Pending',
          dueDate: { $gte: today, $lte: thirtyDaysLater },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),

    // 12-month transactions by month + type
    Transaction.aggregate([
      { $match: { ...txFilter, transactionDate: { $gte: twelveMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$transactionDate' },
            month: { $month: '$transactionDate' },
            type: '$type',
          },
          total: { $sum: '$amount' },
        },
      },
    ]),

    // 12-month rent payments by month (Paid only)
    RentPayment.aggregate([
      { $match: { ...rpFilter, status: 'Paid', dueDate: { $gte: twelveMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: '$dueDate' }, month: { $month: '$dueDate' } },
          total: { $sum: '$amount' },
        },
      },
    ]),

    // 12-month owner payments by month (Paid only)
    OwnerPayment.aggregate([
      { $match: { ...opFilter, status: 'Paid', paymentMonth: { $gte: twelveMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: '$paymentMonth' }, month: { $month: '$paymentMonth' } },
          total: { $sum: '$amount' },
        },
      },
    ]),

    // Recent transactions (last 10)
    Transaction.find(txFilter).sort({ transactionDate: -1 }).limit(10).lean(),

    // Upcoming rent payments (next 5)
    RentPayment.find({
      ...rpFilter,
      status: { $in: ['Pending', 'Overdue'] },
      dueDate: { $gte: today },
    })
      .sort({ dueDate: 1 })
      .limit(5)
      .lean(),

    // Top expense categories (last 30 days)
    Transaction.aggregate([
      {
        $match: {
          ...txFilter,
          type: 'Expense',
          transactionDate: { $gte: thirtyDaysAgo },
        },
      },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } },
      { $limit: 8 },
    ]),
  ]);

  // ── Build property stats ───────────────────────────────────────────────────
  const total = properties.length;
  const occupied = properties.filter((p) => p.status === 'Occupied').length;
  const vacant = properties.filter((p) => p.status === 'Vacant').length;
  const underMaintenance = properties.filter((p) => p.status === 'Under Maintenance').length;
  const masters = properties.filter((p) => p.type === 'master').length;
  const units = properties.filter((p) => p.type === 'unit').length;
  const occupancyRate = total > 0 ? Math.round((occupied / total) * 100) : 0;
  const totalPropertyValue = properties.reduce((s, p) => s + (p.currentValue ?? 0), 0);

  // ── Build current-month financial summary ──────────────────────────────────
  const txIncome = (monthTxIncomeResult[0]?.total as number | undefined) ?? 0;
  const txExpenses = (monthTxExpensesResult[0]?.total as number | undefined) ?? 0;
  const rentReceived = (monthRentReceivedResult[0]?.total as number | undefined) ?? 0;
  const ownerPaid = (monthOwnerPaidResult[0]?.total as number | undefined) ?? 0;

  const currentMonthIncome = txIncome + rentReceived;
  const currentMonthExpenses = txExpenses + ownerPaid;
  const currentMonthNet = currentMonthIncome - currentMonthExpenses;

  // ── Build rent status ──────────────────────────────────────────────────────
  const overdueData = overdueRentResult[0] as { count: number; amount: number } | undefined;
  const overdueCount = overdueData?.count ?? 0;
  const overdueAmount = overdueData?.amount ?? 0;
  const upcomingAmount = (upcomingRentResult[0]?.total as number | undefined) ?? 0;

  // ── Build 12-month cashflow ────────────────────────────────────────────────
  // Index aggregation results by month key
  const txIncomeByMonth = new Map<string, number>();
  const txExpensesByMonth = new Map<string, number>();
  for (const row of txByMonth as Array<{
    _id: { year: number; month: number; type: string };
    total: number;
  }>) {
    const key = monthKey(row._id.year, row._id.month);
    if (row._id.type === 'Income') {
      txIncomeByMonth.set(key, (txIncomeByMonth.get(key) ?? 0) + row.total);
    } else {
      txExpensesByMonth.set(key, (txExpensesByMonth.get(key) ?? 0) + row.total);
    }
  }

  const rentByMonthMap = new Map<string, number>();
  for (const row of rentByMonth as Array<{
    _id: { year: number; month: number };
    total: number;
  }>) {
    rentByMonthMap.set(monthKey(row._id.year, row._id.month), row.total);
  }

  const ownerByMonthMap = new Map<string, number>();
  for (const row of ownerByMonth as Array<{
    _id: { year: number; month: number };
    total: number;
  }>) {
    ownerByMonthMap.set(monthKey(row._id.year, row._id.month), row.total);
  }

  const cashflow = last12Months().map((m) => {
    const income = (txIncomeByMonth.get(m) ?? 0) + (rentByMonthMap.get(m) ?? 0);
    const expenses = (txExpensesByMonth.get(m) ?? 0) + (ownerByMonthMap.get(m) ?? 0);
    return { month: m, income, expenses, net: income - expenses };
  });

  return ApiResponse.ok(res, {
    propertyStats: {
      total,
      masters,
      units,
      occupied,
      vacant,
      underMaintenance,
      occupancyRate,
      totalPropertyValue,
    },
    financialSummary: {
      currentMonthIncome,
      currentMonthExpenses,
      currentMonthNet,
    },
    rentStatus: {
      activeTenants,
      overdueCount,
      overdueAmount,
      upcomingAmount,
      thisMonthReceived: rentReceived,
    },
    maintenanceSummary: { pendingCount: pendingMaintenance },
    cashflow,
    recentTransactions,
    upcomingRentPayments,
    expensesByCategory: (expensesByCategory as Array<{ _id: string; total: number }>).map((r) => ({
      category: r._id ?? 'Uncategorised',
      amount: r.total,
    })),
  });
});
