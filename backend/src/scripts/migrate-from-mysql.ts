/**
 * migrate-from-mysql.ts
 *
 * Migrates real data from the PHP/MySQL property_db into MongoDB.
 *
 * What it does:
 *  1. Clears ALL collections except `users` and `settings`
 *  2. Loads the SUPER_ADMIN user ObjectId
 *  3. Inserts properties, tenants, rent payments, owner payments,
 *     transactions, and documents — preserving all relationships
 *     via an id→ObjectId mapping table
 *
 * Run:
 *   cd backend
 *   npx tsx src/scripts/migrate-from-mysql.ts
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/database';
import { User } from '../models/user.model';
import { Property } from '../models/property.model';
import { Tenant } from '../models/tenant.model';
import { RentPayment } from '../models/rent-payment.model';
import { OwnerPayment } from '../models/owner-payment.model';
import { Transaction } from '../models/transaction.model';
import { Document } from '../models/document.model';

// ── Helpers ────────────────────────────────────────────────────────────────

function d(dateStr: string | null): Date | undefined {
  if (!dateStr || dateStr === '0000-00-00') return undefined;
  const dt = new Date(dateStr);
  return isNaN(dt.getTime()) ? undefined : dt;
}

/** Map MySQL enum 'Check' → 'Cheque' for payment_method */
function payMethod(m: string | null): string {
  if (!m) return 'Cash';
  return m === 'Check' ? 'Cheque' : m;
}

// ── Main ───────────────────────────────────────────────────────────────────

async function migrate() {
  await connectDB();
  console.log('✅ Connected to MongoDB\n');

  // ── 1. Get admin user ────────────────────────────────────────────────────
  const admin = await User.findOne({ role: 'SUPER_ADMIN' }).lean();
  if (!admin) {
    console.error('❌ No SUPER_ADMIN user found. Run npm run seed first.');
    process.exit(1);
  }
  const adminId = admin._id as mongoose.Types.ObjectId;
  console.log(`👤 Admin user: ${admin.email} (${adminId})\n`);

  // ── 2. Clear all collections except users & settings ────────────────────
  await Promise.all([
    Property.deleteMany({}),
    Tenant.deleteMany({}),
    RentPayment.deleteMany({}),
    OwnerPayment.deleteMany({}),
    Transaction.deleteMany({}),
    Document.deleteMany({}),
  ]);
  console.log(
    '🗑️  Cleared: properties, tenants, rent_payments, owner_payments, transactions, documents\n',
  );

  // ── 3. ID → ObjectId maps (MySQL int → Mongo ObjectId) ──────────────────
  const propMap = new Map<number, mongoose.Types.ObjectId>();
  const tenantMap = new Map<number, mongoose.Types.ObjectId>();

  // ── 4. Insert properties ─────────────────────────────────────────────────
  // Master properties first (no parentPropertyId dependency)
  // PHP data: is_unit=0 → type:'master', is_unit=1 → type:'unit'

  const phpProperties = [
    // id, user_id, parent_id, unit_name, is_unit, owner_name, owner_contact, owner_email, owner_phone,
    // monthly_rent_to_owner, property_name, address, city, state, zip, country,
    // property_type, bedrooms, bathrooms, square_feet, purchase_price, current_value,
    // purchase_date, default_rent, status, notes
    {
      id: 1,
      parentId: null,
      unitName: null,
      isUnit: false,
      ownerName: 'Sulthan',
      ownerContact: null,
      ownerEmail: 'sidhyk@gmail.com',
      ownerPhone: null,
      monthlyRentOwner: 8000,
      name: 'Thumama Villa 21',
      address: 'Doha Qatar',
      city: 'Nuaija',
      state: 'Doha',
      zip: '610',
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
      notes: '',
    },
    {
      id: 6,
      parentId: null,
      unitName: null,
      isUnit: false,
      ownerName: 'Thameem',
      ownerContact: 'Doha Qatar',
      ownerEmail: 'sidhykdsd@gmail.com',
      ownerPhone: '+97454578712',
      monthlyRentOwner: 6000,
      name: 'Villa Mathar',
      address: 'Doha Qatar',
      city: 'Rayyan',
      state: 'Doha',
      zip: '',
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
      notes: '',
    },
    // Units
    {
      id: 2,
      parentId: 1,
      unitName: '1',
      isUnit: true,
      ownerName: null,
      ownerContact: null,
      ownerEmail: null,
      ownerPhone: null,
      monthlyRentOwner: null,
      name: 'Unit 1',
      address: 'Doha Qatar',
      city: 'Nuaija',
      state: 'Doha',
      zip: '610',
      country: 'Qatar',
      propertyType: 'Apartment',
      bedrooms: 1,
      bathrooms: 1,
      squareFeet: null,
      purchasePrice: null,
      currentValue: null,
      purchaseDate: null,
      defaultRent: 1800,
      status: 'Occupied',
      notes: '',
    },
    {
      id: 3,
      parentId: 1,
      unitName: '2',
      isUnit: true,
      ownerName: null,
      ownerContact: null,
      ownerEmail: null,
      ownerPhone: null,
      monthlyRentOwner: null,
      name: 'Unit 2',
      address: 'Doha Qatar',
      city: 'Nuaija',
      state: 'Doha',
      zip: '610',
      country: 'Qatar',
      propertyType: 'Apartment',
      bedrooms: 1,
      bathrooms: 1,
      squareFeet: null,
      purchasePrice: null,
      currentValue: null,
      purchaseDate: null,
      defaultRent: 1800,
      status: 'Occupied',
      notes: '',
    },
    {
      id: 5,
      parentId: 1,
      unitName: '3',
      isUnit: true,
      ownerName: null,
      ownerContact: null,
      ownerEmail: null,
      ownerPhone: null,
      monthlyRentOwner: null,
      name: 'unit 3',
      address: 'Doha Qatar',
      city: 'Nuaija',
      state: 'Doha',
      zip: '610',
      country: 'Qatar',
      propertyType: 'Apartment',
      bedrooms: 2,
      bathrooms: 2,
      squareFeet: null,
      purchasePrice: null,
      currentValue: null,
      purchaseDate: null,
      defaultRent: 2800,
      status: 'Vacant',
      notes: '',
    },
    {
      id: 7,
      parentId: 6,
      unitName: '1',
      isUnit: true,
      ownerName: null,
      ownerContact: null,
      ownerEmail: null,
      ownerPhone: null,
      monthlyRentOwner: null,
      name: 'Unit1',
      address: 'Doha Qatar',
      city: 'Rayyan',
      state: 'Doha',
      zip: '',
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
      notes: '',
    },
  ];

  // Image files available locally (copied from PHP project)
  // These were associated with Unit 1 (PHP property id=2)
  const phpPropertyImages: Record<number, Array<{ filename: string; isPrimary: boolean }>> = {
    2: [
      { filename: 'prop_2_69417bbb9638b6.05254056.png', isPrimary: true },
      { filename: 'prop_2_69417bc0659754.91567509.png', isPrimary: false },
    ],
  };

  // Insert masters first (so parentPropertyId refs are available)
  const sorted = [...phpProperties].sort((a) => (a.isUnit ? 1 : -1));

  for (const p of sorted) {
    const parentObjectId = p.parentId ? (propMap.get(p.parentId) ?? null) : null;
    const images = (phpPropertyImages[p.id] ?? []).map((img) => ({
      url: `uploads/properties/${img.filename}`,
      filename: img.filename,
      isPrimary: img.isPrimary,
      uploadedAt: new Date(),
    }));

    const doc = await Property.create({
      userId: adminId,
      type: p.isUnit ? 'unit' : 'master',
      parentPropertyId: parentObjectId,
      unitName: p.unitName ?? undefined,
      owner: {
        name: p.ownerName ?? undefined,
        contact: p.ownerContact ?? undefined,
        email: p.ownerEmail ?? undefined,
        phone: p.ownerPhone ?? undefined,
        monthlyRentAmount: p.monthlyRentOwner ?? undefined,
      },
      propertyName: p.name,
      address: p.address,
      city: p.city,
      state: p.state,
      zipCode: p.zip || undefined,
      country: p.country,
      propertyType: p.propertyType,
      bedrooms: p.bedrooms ?? undefined,
      bathrooms: p.bathrooms ?? undefined,
      squareFeet: p.squareFeet ?? undefined,
      purchasePrice: p.purchasePrice ?? undefined,
      currentValue: p.currentValue ?? undefined,
      purchaseDate: d(p.purchaseDate),
      defaultRent: p.defaultRent ?? undefined,
      status: p.status as 'Vacant' | 'Occupied' | 'Under Maintenance',
      notes: p.notes || undefined,
      images,
    });
    propMap.set(p.id, doc._id as mongoose.Types.ObjectId);
    console.log(`  🏠 Property [${p.id}] "${p.name}" → ${doc._id}`);
  }
  console.log(`\n✅ ${phpProperties.length} properties inserted\n`);

  // ── 5. Insert tenants ──────────────────────────────────────────────────────
  const phpTenants = [
    {
      id: 1,
      propertyId: 2,
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
      emergencyName: '',
      emergencyPhone: '',
      notes: '',
      createdAt: '2025-11-17T14:05:19Z',
    },
    {
      id: 2,
      propertyId: 3,
      firstName: 'National',
      lastName: '(Homagama)',
      email: 'sidhykdsd@gmail.com',
      phone: '',
      alternatePhone: '',
      qatarId: '',
      moveInDate: '2025-10-01',
      moveOutDate: null,
      leaseStart: '2025-11-01',
      leaseEnd: '2026-11-01',
      monthlyRent: 1800,
      securityDeposit: null,
      status: 'Active',
      emergencyName: '',
      emergencyPhone: '',
      notes: '',
      createdAt: '2025-11-17T17:36:41Z',
    },
  ];

  for (const t of phpTenants) {
    const propertyObjectId = propMap.get(t.propertyId);
    if (!propertyObjectId) {
      console.warn(`  ⚠️  Tenant [${t.id}] — property ${t.propertyId} not found, skipping`);
      continue;
    }
    const doc = await Tenant.create({
      propertyId: propertyObjectId,
      firstName: t.firstName,
      lastName: t.lastName,
      email: t.email || undefined,
      phone: t.phone || undefined,
      alternatePhone: t.alternatePhone || undefined,
      qatarId: t.qatarId || undefined,
      moveInDate: d(t.moveInDate),
      moveOutDate: d(t.moveOutDate),
      leaseStart: d(t.leaseStart),
      leaseEnd: d(t.leaseEnd),
      monthlyRent: t.monthlyRent,
      securityDeposit: t.securityDeposit ?? undefined,
      status: t.status as 'Active' | 'Past' | 'Pending',
      emergencyContact: {
        name: t.emergencyName || undefined,
        phone: t.emergencyPhone || undefined,
      },
      notes: t.notes || undefined,
    });
    tenantMap.set(t.id, doc._id as mongoose.Types.ObjectId);
    console.log(`  👤 Tenant [${t.id}] "${t.firstName} ${t.lastName}" → ${doc._id}`);
  }
  console.log(`\n✅ ${phpTenants.length} tenants inserted\n`);

  // ── 6. Insert rent payments ───────────────────────────────────────────────
  // All for tenant 2 / property 3
  const rentDueDates = [
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
  ];

  const tenantObjId2 = tenantMap.get(2);
  const propObjId3 = propMap.get(3);

  if (tenantObjId2 && propObjId3) {
    const rentDocs = rentDueDates.map((dd) => ({
      tenantId: tenantObjId2,
      propertyId: propObjId3,
      amount: 1800,
      dueDate: new Date(dd),
      paidDate: undefined,
      paymentMethod: 'Cash',
      status: 'Pending' as const,
    }));
    await RentPayment.insertMany(rentDocs);
    console.log(`✅ ${rentDocs.length} rent payments inserted\n`);
  }

  // ── 7. Insert owner payments ──────────────────────────────────────────────
  // Skip records with invalid payment_month (0000-00-00) — IDs 14,15,16
  type OwnerPaymentStatus = 'Pending' | 'Paid' | 'Overdue';

  const phpOwnerPayments: Array<{
    propertyId: number;
    amount: number;
    paymentMonth: string;
    paidDate: string | null;
    paymentMethod: string;
    status: OwnerPaymentStatus;
  }> = [
    // Property 1 (Thumama Villa 21) — monthly from Nov 2025 to Nov 2026
    {
      propertyId: 1,
      amount: 8000,
      paymentMonth: '2025-11-01',
      paidDate: null,
      paymentMethod: 'Bank Transfer',
      status: 'Pending',
    },
    {
      propertyId: 1,
      amount: 8000,
      paymentMonth: '2025-12-01',
      paidDate: null,
      paymentMethod: 'Bank Transfer',
      status: 'Pending',
    },
    {
      propertyId: 1,
      amount: 8000,
      paymentMonth: '2026-01-01',
      paidDate: null,
      paymentMethod: 'Bank Transfer',
      status: 'Pending',
    },
    {
      propertyId: 1,
      amount: 8000,
      paymentMonth: '2026-02-01',
      paidDate: null,
      paymentMethod: 'Bank Transfer',
      status: 'Pending',
    },
    {
      propertyId: 1,
      amount: 8000,
      paymentMonth: '2026-03-01',
      paidDate: null,
      paymentMethod: 'Bank Transfer',
      status: 'Pending',
    },
    {
      propertyId: 1,
      amount: 8000,
      paymentMonth: '2026-04-01',
      paidDate: null,
      paymentMethod: 'Bank Transfer',
      status: 'Pending',
    },
    {
      propertyId: 1,
      amount: 8000,
      paymentMonth: '2026-05-01',
      paidDate: null,
      paymentMethod: 'Bank Transfer',
      status: 'Pending',
    },
    {
      propertyId: 1,
      amount: 8000,
      paymentMonth: '2026-06-01',
      paidDate: null,
      paymentMethod: 'Bank Transfer',
      status: 'Pending',
    },
    {
      propertyId: 1,
      amount: 8000,
      paymentMonth: '2026-07-01',
      paidDate: null,
      paymentMethod: 'Bank Transfer',
      status: 'Pending',
    },
    {
      propertyId: 1,
      amount: 8000,
      paymentMonth: '2026-08-01',
      paidDate: null,
      paymentMethod: 'Bank Transfer',
      status: 'Pending',
    },
    {
      propertyId: 1,
      amount: 8000,
      paymentMonth: '2026-09-01',
      paidDate: null,
      paymentMethod: 'Bank Transfer',
      status: 'Pending',
    },
    {
      propertyId: 1,
      amount: 8000,
      paymentMonth: '2026-10-01',
      paidDate: null,
      paymentMethod: 'Bank Transfer',
      status: 'Pending',
    },
    {
      propertyId: 1,
      amount: 8000,
      paymentMonth: '2026-11-01',
      paidDate: null,
      paymentMethod: 'Bank Transfer',
      status: 'Pending',
    },
    // Property 6 (Villa Mathar) — monthly from Nov 2025 to Nov 2026
    {
      propertyId: 6,
      amount: 6000,
      paymentMonth: '2025-11-01',
      paidDate: null,
      paymentMethod: 'Bank Transfer',
      status: 'Pending',
    },
    {
      propertyId: 6,
      amount: 6000,
      paymentMonth: '2025-12-01',
      paidDate: null,
      paymentMethod: 'Bank Transfer',
      status: 'Pending',
    },
    {
      propertyId: 6,
      amount: 6000,
      paymentMonth: '2026-01-01',
      paidDate: null,
      paymentMethod: 'Bank Transfer',
      status: 'Pending',
    },
    {
      propertyId: 6,
      amount: 6000,
      paymentMonth: '2026-02-01',
      paidDate: null,
      paymentMethod: 'Bank Transfer',
      status: 'Pending',
    },
    {
      propertyId: 6,
      amount: 6000,
      paymentMonth: '2026-03-01',
      paidDate: null,
      paymentMethod: 'Bank Transfer',
      status: 'Pending',
    },
    {
      propertyId: 6,
      amount: 6000,
      paymentMonth: '2026-04-01',
      paidDate: null,
      paymentMethod: 'Bank Transfer',
      status: 'Pending',
    },
    {
      propertyId: 6,
      amount: 6000,
      paymentMonth: '2026-05-01',
      paidDate: null,
      paymentMethod: 'Bank Transfer',
      status: 'Pending',
    },
    {
      propertyId: 6,
      amount: 6000,
      paymentMonth: '2026-06-01',
      paidDate: null,
      paymentMethod: 'Bank Transfer',
      status: 'Pending',
    },
    {
      propertyId: 6,
      amount: 6000,
      paymentMonth: '2026-07-01',
      paidDate: null,
      paymentMethod: 'Bank Transfer',
      status: 'Pending',
    },
    {
      propertyId: 6,
      amount: 6000,
      paymentMonth: '2026-08-01',
      paidDate: null,
      paymentMethod: 'Bank Transfer',
      status: 'Pending',
    },
    {
      propertyId: 6,
      amount: 6000,
      paymentMonth: '2026-09-01',
      paidDate: null,
      paymentMethod: 'Bank Transfer',
      status: 'Pending',
    },
    {
      propertyId: 6,
      amount: 6000,
      paymentMonth: '2026-10-01',
      paidDate: null,
      paymentMethod: 'Bank Transfer',
      status: 'Pending',
    },
    {
      propertyId: 6,
      amount: 6000,
      paymentMonth: '2026-11-01',
      paidDate: null,
      paymentMethod: 'Bank Transfer',
      status: 'Pending',
    },
  ];

  const ownerPaymentDocs = phpOwnerPayments
    .map((op) => {
      const propId = propMap.get(op.propertyId);
      if (!propId) return null;
      return {
        propertyId: propId,
        userId: adminId,
        amount: op.amount,
        paymentMonth: new Date(op.paymentMonth),
        paidDate: d(op.paidDate),
        paymentMethod: payMethod(op.paymentMethod),
        status: op.status,
      };
    })
    .filter(Boolean);

  await OwnerPayment.insertMany(ownerPaymentDocs);
  console.log(`✅ ${ownerPaymentDocs.length} owner payments inserted\n`);

  // ── 8. Insert transactions ─────────────────────────────────────────────────
  const propObjId2 = propMap.get(2);
  if (propObjId2) {
    await Transaction.create({
      userId: adminId,
      propertyId: propObjId2,
      tenantId: undefined,
      type: 'Expense',
      category: 'Repairs',
      amount: 600,
      notes: '',
      transactionDate: new Date('2025-11-17'),
      paymentMethod: 'Cash',
      referenceNumber: undefined,
      isRecurring: false,
      recurringFrequency: undefined,
    });
    console.log('✅ 1 transaction inserted\n');
  }

  // ── 9. Insert document ─────────────────────────────────────────────────────
  // From user's live PHP system (file needs to be copied from live server later)
  const propObjId6 = propMap.get(6);
  if (propObjId6) {
    await Document.create({
      userId: adminId,
      propertyId: propObjId6,
      tenantId: undefined, // tenant_id 3 doesn't exist in migrated data
      documentType: 'Invoice',
      title: 'invoice bill',
      filePath: 'uploads/documents/69a529e725a79_download (1).png',
      fileName: '69a529e725a79_download (1).png',
      originalName: 'download (1).png',
      fileSize: 1877,
      mimeType: 'image/png',
      createdAt: new Date('2026-03-02T11:40:47Z'),
    });
    console.log('✅ 1 document record inserted\n');
    console.log('⚠️  NOTE: Document file "69a529e725a79_download (1).png" must be copied');
    console.log('         from the live PHP server to backend/uploads/documents/\n');
  }

  // ── Done ──────────────────────────────────────────────────────────────────
  console.log('─────────────────────────────────────────');
  console.log('✅ Migration complete!');
  console.log(`   Properties : ${phpProperties.length}`);
  console.log(`   Tenants    : ${phpTenants.length}`);
  console.log(`   Rent pmts  : ${rentDueDates.length}`);
  console.log(`   Owner pmts : ${ownerPaymentDocs.length}`);
  console.log('   Transactions: 1');
  console.log('   Documents  : 1');
  console.log('─────────────────────────────────────────');

  await mongoose.disconnect();
  process.exit(0);
}

migrate().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
