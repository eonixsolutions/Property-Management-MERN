/**
 * owner-payment.service.ts
 *
 * Recurring owner payment generation — mirrors PHP's recurring_owner_payments.php.
 *
 * Business rules (BL-05 equivalent for owner payments):
 *   - A property must have owner.name AND owner.monthlyRentAmount > 0
 *   - Generation starts from owner.rentStartDate (or current month if not set)
 *   - Generates up to 12 months forward from start date
 *   - Deduplication: one payment per (propertyId, paymentMonth) — checked via
 *     a 1-month date range query (same as rent invoice dedup)
 *   - Payments always created as 'Pending'
 *
 * Two exported functions:
 *   generateRecurringOwnerPayments(propertyId) — backfill from rentStartDate
 *   generateMonthlyOwnerPayments()              — forward-looking, called by cron
 */

import mongoose from 'mongoose';
import { Property } from '@models/property.model';
import { OwnerPayment } from '@models/owner-payment.model';

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Normalises a date to the 1st of its month at UTC midnight.
 * This is how paymentMonth is stored — makes range dedup safe.
 */
function toMonthStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

/**
 * Returns the first day of the month after the given date.
 */
function nextMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
}

// ── Backfill generation ────────────────────────────────────────────────────

/**
 * generateRecurringOwnerPayments
 *
 * Called when a property is configured with owner payment details.
 * Generates payments from rentStartDate (or now if absent) to +12 months.
 * Skips months where a payment already exists (idempotent).
 *
 * @returns number of new payments created
 */
export async function generateRecurringOwnerPayments(
  propertyId: mongoose.Types.ObjectId | string,
  customStartDate?: Date,
): Promise<number> {
  const property = await Property.findById(propertyId).lean();
  if (!property) return 0;

  const { owner } = property;
  if (!owner?.name || !owner?.monthlyRentAmount || owner.monthlyRentAmount <= 0) return 0;

  const userId = property.userId;
  const amount = owner.monthlyRentAmount;

  // Determine start: customStartDate > owner.rentStartDate > current month
  let start = toMonthStart(customStartDate ?? owner.rentStartDate ?? new Date());
  const end = toMonthStart(new Date());
  // Always go up to +12 months from today
  const limit = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 12, 1));

  // Use start date but no further back than 12 months
  const twelveMonthsBack = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 12, 1));
  if (start < twelveMonthsBack) start = twelveMonthsBack;

  let created = 0;
  let cursor = new Date(start);

  while (cursor < limit) {
    const monthStart = toMonthStart(cursor);
    const monthEnd = nextMonth(cursor);

    // Dedup check: payment already exists for this property+month?
    const exists = await OwnerPayment.exists({
      propertyId: property._id,
      paymentMonth: { $gte: monthStart, $lt: monthEnd },
    });

    if (!exists) {
      await OwnerPayment.create({
        propertyId: property._id,
        userId,
        amount,
        paymentMonth: monthStart,
        status: 'Pending',
      });
      created++;
    }

    cursor = nextMonth(cursor);
  }

  return created;
}

// ── Forward-looking generation (cron) ─────────────────────────────────────

/**
 * generateMonthlyOwnerPayments
 *
 * Called by the monthly cron job on the 1st of each month.
 * Finds all properties with owner payment configured and ensures the
 * current month's payment exists (idempotent via dedup in the per-property call).
 *
 * @returns total number of new payments created
 */
export async function generateMonthlyOwnerPayments(): Promise<number> {
  // Find all properties with a valid owner rental config
  const properties = await Property.find({
    'owner.name': { $exists: true, $ne: '' },
    'owner.monthlyRentAmount': { $gt: 0 },
  })
    .select('_id owner userId')
    .lean();

  let total = 0;
  const now = new Date();

  for (const prop of properties) {
    // Only generate for the current month (forward-looking)
    const count = await generateRecurringOwnerPayments(
      prop._id as mongoose.Types.ObjectId,
      toMonthStart(now),
    );
    total += count;
  }

  return total;
}
