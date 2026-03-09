/**
 * Seed owner payments from PHP migration data.
 *
 * STEP 1 — Discover IDs (run without env vars):
 *   npx tsx src/scripts/seedOwnerPayments.ts
 *   → Lists all properties and users with their MongoDB _id values.
 *
 * STEP 2 — Seed (run with env vars after picking the right IDs):
 *   PROP1_ID=<id> PROP6_ID=<id> USER_ID=<id> npx tsx src/scripts/seedOwnerPayments.ts
 *
 * Safe to re-run: skips records that already exist (matched by propertyId + paymentMonth).
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { OwnerPayment } from '../models/owner-payment.model';
import { Property } from '../models/property.model';
import { User } from '../models/user.model';

const MONGO_URI = process.env.MONGO_URI ?? 'mongodb://localhost:27017/property_db';

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB:', MONGO_URI);

  // ── Discovery mode ──────────────────────────────────────────────────────
  const prop1Id = process.env.PROP1_ID;
  const prop6Id = process.env.PROP6_ID;
  const userId = process.env.USER_ID;

  if (!prop1Id || !prop6Id || !userId) {
    console.log('\n─────────────────────────────────────────────');
    console.log('DISCOVERY MODE — pick the IDs you need below');
    console.log('─────────────────────────────────────────────\n');

    const properties = await Property.find({}, '_id propertyName type status').lean();
    console.log('PROPERTIES:');
    properties.forEach((p) =>
      console.log(`  ${String(p._id)}  |  ${p.propertyName}  (${p.type}, ${p.status})`),
    );

    const users = await User.find({}, '_id email role').lean();
    console.log('\nUSERS:');
    users.forEach((u) => console.log(`  ${String(u._id)}  |  ${u.email}  (${u.role})`));

    console.log('\n─────────────────────────────────────────────');
    console.log('Re-run with your chosen IDs:');
    console.log(
      '  PROP1_ID=<property1_id> PROP6_ID=<property6_id> USER_ID=<user_id> npx tsx src/scripts/seedOwnerPayments.ts',
    );
    console.log('─────────────────────────────────────────────\n');
    await mongoose.disconnect();
    return;
  }

  // ── Seed mode ────────────────────────────────────────────────────────────
  const property1 = new mongoose.Types.ObjectId(prop1Id);
  const property6 = new mongoose.Types.ObjectId(prop6Id);
  const user = new mongoose.Types.ObjectId(userId);

  const records = [
    // ── Paid records (PHP ids 14, 15, 16 — payment_month was 0000-00-00,
    //    assigned to Nov 2025 as best-fit since paid_date is 2025-11-17) ──
    {
      propertyId: property1,
      userId: user,
      amount: 5000,
      paymentMonth: new Date('2025-11-01'),
      paidDate: new Date('2025-11-17'),
      paymentMethod: 'Cash' as const,
      status: 'Paid' as const,
      createdAt: new Date('2025-11-17T18:19:31Z'),
    },
    {
      propertyId: property1,
      userId: user,
      amount: 8000,
      paymentMonth: new Date('2025-11-01'),
      paidDate: new Date('2025-11-17'),
      paymentMethod: 'Cash' as const,
      status: 'Paid' as const,
      createdAt: new Date('2025-11-17T18:19:48Z'),
    },
    {
      propertyId: property1,
      userId: user,
      amount: 8000,
      paymentMonth: new Date('2025-11-01'),
      paidDate: new Date('2025-11-17'),
      paymentMethod: 'Bank Transfer' as const,
      status: 'Paid' as const,
      createdAt: new Date('2025-11-17T18:20:11Z'),
    },

    // ── Pending — Property 1, 8000/month (PHP ids 56–68) ──────────────────
    ...[
      '2025-11-01',
      '2025-12-01',
      '2026-01-01',
      '2026-02-01',
      '2026-03-01',
      '2026-04-01',
      '2026-05-01',
      '2026-06-01',
      '2026-07-01',
      '2026-08-01',
      '2026-09-01',
      '2026-10-01',
      '2026-11-01',
    ].map((date) => ({
      propertyId: property1,
      userId: user,
      amount: 8000,
      paymentMonth: new Date(date),
      paymentMethod: 'Bank Transfer' as const,
      status: 'Pending' as const,
      createdAt: new Date('2025-11-17T22:53:26Z'),
    })),

    // ── Pending — Property 6, 6000/month (PHP ids 69–77) ──────────────────
    ...[
      '2025-11-01',
      '2025-12-01',
      '2026-01-01',
      '2026-02-01',
      '2026-03-01',
      '2026-04-01',
      '2026-05-01',
      '2026-06-01',
      '2026-07-01',
    ].map((date) => ({
      propertyId: property6,
      userId: user,
      amount: 6000,
      paymentMonth: new Date(date),
      paymentMethod: 'Bank Transfer' as const,
      status: 'Pending' as const,
      createdAt: new Date('2025-11-17T23:05:11Z'),
    })),
  ];

  let inserted = 0;
  let skipped = 0;

  for (const rec of records) {
    const exists = await OwnerPayment.findOne({
      propertyId: rec.propertyId,
      paymentMonth: rec.paymentMonth,
      amount: rec.amount,
      status: rec.status,
    });
    if (exists) {
      skipped++;
      continue;
    }
    await OwnerPayment.create(rec);
    inserted++;
  }

  console.log(`\nDone — inserted: ${inserted}, skipped (already exist): ${skipped}`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
