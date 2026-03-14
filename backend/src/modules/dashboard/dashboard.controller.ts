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
  const propOwnerFilter = isAdmin
    ? { isDeleted: { $ne: true } }
    : { userId: uid, isDeleted: { $ne: true } };

  // Fetch properties for stats + scoping
  const properties = await Property.find(propOwnerFilter)
    .select('_id type status propertyName currentValue purchasePrice defaultRent')
    .lean();

  const propertyIds = properties.map((p) => p._id as mongoose.Types.ObjectId);

  // Scope filters for child models
  const isDeletedFilter = { isDeleted: { $ne: true } };
  const txFilter = isAdmin ? { ...isDeletedFilter } : { userId: uid, ...isDeletedFilter };
  const rpFilter = isAdmin
    ? { ...isDeletedFilter }
    : { propertyId: { $in: propertyIds }, ...isDeletedFilter };
  const opFilter = isAdmin
    ? { ...isDeletedFilter }
    : { propertyId: { $in: propertyIds }, ...isDeletedFilter };
  const mxFilter = isAdmin ? { ...isDeletedFilter } : { userId: uid, ...isDeletedFilter };
  const tenantFilter = isAdmin
    ? { ...isDeletedFilter }
    : { propertyId: { $in: propertyIds }, ...isDeletedFilter };

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
    // Overdue owner payments
    overdueOwnerResult,
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
    // Recent maintenance requests (last 5 pending/in-progress)
    recentMaintenance,
  ] = await Promise.all([
    // Active tenant count
    Tenant.countDocuments({ ...tenantFilter, status: 'Active' }),

    // Pending + In Progress maintenance count
    MaintenanceRequest.countDocuments({ ...mxFilter, status: { $in: ['Pending', 'In Progress'] } }),

    // This-month income transactions (exclude 'Rent' — rent flows via RentPayments to avoid double-counting)
    Transaction.aggregate([
      {
        $match: {
          ...txFilter,
          type: 'Income',
          category: { $ne: 'Rent' },
          transactionDate: { $gte: monthStart, $lt: nextMonthStart },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),

    // This-month expense transactions (exclude 'Owner Payment' — flows via OwnerPayments to avoid double-counting)
    Transaction.aggregate([
      {
        $match: {
          ...txFilter,
          type: 'Expense',
          category: { $ne: 'Owner Payment' },
          transactionDate: { $gte: monthStart, $lt: nextMonthStart },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),

    // This-month rent received (Paid) — use paidDate so late payments count in the month they were actually received
    RentPayment.aggregate([
      {
        $match: {
          ...rpFilter,
          status: 'Paid',
          paidDate: { $gte: monthStart, $lt: nextMonthStart },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),

    // This-month owner payments paid — use paidDate so late payments count in the month actually paid
    OwnerPayment.aggregate([
      {
        $match: {
          ...opFilter,
          status: 'Paid',
          paidDate: { $gte: monthStart, $lt: nextMonthStart },
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

    // Overdue owner payments (status=Overdue OR Pending for a past month)
    OwnerPayment.aggregate([
      {
        $match: {
          ...opFilter,
          $or: [{ status: 'Overdue' }, { status: 'Pending', paymentMonth: { $lt: monthStart } }],
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

    // 12-month rent payments by month (Paid only) — grouped by paidDate for accurate cash-flow chart
    RentPayment.aggregate([
      { $match: { ...rpFilter, status: 'Paid', paidDate: { $gte: twelveMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: '$paidDate' }, month: { $month: '$paidDate' } },
          total: { $sum: '$amount' },
        },
      },
    ]),

    // 12-month owner payments by month (Paid only) — grouped by paidDate for accurate cash-flow chart
    OwnerPayment.aggregate([
      { $match: { ...opFilter, status: 'Paid', paidDate: { $gte: twelveMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: '$paidDate' }, month: { $month: '$paidDate' } },
          total: { $sum: '$amount' },
        },
      },
    ]),

    // Recent transactions (last 10)
    Transaction.find(txFilter)
      .sort({ transactionDate: -1 })
      .limit(10)
      .populate('propertyId', 'propertyName')
      .lean(),

    // Upcoming rent payments (next 5)
    RentPayment.find({
      ...rpFilter,
      status: { $in: ['Pending', 'Overdue'] },
      dueDate: { $gte: today },
    })
      .sort({ dueDate: 1 })
      .limit(5)
      .populate('tenantId', 'firstName lastName')
      .populate('propertyId', 'propertyName')
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

    // Recent maintenance requests (last 5 Pending or In Progress)
    MaintenanceRequest.find({ ...mxFilter, status: { $in: ['Pending', 'In Progress'] } })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('propertyId', 'propertyName')
      .lean(),
  ]);

  // ── Build property stats ───────────────────────────────────────────────────
  const total = properties.length;
  const masters = properties.filter((p) => p.type === 'master').length;
  const units = properties.filter((p) => p.type === 'unit').length;
  // Occupancy is measured on units only — master properties are containers, not rentable units
  const occupied = properties.filter((p) => p.type === 'unit' && p.status === 'Occupied').length;
  const vacant = properties.filter((p) => p.type === 'unit' && p.status === 'Vacant').length;
  const underMaintenance = properties.filter(
    (p) => p.type === 'unit' && p.status === 'Under Maintenance',
  ).length;
  const occupancyRate = units > 0 ? Math.round((occupied / units) * 100) : 0;
  // Sum only master properties — units are subdivisions of masters, summing both would double-count
  const totalPropertyValue = properties
    .filter((p) => p.type === 'master')
    .reduce((s, p) => s + ((p as { currentValue?: number }).currentValue ?? 0), 0);
  const totalPurchasePrice = properties.reduce(
    (s, p) => s + ((p as { purchasePrice?: number }).purchasePrice ?? 0),
    0,
  );

  // Vacant units stats (PHP equivalent)
  const vacantUnits = properties.filter((p) => p.type === 'unit' && p.status === 'Vacant');
  const vacantUnitsCount = vacantUnits.length;
  const vacantUnitsValue = vacantUnits.reduce(
    (s, p) => s + ((p as { defaultRent?: number }).defaultRent ?? 0),
    0,
  );

  // ── Build current-month financial summary ──────────────────────────────────
  const txIncome = (monthTxIncomeResult[0]?.total as number | undefined) ?? 0;
  const txExpenses = (monthTxExpensesResult[0]?.total as number | undefined) ?? 0;
  const rentReceived = (monthRentReceivedResult[0]?.total as number | undefined) ?? 0;
  const ownerPaid = (monthOwnerPaidResult[0]?.total as number | undefined) ?? 0;

  const currentMonthIncome = txIncome + rentReceived;
  const currentMonthExpenses = txExpenses + ownerPaid;
  const currentMonthNet = currentMonthIncome - currentMonthExpenses;

  // Cash-on-Cash Return: (trailing 12-month net cashflow / total purchase price) * 100
  // Computed after the 12-month maps are built — see below; placeholder until then
  let cashOnCashReturn = 0;

  // ── Build rent status ──────────────────────────────────────────────────────
  const overdueData = overdueRentResult[0] as { count: number; amount: number } | undefined;
  const overdueCount = overdueData?.count ?? 0;
  const overdueAmount = overdueData?.amount ?? 0;

  const overdueOwnerData = overdueOwnerResult[0] as { count: number; amount: number } | undefined;
  const overdueOwnerCount = overdueOwnerData?.count ?? 0;
  const overdueOwnerAmount = overdueOwnerData?.amount ?? 0;

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

  // Cash-on-Cash Return: actual trailing 12-month net / total purchase price
  const trailing12Net = cashflow.reduce((sum, m) => sum + m.net, 0);
  cashOnCashReturn =
    totalPurchasePrice > 0 ? Math.round((trailing12Net / totalPurchasePrice) * 100 * 10) / 10 : 0;

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
      vacantUnitsCount,
      vacantUnitsValue,
    },
    financialSummary: {
      currentMonthIncome,
      currentMonthExpenses,
      currentMonthNet,
      cashOnCashReturn,
    },
    rentStatus: {
      activeTenants,
      overdueCount,
      overdueAmount,
      overdueOwnerCount,
      overdueOwnerAmount,
      upcomingAmount,
      thisMonthReceived: rentReceived,
    },
    maintenanceSummary: {
      pendingCount: pendingMaintenance,
      recentRequests: recentMaintenance,
    },
    cashflow,
    recentTransactions,
    upcomingRentPayments,
    expensesByCategory: (expensesByCategory as Array<{ _id: string; total: number }>).map((r) => ({
      category: r._id ?? 'Uncategorised',
      amount: r.total,
    })),
  });
});
