/**
 * Rent payment seed script — migrates legacy PHP rent_payments records into MongoDB.
 *
 * Source: real-cpanel-prov1 MySQL `rent_payments` table (13 rows).
 * Safe to run repeatedly — idempotent (skips rows where tenantId+dueDate already exist).
 *
 * PHP tenant_id=2 → National (Homagama) → Unit 2
 * PHP property_id=3 → Unit 2
 *
 * Usage:
 *   npm run seed:rent-payments
 *   # or directly:
 *   npx tsx src/scripts/seed-rent-payments.ts
 */

import 'dotenv/config';

import { connectDB, disconnectDB } from '@config/database';
import { Tenant } from '@models/tenant.model';
import { RentPayment } from '@models/rent-payment.model';
import { logger } from '@utils/logger';

// ── Raw PHP data ─────────────────────────────────────────────────────────────

interface PhpRentPayment {
  /** PHP tenant reference — resolved by name */
  phpTenantFirstName: string;
  phpTenantLastName: string;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  paidDate: string | null;
  chequeNumber: string | null;
  paymentMethod:
    | 'Cash'
    | 'Cheque'
    | 'Bank Transfer'
    | 'Credit Card'
    | 'Debit Card'
    | 'Online Transfer'
    | 'Other'
    | null;
  status: 'Pending' | 'Paid' | 'Overdue' | 'Partial';
  referenceNumber: string | null;
  notes: string | null;
}

const phpRows: PhpRentPayment[] = [
  {
    phpTenantFirstName: 'National',
    phpTenantLastName: '(Homagama)',
    amount: 1800,
    dueDate: '2025-11-01',
    paidDate: null,
    chequeNumber: null,
    paymentMethod: 'Cash',
    status: 'Pending',
    referenceNumber: null,
    notes: null,
  },
  {
    phpTenantFirstName: 'National',
    phpTenantLastName: '(Homagama)',
    amount: 1800,
    dueDate: '2025-12-01',
    paidDate: null,
    chequeNumber: null,
    paymentMethod: 'Cash',
    status: 'Pending',
    referenceNumber: null,
    notes: null,
  },
  {
    phpTenantFirstName: 'National',
    phpTenantLastName: '(Homagama)',
    amount: 1800,
    dueDate: '2026-01-01',
    paidDate: null,
    chequeNumber: null,
    paymentMethod: 'Cash',
    status: 'Pending',
    referenceNumber: null,
    notes: null,
  },
  {
    phpTenantFirstName: 'National',
    phpTenantLastName: '(Homagama)',
    amount: 1800,
    dueDate: '2026-02-01',
    paidDate: null,
    chequeNumber: null,
    paymentMethod: 'Cash',
    status: 'Pending',
    referenceNumber: null,
    notes: null,
  },
  {
    phpTenantFirstName: 'National',
    phpTenantLastName: '(Homagama)',
    amount: 1800,
    dueDate: '2026-03-01',
    paidDate: null,
    chequeNumber: null,
    paymentMethod: 'Cash',
    status: 'Pending',
    referenceNumber: null,
    notes: null,
  },
  {
    phpTenantFirstName: 'National',
    phpTenantLastName: '(Homagama)',
    amount: 1800,
    dueDate: '2026-04-01',
    paidDate: null,
    chequeNumber: null,
    paymentMethod: 'Cash',
    status: 'Pending',
    referenceNumber: null,
    notes: null,
  },
  {
    phpTenantFirstName: 'National',
    phpTenantLastName: '(Homagama)',
    amount: 1800,
    dueDate: '2026-05-01',
    paidDate: null,
    chequeNumber: null,
    paymentMethod: 'Cash',
    status: 'Pending',
    referenceNumber: null,
    notes: null,
  },
  {
    phpTenantFirstName: 'National',
    phpTenantLastName: '(Homagama)',
    amount: 1800,
    dueDate: '2026-06-01',
    paidDate: null,
    chequeNumber: null,
    paymentMethod: 'Cash',
    status: 'Pending',
    referenceNumber: null,
    notes: null,
  },
  {
    phpTenantFirstName: 'National',
    phpTenantLastName: '(Homagama)',
    amount: 1800,
    dueDate: '2026-07-01',
    paidDate: null,
    chequeNumber: null,
    paymentMethod: 'Cash',
    status: 'Pending',
    referenceNumber: null,
    notes: null,
  },
  {
    phpTenantFirstName: 'National',
    phpTenantLastName: '(Homagama)',
    amount: 1800,
    dueDate: '2026-08-01',
    paidDate: null,
    chequeNumber: null,
    paymentMethod: 'Cash',
    status: 'Pending',
    referenceNumber: null,
    notes: null,
  },
  {
    phpTenantFirstName: 'National',
    phpTenantLastName: '(Homagama)',
    amount: 1800,
    dueDate: '2026-09-01',
    paidDate: null,
    chequeNumber: null,
    paymentMethod: 'Cash',
    status: 'Pending',
    referenceNumber: null,
    notes: null,
  },
  {
    phpTenantFirstName: 'National',
    phpTenantLastName: '(Homagama)',
    amount: 1800,
    dueDate: '2026-10-01',
    paidDate: null,
    chequeNumber: null,
    paymentMethod: 'Cash',
    status: 'Pending',
    referenceNumber: null,
    notes: null,
  },
  {
    phpTenantFirstName: 'National',
    phpTenantLastName: '(Homagama)',
    amount: 1800,
    dueDate: '2026-11-01',
    paidDate: null,
    chequeNumber: null,
    paymentMethod: 'Cash',
    status: 'Pending',
    referenceNumber: null,
    notes: null,
  },
];

// ── Seed function ─────────────────────────────────────────────────────────────

async function seedRentPayments(): Promise<void> {
  let inserted = 0;
  let skipped = 0;

  // Cache tenant lookups so we don't repeat queries for the same tenant
  const tenantCache = new Map<string, { tenantId: string; propertyId: string } | null>();

  for (const row of phpRows) {
    const cacheKey = `${row.phpTenantFirstName}|${row.phpTenantLastName}`;

    // 1. Resolve tenant from MongoDB (cached)
    if (!tenantCache.has(cacheKey)) {
      const tenant = await Tenant.findOne({
        firstName: row.phpTenantFirstName,
        lastName: row.phpTenantLastName,
      }).lean();

      tenantCache.set(
        cacheKey,
        tenant
          ? { tenantId: tenant._id.toString(), propertyId: tenant.propertyId.toString() }
          : null,
      );
    }

    const tenantInfo = tenantCache.get(cacheKey);
    if (!tenantInfo) {
      logger.warn(
        { name: `${row.phpTenantFirstName} ${row.phpTenantLastName}` },
        '⚠️  Tenant not found — run seed:tenants first. Skipping rent payment.',
      );
      skipped++;
      continue;
    }

    const { tenantId, propertyId } = tenantInfo;
    const dueDate = new Date(row.dueDate);

    // 2. Idempotency — skip if this dueDate already exists for this tenant
    const existing = await RentPayment.findOne({ tenantId, dueDate }).lean();
    if (existing) {
      logger.info({ tenantId, dueDate: row.dueDate }, 'Rent payment already exists — skipping');
      skipped++;
      continue;
    }

    // 3. Insert
    await RentPayment.create({
      tenantId,
      propertyId,
      amount: row.amount,
      dueDate,
      paidDate: row.paidDate ? new Date(row.paidDate) : undefined,
      chequeNumber: row.chequeNumber ?? undefined,
      paymentMethod: row.paymentMethod ?? undefined,
      status: row.status,
      referenceNumber: row.referenceNumber ?? undefined,
      notes: row.notes ?? undefined,
    });

    logger.info(
      { tenantId, dueDate: row.dueDate, amount: row.amount },
      '✅  Inserted rent payment',
    );
    inserted++;
  }

  logger.info({ inserted, skipped }, '💰  Rent payment seed complete');
}

// ── Entry point ───────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  try {
    await connectDB();
    await seedRentPayments();
  } catch (err) {
    logger.error({ err }, '❌  Rent payment seed failed');
    process.exitCode = 1;
  } finally {
    await disconnectDB();
  }
}

void main();
