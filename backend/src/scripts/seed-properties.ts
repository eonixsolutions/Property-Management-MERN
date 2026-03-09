/**
 * Property seed script — migrates legacy PHP property records into MongoDB.
 *
 * Source: real-cpanel-prov1 MySQL `properties` table (6 rows).
 * Safe to run repeatedly — idempotent (skips rows whose propertyName already exists).
 *
 * Usage:
 *   npm run seed:properties
 *   # or directly:
 *   npx tsx src/scripts/seed-properties.ts
 */

import 'dotenv/config';

import { connectDB, disconnectDB } from '@config/database';
import { Property } from '@models/property.model';
import { User, UserRole } from '@models/user.model';
import { logger } from '@utils/logger';
import mongoose from 'mongoose';

// ── PHP row type ────────────────────────────────────────────────────────────

interface PhpProperty {
  phpId: number;
  phpParentId: number | null;
  isUnit: boolean;
  unitName: string | null;
  ownerName: string | null;
  ownerContact: string | null;
  ownerEmail: string | null;
  ownerPhone: string | null;
  monthlyRentToOwner: number | null;
  propertyName: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  country: string | null;
  propertyType: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  squareFeet: number | null;
  purchasePrice: number | null;
  currentValue: number | null;
  purchaseDate: string | null;
  defaultRent: number | null;
  status: 'Vacant' | 'Occupied' | 'Under Maintenance';
  notes: string | null;
  contactNumber: string | null;
}

// ── Raw PHP data (as-is from the MySQL dump) ───────────────────────────────

const phpRows: PhpProperty[] = [
  {
    phpId: 1,
    phpParentId: null,
    isUnit: false,
    unitName: null,
    ownerName: 'Sulthan',
    ownerContact: null,
    ownerEmail: 'sidhyk@gmail.com',
    ownerPhone: null,
    monthlyRentToOwner: 8000,
    propertyName: 'Thumama Villa 21',
    address: 'Doha Qatar',
    city: 'Nuaija',
    state: 'Doha',
    zipCode: '610',
    country: 'Qatar',
    propertyType: 'House',
    bedrooms: 6,
    bathrooms: 6,
    squareFeet: null,
    purchasePrice: null,
    currentValue: null,
    purchaseDate: null,
    defaultRent: null,
    status: 'Vacant',
    notes: null,
    contactNumber: null,
  },
  {
    phpId: 2,
    phpParentId: 1,
    isUnit: true,
    unitName: '1',
    ownerName: null,
    ownerContact: null,
    ownerEmail: null,
    ownerPhone: null,
    monthlyRentToOwner: null,
    propertyName: 'Unit 1',
    address: 'Doha Qatar',
    city: 'pitipana',
    state: 'Qa',
    zipCode: '610',
    country: 'USA',
    propertyType: 'Apartment',
    bedrooms: 1,
    bathrooms: 1,
    squareFeet: null,
    purchasePrice: null,
    currentValue: null,
    purchaseDate: null,
    defaultRent: 1800,
    status: 'Occupied',
    notes: null,
    contactNumber: null,
  },
  {
    phpId: 3,
    phpParentId: 1,
    isUnit: true,
    unitName: '2',
    ownerName: null,
    ownerContact: null,
    ownerEmail: null,
    ownerPhone: null,
    monthlyRentToOwner: null,
    propertyName: 'Unit 2',
    address: 'Doha Qatar',
    city: 'pitipana',
    state: 'Qa',
    zipCode: '610',
    country: 'USA',
    propertyType: 'Apartment',
    bedrooms: 1,
    bathrooms: 1,
    squareFeet: null,
    purchasePrice: null,
    currentValue: null,
    purchaseDate: null,
    defaultRent: 1800,
    status: 'Occupied',
    notes: null,
    contactNumber: null,
  },
  {
    phpId: 5,
    phpParentId: 1,
    isUnit: true,
    unitName: '3',
    ownerName: null,
    ownerContact: null,
    ownerEmail: null,
    ownerPhone: null,
    monthlyRentToOwner: null,
    propertyName: 'unit 3',
    address: 'Doha Qatar',
    city: 'pitipana',
    state: 'Qa',
    zipCode: '610',
    country: 'USA',
    propertyType: 'Apartment',
    bedrooms: 2,
    bathrooms: 2,
    squareFeet: null,
    purchasePrice: null,
    currentValue: null,
    purchaseDate: null,
    defaultRent: 2800,
    status: 'Vacant',
    notes: null,
    contactNumber: null,
  },
  {
    phpId: 6,
    phpParentId: null,
    isUnit: false,
    unitName: null,
    ownerName: 'Thameem',
    ownerContact: 'Doha Qatar',
    ownerEmail: 'sidhykdsd@gmail.com',
    ownerPhone: '+97454578712',
    monthlyRentToOwner: 6000,
    propertyName: 'Villa Mathar',
    address: 'Doha Qatar',
    city: 'Rayyan',
    state: 'Doha',
    zipCode: 'Qatar',
    country: 'Qatar',
    propertyType: 'House',
    bedrooms: 10,
    bathrooms: 10,
    squareFeet: null,
    purchasePrice: null,
    currentValue: null,
    purchaseDate: null,
    defaultRent: null,
    status: 'Vacant',
    notes: null,
    contactNumber: null,
  },
  {
    phpId: 7,
    phpParentId: 6,
    isUnit: true,
    unitName: '1',
    ownerName: null,
    ownerContact: null,
    ownerEmail: null,
    ownerPhone: null,
    monthlyRentToOwner: null,
    propertyName: 'Unit1',
    address: 'Doha Qatar',
    city: 'Rayyan',
    state: 'Doha',
    zipCode: 'USA',
    country: 'Qatar',
    propertyType: 'House',
    bedrooms: 1,
    bathrooms: 1,
    squareFeet: null,
    purchasePrice: null,
    currentValue: null,
    purchaseDate: null,
    defaultRent: 1800,
    status: 'Vacant',
    notes: null,
    contactNumber: null,
  },
];

// ── Seed function ───────────────────────────────────────────────────────────

async function seedProperties(): Promise<void> {
  // 1. Resolve owner user — must be SUPER_ADMIN
  const adminUser = await User.findOne({ role: UserRole.SUPER_ADMIN }).lean();
  if (!adminUser) {
    throw new Error('No SUPER_ADMIN user found. Run `npm run seed` first.');
  }
  const userId = adminUser._id as mongoose.Types.ObjectId;
  logger.info({ email: adminUser.email }, 'Using SUPER_ADMIN as property owner');

  // 2. Separate masters and units
  const masters = phpRows.filter((r) => !r.isUnit);
  const units = phpRows.filter((r) => r.isUnit);

  // 3. Map: PHP id → MongoDB ObjectId (built as we insert)
  const idMap = new Map<number, mongoose.Types.ObjectId>();

  let inserted = 0;
  let skipped = 0;

  // 4. Insert masters first
  for (const row of masters) {
    const existing = await Property.findOne({ propertyName: row.propertyName, userId }).lean();
    if (existing) {
      logger.info({ propertyName: row.propertyName }, 'Already exists — skipping');
      idMap.set(row.phpId, existing._id as mongoose.Types.ObjectId);
      skipped++;
      continue;
    }

    const doc = await Property.create({
      userId,
      type: 'master',
      parentPropertyId: null,
      unitName: undefined,
      owner: {
        name: row.ownerName ?? undefined,
        contact: row.ownerContact ?? undefined,
        email: row.ownerEmail ?? undefined,
        phone: row.ownerPhone ?? undefined,
        monthlyRentAmount: row.monthlyRentToOwner ?? undefined,
      },
      propertyName: row.propertyName,
      address: row.address ?? undefined,
      city: row.city ?? undefined,
      state: row.state ?? undefined,
      zipCode: row.zipCode ?? undefined,
      country: row.country ?? 'Qatar',
      propertyType: row.propertyType ?? undefined,
      bedrooms: row.bedrooms ?? undefined,
      bathrooms: row.bathrooms ?? undefined,
      squareFeet: row.squareFeet ?? undefined,
      purchasePrice: row.purchasePrice ?? undefined,
      currentValue: row.currentValue ?? undefined,
      purchaseDate: row.purchaseDate ? new Date(row.purchaseDate) : undefined,
      defaultRent: row.defaultRent ?? undefined,
      status: row.status,
      notes: row.notes ?? undefined,
      contactNumber: row.contactNumber ?? undefined,
    });

    idMap.set(row.phpId, doc._id as mongoose.Types.ObjectId);
    logger.info({ propertyName: row.propertyName, _id: doc._id }, '✅  Inserted master');
    inserted++;
  }

  // 5. Insert units (parent IDs now resolved)
  for (const row of units) {
    const existing = await Property.findOne({ propertyName: row.propertyName, userId }).lean();
    if (existing) {
      logger.info({ propertyName: row.propertyName }, 'Already exists — skipping');
      skipped++;
      continue;
    }

    const parentMongoId = row.phpParentId !== null ? idMap.get(row.phpParentId) : undefined;
    if (!parentMongoId) {
      logger.warn(
        { propertyName: row.propertyName, phpParentId: row.phpParentId },
        '⚠️  Parent not found in idMap — inserting without parent',
      );
    }

    const doc = await Property.create({
      userId,
      type: 'unit',
      parentPropertyId: parentMongoId ?? null,
      unitName: row.unitName ?? undefined,
      owner: {},
      propertyName: row.propertyName,
      address: row.address ?? undefined,
      city: row.city ?? undefined,
      state: row.state ?? undefined,
      zipCode: row.zipCode ?? undefined,
      country: row.country ?? 'Qatar',
      propertyType: row.propertyType ?? undefined,
      bedrooms: row.bedrooms ?? undefined,
      bathrooms: row.bathrooms ?? undefined,
      squareFeet: row.squareFeet ?? undefined,
      purchasePrice: row.purchasePrice ?? undefined,
      currentValue: row.currentValue ?? undefined,
      purchaseDate: row.purchaseDate ? new Date(row.purchaseDate) : undefined,
      defaultRent: row.defaultRent ?? undefined,
      status: row.status,
      notes: row.notes ?? undefined,
      contactNumber: row.contactNumber ?? undefined,
    });

    logger.info(
      { propertyName: row.propertyName, _id: doc._id, parentMongoId },
      '✅  Inserted unit',
    );
    inserted++;
  }

  logger.info({ inserted, skipped }, '🏠  Property seed complete');
}

// ── Entry point ─────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  try {
    await connectDB();
    await seedProperties();
  } catch (err) {
    logger.error({ err }, '❌  Property seed failed');
    process.exitCode = 1;
  } finally {
    await disconnectDB();
  }
}

void main();
