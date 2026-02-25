import mongoose from 'mongoose';
import { Tenant } from '@models/tenant.model';
import { RentPayment } from '@models/rent-payment.model';

// ── Date helpers ───────────────────────────────────────────────────────────

/** Returns a new Date set to the 1st of the given date's month at 00:00:00 UTC */
function startOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

/** Returns a new Date set to the 1st of the next month (for $lt comparisons) */
function startOfNextMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
}

/** Returns true if a < b when both are compared at month granularity */
function monthLte(a: Date, b: Date): boolean {
  if (a.getUTCFullYear() !== b.getUTCFullYear()) {
    return a.getUTCFullYear() <= b.getUTCFullYear();
  }
  return a.getUTCMonth() <= b.getUTCMonth();
}

/** Advances date by one month (mutates and returns) */
function addOneMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
}

// ── Duplicate check helper ─────────────────────────────────────────────────

/** Returns true if a rent payment already exists for the given tenant/month */
async function invoiceExistsForMonth(
  tenantId: mongoose.Types.ObjectId,
  monthStart: Date,
): Promise<boolean> {
  return !!(await RentPayment.exists({
    tenantId,
    dueDate: { $gte: monthStart, $lt: startOfNextMonth(monthStart) },
  }));
}

// ── Exported service functions ─────────────────────────────────────────────

/**
 * generateRecurringInvoices — Backfill mode (BL-02)
 *
 * Called when a tenant is CREATED with status='Active'.
 * Generates invoices from lease_start through the current month (inclusive).
 * Never generates invoices for future months.
 *
 * Status rule:
 *   dueDate < today → 'Overdue'
 *   dueDate >= today → 'Pending'
 *
 * Skips months where an invoice already exists (idempotent).
 *
 * Returns the count of new invoices created.
 */
export async function generateRecurringInvoices(
  tenantId: mongoose.Types.ObjectId | string,
): Promise<number> {
  const tenant = await Tenant.findById(tenantId).lean();

  // Only generate for Active tenants with a lease start date
  if (!tenant || tenant.status !== 'Active' || !tenant.leaseStart) {
    return 0;
  }

  const tid = new mongoose.Types.ObjectId(tenantId.toString());
  const today = new Date();
  const todayMonthStart = startOfMonth(today);

  // Start at the 1st of the lease_start month
  let current = startOfMonth(tenant.leaseStart);

  // End at the earlier of: current month, or lease_end month
  const leaseEndMonthStart = tenant.leaseEnd ? startOfMonth(tenant.leaseEnd) : todayMonthStart;
  const end = monthLte(leaseEndMonthStart, todayMonthStart) ? leaseEndMonthStart : todayMonthStart;

  let created = 0;

  while (monthLte(current, end)) {
    const duplicate = await invoiceExistsForMonth(tid, current);

    if (!duplicate) {
      const status = current < todayMonthStart ? 'Overdue' : 'Pending';
      await RentPayment.create({
        tenantId: tid,
        propertyId: tenant.propertyId,
        amount: tenant.monthlyRent,
        dueDate: new Date(current),
        status,
      });
      created++;
    }

    current = addOneMonth(current);
  }

  return created;
}

/**
 * generateMonthlyInvoices — Forward mode (BL-02)
 *
 * Called when a tenant is UPDATED (status changed to Active, or lease dates changed).
 * Before generating, deletes all future Pending invoices for the tenant.
 * Then generates from the current month forward, up to 12 months or lease_end.
 *
 * All generated invoices have status 'Pending' (never auto-Overdue in forward mode).
 *
 * Skips months where an invoice already exists after the delete step.
 *
 * Returns the count of new invoices created.
 */
export async function generateMonthlyInvoices(
  tenantId: mongoose.Types.ObjectId | string,
): Promise<number> {
  const tenant = await Tenant.findById(tenantId).lean();

  // Only generate for Active tenants with a lease start date
  if (!tenant || tenant.status !== 'Active' || !tenant.leaseStart) {
    return 0;
  }

  const tid = new mongoose.Types.ObjectId(tenantId.toString());
  const today = new Date();
  const todayMonthStart = startOfMonth(today);

  // Delete all future Pending invoices before regenerating
  await RentPayment.deleteMany({
    tenantId: tid,
    dueDate: { $gt: today },
    status: 'Pending',
  });

  // Start from the current month
  let current = todayMonthStart;

  // End at the earlier of: lease_end month, or today + 12 months
  const twelveMonthsOut = startOfMonth(
    new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 12, 1)),
  );
  const leaseEndMonthStart = tenant.leaseEnd ? startOfMonth(tenant.leaseEnd) : twelveMonthsOut;
  const end = monthLte(leaseEndMonthStart, twelveMonthsOut) ? leaseEndMonthStart : twelveMonthsOut;

  let created = 0;

  while (monthLte(current, end)) {
    const duplicate = await invoiceExistsForMonth(tid, current);

    if (!duplicate) {
      await RentPayment.create({
        tenantId: tid,
        propertyId: tenant.propertyId,
        amount: tenant.monthlyRent,
        dueDate: new Date(current),
        status: 'Pending',
      });
      created++;
    }

    current = addOneMonth(current);
  }

  return created;
}
