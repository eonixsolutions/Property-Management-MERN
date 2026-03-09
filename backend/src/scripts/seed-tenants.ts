/**
 * Tenant seed script — migrates legacy PHP tenant records into MongoDB.
 *
 * Source: real-cpanel-prov1 MySQL `tenants` table (2 rows).
 * Safe to run repeatedly — idempotent (skips rows where firstName+lastName+propertyId already exist).
 *
 * PHP property_id mapping (resolved by propertyName):
 *   PHP id=2  →  "Unit 1"   (unit under Thumama Villa 21)
 *   PHP id=3  →  "Unit 2"   (unit under Thumama Villa 21)
 *
 * Usage:
 *   npm run seed:tenants
 *   # or directly:
 *   npx tsx src/scripts/seed-tenants.ts
 */

import 'dotenv/config';

import { connectDB, disconnectDB } from '@config/database';
import { Property } from '@models/property.model';
import { Tenant } from '@models/tenant.model';
import { logger } from '@utils/logger';
import mongoose from 'mongoose';

// ── PHP row type ────────────────────────────────────────────────────────────

interface PhpTenant {
  phpPropertyName: string; // resolved name instead of raw PHP id
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  alternatePhone: string | null;
  qatarId: string | null;
  moveInDate: string | null;
  moveOutDate: string | null;
  leaseStart: string | null;
  leaseEnd: string | null;
  monthlyRent: number;
  securityDeposit: number | null;
  status: 'Active' | 'Past' | 'Pending';
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  notes: string | null;
}

// ── Raw PHP data ────────────────────────────────────────────────────────────

const phpRows: PhpTenant[] = [
  {
    // PHP id=1, property_id=2 → "Unit 1"
    phpPropertyName: 'Unit 1',
    firstName: 'Sidheeque',
    lastName: 'Kunnath',
    email: 'sidhyk@gmail.com',
    phone: '54578712',
    alternatePhone: '54578712',
    qatarId: '28835604643',
    moveInDate: null,
    moveOutDate: null,
    leaseStart: null,
    leaseEnd: null,
    monthlyRent: 1800,
    securityDeposit: null,
    status: 'Active',
    emergencyContactName: null,
    emergencyContactPhone: null,
    notes: null,
  },
  {
    // PHP id=2, property_id=3 → "Unit 2"
    phpPropertyName: 'Unit 2',
    firstName: 'National',
    lastName: '(Homagama)',
    email: 'sidhykdsd@gmail.com',
    phone: null,
    alternatePhone: null,
    qatarId: null,
    moveInDate: '2025-10-01',
    moveOutDate: null,
    leaseStart: '2025-11-01',
    leaseEnd: '2026-11-01',
    monthlyRent: 1800,
    securityDeposit: null,
    status: 'Active',
    emergencyContactName: null,
    emergencyContactPhone: null,
    notes: null,
  },
];

// ── Seed function ───────────────────────────────────────────────────────────

async function seedTenants(): Promise<void> {
  let inserted = 0;
  let skipped = 0;

  for (const row of phpRows) {
    // 1. Resolve MongoDB property by name
    const property = await Property.findOne({ propertyName: row.phpPropertyName }).lean();
    if (!property) {
      logger.warn(
        { phpPropertyName: row.phpPropertyName },
        '⚠️  Property not found — run seed:properties first. Skipping tenant.',
      );
      skipped++;
      continue;
    }

    const propertyId = property._id as mongoose.Types.ObjectId;

    // 2. Idempotency check — skip if tenant already exists for this property
    const existing = await Tenant.findOne({
      propertyId,
      firstName: row.firstName,
      lastName: row.lastName,
    }).lean();

    if (existing) {
      logger.info(
        { name: `${row.firstName} ${row.lastName}`, property: row.phpPropertyName },
        'Tenant already exists — skipping',
      );
      skipped++;
      continue;
    }

    // 3. Insert — using .save() so post-save hook fires and updates property status
    const tenant = new Tenant({
      propertyId,
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email ?? undefined,
      phone: row.phone ?? undefined,
      alternatePhone: row.alternatePhone ?? undefined,
      qatarId: row.qatarId ?? undefined,
      moveInDate: row.moveInDate ? new Date(row.moveInDate) : undefined,
      moveOutDate: row.moveOutDate ? new Date(row.moveOutDate) : undefined,
      leaseStart: row.leaseStart ? new Date(row.leaseStart) : undefined,
      leaseEnd: row.leaseEnd ? new Date(row.leaseEnd) : undefined,
      monthlyRent: row.monthlyRent,
      securityDeposit: row.securityDeposit ?? undefined,
      status: row.status,
      emergencyContact:
        row.emergencyContactName || row.emergencyContactPhone
          ? {
              name: row.emergencyContactName ?? undefined,
              phone: row.emergencyContactPhone ?? undefined,
            }
          : undefined,
      notes: row.notes ?? undefined,
    });

    await tenant.save(); // triggers post-save hook → updatePropertyStatus()

    logger.info(
      { name: `${row.firstName} ${row.lastName}`, property: row.phpPropertyName, _id: tenant._id },
      '✅  Inserted tenant',
    );
    inserted++;
  }

  logger.info({ inserted, skipped }, '👤  Tenant seed complete');
}

// ── Entry point ─────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  try {
    await connectDB();
    await seedTenants();
  } catch (err) {
    logger.error({ err }, '❌  Tenant seed failed');
    process.exitCode = 1;
  } finally {
    await disconnectDB();
  }
}

void main();
