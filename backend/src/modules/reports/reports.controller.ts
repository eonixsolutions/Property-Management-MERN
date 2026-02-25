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

function parseDate(val: unknown, fallback: Date): Date {
  if (typeof val === 'string' && val.trim()) {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
  }
  return fallback;
}

function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

// ── Controller ────────────────────────────────────────────────────────────────

/**
 * GET /api/reports?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 *
 * Returns: summary KPIs, property performance, monthly breakdown,
 *          receivables/payables by property.
 */
export const getReports: RequestHandler = asyncHandler(async (req, res) => {
  const { role, id: userId } = req.user!;
  const isAdmin = role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;
  const uid = new mongoose.Types.ObjectId(userId);

  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), 0, 1);
  const defaultEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

  const startDate = parseDate(req.query['startDate'], defaultStart);
  const endRaw = parseDate(req.query['endDate'], defaultEnd);
  const endDate = new Date(endRaw);
  endDate.setHours(23, 59, 59, 999);

  // ── BL-04 scoping ──────────────────────────────────────────────────────────
  const propOwnerFilter = isAdmin ? {} : { userId: uid };
  const properties = await Property.find(propOwnerFilter)
    .select('_id type propertyName parentPropertyId')
    .lean();

  const propertyIds = properties.map((p) => p._id as mongoose.Types.ObjectId);

  const txFilter = isAdmin ? {} : { userId: uid };
  const rpFilter = isAdmin ? {} : { propertyId: { $in: propertyIds } };
  const opFilter = isAdmin ? {} : { propertyId: { $in: propertyIds } };

  // ── Parallel aggregations ─────────────────────────────────────────────────
  const [
    totalRent,
    totalTxIncome,
    totalOwnerRent,
    totalTxExpenses,
    unpaidRent,
    unpaidOwner,
    rentByProperty,
    txByProperty,
    ownerByProperty,
    rentByMonth,
    ownerByMonth,
    txIncomeByMonth,
    txExpByMonth,
    receivablesByProp,
    payablesByProp,
  ] = await Promise.all([
    // Summary: total rent income (all statuses)
    (async () => {
      const r = await RentPayment.aggregate([
        { $match: { ...rpFilter, dueDate: { $gte: startDate, $lte: endDate } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]);
      return (r[0]?.total as number | undefined) ?? 0;
    })(),

    // Summary: total transaction income
    (async () => {
      const r = await Transaction.aggregate([
        {
          $match: {
            ...txFilter,
            type: 'Income',
            transactionDate: { $gte: startDate, $lte: endDate },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]);
      return (r[0]?.total as number | undefined) ?? 0;
    })(),

    // Summary: total owner rent (all statuses)
    (async () => {
      const r = await OwnerPayment.aggregate([
        { $match: { ...opFilter, paymentMonth: { $gte: startDate, $lte: endDate } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]);
      return (r[0]?.total as number | undefined) ?? 0;
    })(),

    // Summary: total transaction expenses
    (async () => {
      const r = await Transaction.aggregate([
        {
          $match: {
            ...txFilter,
            type: 'Expense',
            transactionDate: { $gte: startDate, $lte: endDate },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]);
      return (r[0]?.total as number | undefined) ?? 0;
    })(),

    // Summary: unpaid (receivables) — pending/overdue rent in period
    (async () => {
      const r = await RentPayment.aggregate([
        {
          $match: {
            ...rpFilter,
            status: { $in: ['Pending', 'Overdue'] },
            dueDate: { $gte: startDate, $lte: endDate },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]);
      return (r[0]?.total as number | undefined) ?? 0;
    })(),

    // Summary: unpaid (payables) — pending/overdue owner payments in period
    (async () => {
      const r = await OwnerPayment.aggregate([
        {
          $match: {
            ...opFilter,
            status: { $in: ['Pending', 'Overdue'] },
            paymentMonth: { $gte: startDate, $lte: endDate },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]);
      return (r[0]?.total as number | undefined) ?? 0;
    })(),

    // Property performance: rent by propertyId
    RentPayment.aggregate([
      { $match: { ...rpFilter, dueDate: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: '$propertyId', total: { $sum: '$amount' } } },
    ]),

    // Property performance: transactions by propertyId + type
    Transaction.aggregate([
      { $match: { ...txFilter, transactionDate: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: { propertyId: '$propertyId', type: '$type' },
          total: { $sum: '$amount' },
        },
      },
    ]),

    // Property performance: owner rent by propertyId
    OwnerPayment.aggregate([
      { $match: { ...opFilter, paymentMonth: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: '$propertyId', total: { $sum: '$amount' } } },
    ]),

    // Monthly: rent by month
    RentPayment.aggregate([
      { $match: { ...rpFilter, dueDate: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: { year: { $year: '$dueDate' }, month: { $month: '$dueDate' } },
          total: { $sum: '$amount' },
          pending: {
            $sum: { $cond: [{ $in: ['$status', ['Pending', 'Overdue']] }, '$amount', 0] },
          },
        },
      },
    ]),

    // Monthly: owner payments by month
    OwnerPayment.aggregate([
      { $match: { ...opFilter, paymentMonth: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: { year: { $year: '$paymentMonth' }, month: { $month: '$paymentMonth' } },
          total: { $sum: '$amount' },
          pending: {
            $sum: { $cond: [{ $in: ['$status', ['Pending', 'Overdue']] }, '$amount', 0] },
          },
        },
      },
    ]),

    // Monthly: transaction income by month
    Transaction.aggregate([
      {
        $match: {
          ...txFilter,
          type: 'Income',
          transactionDate: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: { year: { $year: '$transactionDate' }, month: { $month: '$transactionDate' } },
          total: { $sum: '$amount' },
        },
      },
    ]),

    // Monthly: transaction expenses by month
    Transaction.aggregate([
      {
        $match: {
          ...txFilter,
          type: 'Expense',
          transactionDate: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: { year: { $year: '$transactionDate' }, month: { $month: '$transactionDate' } },
          total: { $sum: '$amount' },
        },
      },
    ]),

    // Receivables by property (deduped for display)
    RentPayment.aggregate([
      {
        $match: {
          ...rpFilter,
          status: { $in: ['Pending', 'Overdue'] },
          dueDate: { $gte: startDate, $lte: endDate },
        },
      },
      { $group: { _id: '$propertyId', amount: { $sum: '$amount' } } },
    ]),

    // Payables by property
    OwnerPayment.aggregate([
      {
        $match: {
          ...opFilter,
          status: { $in: ['Pending', 'Overdue'] },
          paymentMonth: { $gte: startDate, $lte: endDate },
        },
      },
      { $group: { _id: '$propertyId', amount: { $sum: '$amount' } } },
    ]),
  ]);

  // ── Build property name lookup ─────────────────────────────────────────────
  const propNameMap = new Map(
    properties.map((p) => [
      (p._id as mongoose.Types.ObjectId).toString(),
      { name: p.propertyName, type: p.type, parentId: p.parentPropertyId?.toString() },
    ]),
  );

  // ── Build property performance ─────────────────────────────────────────────
  type PropAgg = { _id: mongoose.Types.ObjectId | null; total: number };
  type TxAgg = {
    _id: { propertyId: mongoose.Types.ObjectId | null; type: string };
    total: number;
  };

  const rentMap = new Map<string, number>();
  for (const r of rentByProperty as PropAgg[]) {
    if (r._id) rentMap.set(r._id.toString(), r.total);
  }

  const txIncomeMap = new Map<string, number>();
  const txExpMap = new Map<string, number>();
  for (const r of txByProperty as TxAgg[]) {
    const key = r._id.propertyId?.toString() ?? '__none__';
    if (r._id.type === 'Income') txIncomeMap.set(key, (txIncomeMap.get(key) ?? 0) + r.total);
    else txExpMap.set(key, (txExpMap.get(key) ?? 0) + r.total);
  }

  const ownerMap = new Map<string, number>();
  for (const r of ownerByProperty as PropAgg[]) {
    if (r._id) ownerMap.set(r._id.toString(), r.total);
  }

  // Build master → units map first (for rollup)
  const masterMap = new Map<
    string,
    {
      propertyId: string;
      propertyName: string;
      income: number;
      expenses: number;
      netProfit: number;
      units: Array<{
        propertyId: string;
        propertyName: string;
        income: number;
        expenses: number;
        netProfit: number;
      }>;
    }
  >();

  const unitList: Array<{ id: string; parentId: string }> = [];

  // First pass: masters
  for (const p of properties) {
    const pid = (p._id as mongoose.Types.ObjectId).toString();
    if (p.type === 'master') {
      const income = (rentMap.get(pid) ?? 0) + (txIncomeMap.get(pid) ?? 0);
      const expenses = (ownerMap.get(pid) ?? 0) + (txExpMap.get(pid) ?? 0);
      masterMap.set(pid, {
        propertyId: pid,
        propertyName: p.propertyName,
        income,
        expenses,
        netProfit: income - expenses,
        units: [],
      });
    } else if (p.parentPropertyId) {
      unitList.push({ id: pid, parentId: p.parentPropertyId.toString() });
    }
  }

  // Second pass: units → attach to parent or standalone
  const standaloneUnits: typeof masterMap extends Map<string, infer V> ? V[] : never[] = [];
  for (const { id: pid, parentId } of unitList) {
    const pData = propNameMap.get(pid)!;
    const income = (rentMap.get(pid) ?? 0) + (txIncomeMap.get(pid) ?? 0);
    const expenses = (ownerMap.get(pid) ?? 0) + (txExpMap.get(pid) ?? 0);
    const unitEntry = {
      propertyId: pid,
      propertyName: pData.name,
      income,
      expenses,
      netProfit: income - expenses,
      units: [],
    };
    const parent = masterMap.get(parentId);
    if (parent) {
      parent.units.push(unitEntry);
      parent.income += income;
      parent.expenses += expenses;
      parent.netProfit += income - expenses;
    } else {
      standaloneUnits.push(unitEntry);
    }
  }

  const propertyPerformance = [...Array.from(masterMap.values()), ...standaloneUnits];

  // ── Build monthly breakdown ────────────────────────────────────────────────
  type MonthAgg = { _id: { year: number; month: number }; total: number; pending?: number };

  const rentMonthMap = new Map<string, { income: number; receivable: number }>();
  for (const r of rentByMonth as MonthAgg[]) {
    const k = monthKey(r._id.year, r._id.month);
    rentMonthMap.set(k, { income: r.total, receivable: r.pending ?? 0 });
  }

  const ownerMonthMap = new Map<string, { expenses: number; payable: number }>();
  for (const r of ownerByMonth as MonthAgg[]) {
    const k = monthKey(r._id.year, r._id.month);
    ownerMonthMap.set(k, { expenses: r.total, payable: r.pending ?? 0 });
  }

  const txIncMonthMap = new Map<string, number>();
  for (const r of txIncomeByMonth as MonthAgg[]) {
    txIncMonthMap.set(monthKey(r._id.year, r._id.month), r.total);
  }

  const txExpMonthMap = new Map<string, number>();
  for (const r of txExpByMonth as MonthAgg[]) {
    txExpMonthMap.set(monthKey(r._id.year, r._id.month), r.total);
  }

  // Collect all month keys that have data
  const allMonths = new Set([
    ...rentMonthMap.keys(),
    ...ownerMonthMap.keys(),
    ...txIncMonthMap.keys(),
    ...txExpMonthMap.keys(),
  ]);

  const monthlyBreakdown = Array.from(allMonths)
    .sort()
    .map((m) => {
      const rentData = rentMonthMap.get(m) ?? { income: 0, receivable: 0 };
      const ownerData = ownerMonthMap.get(m) ?? { expenses: 0, payable: 0 };
      const txInc = txIncMonthMap.get(m) ?? 0;
      const txExp = txExpMonthMap.get(m) ?? 0;
      const income = rentData.income + txInc;
      const expenses = ownerData.expenses + txExp;
      return {
        month: m,
        income,
        expenses,
        netProfit: income - expenses,
        receivables: rentData.receivable,
        payables: ownerData.payable,
      };
    });

  // ── Build receivables/payables by property ─────────────────────────────────
  type PropAmtAgg = { _id: mongoose.Types.ObjectId; amount: number };

  const receivablesByProperty = (receivablesByProp as PropAmtAgg[])
    .filter((r) => r._id)
    .map((r) => ({
      propertyId: r._id.toString(),
      propertyName: propNameMap.get(r._id.toString())?.name ?? r._id.toString(),
      amount: r.amount,
    }))
    .sort((a, b) => b.amount - a.amount);

  const payablesByProperty = (payablesByProp as PropAmtAgg[])
    .filter((r) => r._id)
    .map((r) => ({
      propertyId: r._id.toString(),
      propertyName: propNameMap.get(r._id.toString())?.name ?? r._id.toString(),
      amount: r.amount,
    }))
    .sort((a, b) => b.amount - a.amount);

  return ApiResponse.ok(res, {
    startDate: startDate.toISOString().slice(0, 10),
    endDate: endRaw.toISOString().slice(0, 10),
    summary: {
      totalIncome: totalRent + totalTxIncome,
      totalExpenses: totalOwnerRent + totalTxExpenses,
      netProfit: totalRent + totalTxIncome - totalOwnerRent - totalTxExpenses,
      receivables: unpaidRent,
      payables: unpaidOwner,
    },
    propertyPerformance,
    monthlyBreakdown,
    receivablesByProperty,
    payablesByProperty,
  });
});
