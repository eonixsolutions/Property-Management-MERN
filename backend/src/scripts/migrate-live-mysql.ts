/**
 * migrate-live-mysql.ts — migrates live MySQL (realestate db) → MongoDB
 *
 * Skips the users table (managed separately).
 * All records are assigned to the SUPER_ADMIN user.
 *
 * Usage:
 *   cd backend
 *   npx tsx src/scripts/migrate-live-mysql.ts
 */
import 'dotenv/config';
import mysql from 'mysql2/promise';
import mongoose from 'mongoose';
import { connectDB } from '../config/database';
import { User } from '../models/user.model';
import { Property } from '../models/property.model';
import { Tenant } from '../models/tenant.model';
import { RentPayment } from '../models/rent-payment.model';
import { OwnerPayment } from '../models/owner-payment.model';
import { Transaction } from '../models/transaction.model';
import { Document } from '../models/document.model';
import { MaintenanceRequest } from '../models/maintenance-request.model';
import { Contract } from '../models/contract.model';
import { TenantCheque } from '../models/tenant-cheque.model';
import { OwnerCheque } from '../models/owner-cheque.model';

const MYSQL_CONFIG = {
  host: 'localhost',
  user: 'sidhyk',
  password: 'Tz#669933',
  database: 'realestate',
  dateStrings: true, // keep dates as strings for consistent parsing
};

// ── Helpers ────────────────────────────────────────────────────────────────

function d(v: unknown): Date | undefined {
  if (!v || v === '0000-00-00' || v === '0000-00-00 00:00:00') return undefined;
  const dt = new Date(String(v));
  return isNaN(dt.getTime()) ? undefined : dt;
}

function str(v: unknown): string | undefined {
  if (v === null || v === undefined || v === '') return undefined;
  return String(v);
}

function num(v: unknown): number | undefined {
  if (v === null || v === undefined) return undefined;
  const n = Number(v);
  return isNaN(n) ? undefined : n;
}

function payMethod(v: unknown): string {
  if (!v) return 'Cash';
  const m = String(v);
  return m === 'Check' ? 'Cheque' : m;
}

type Row = Record<string, unknown>;

// ── Main ───────────────────────────────────────────────────────────────────

async function migrate() {
  const sql = await mysql.createConnection(MYSQL_CONFIG);
  console.log('✅ Connected to MySQL\n');

  await connectDB();
  console.log('✅ Connected to MongoDB\n');

  // Get SUPER_ADMIN — all records will be owned by this user
  const admin = await User.findOne({ role: 'SUPER_ADMIN' }).lean();
  if (!admin) {
    console.error('❌ No SUPER_ADMIN found. Run: npm run seed');
    process.exit(1);
  }
  const adminId = admin._id as mongoose.Types.ObjectId;
  console.log(`👤 SUPER_ADMIN: ${admin.email} (${adminId})\n`);

  // Clear all collections except users and settings
  await Promise.all([
    Property.deleteMany({}),
    Tenant.deleteMany({}),
    RentPayment.deleteMany({}),
    OwnerPayment.deleteMany({}),
    Transaction.deleteMany({}),
    Document.deleteMany({}),
    MaintenanceRequest.deleteMany({}),
    Contract.deleteMany({}),
    TenantCheque.deleteMany({}),
    OwnerCheque.deleteMany({}),
  ]);
  console.log('🗑️  Cleared collections (users & settings preserved)\n');

  // ID → ObjectId maps
  const propMap = new Map<number, mongoose.Types.ObjectId>();
  const tenantMap = new Map<number, mongoose.Types.ObjectId>();
  const rentPayMap = new Map<number, mongoose.Types.ObjectId>();
  const ownerPayMap = new Map<number, mongoose.Types.ObjectId>();

  // ── 1. Properties ────────────────────────────────────────────────────────
  const [propRows] = await sql.query(
    'SELECT * FROM properties ORDER BY is_unit ASC, id ASC',
  ) as [Row[], unknown];

  const [imgRows] = await sql.query('SELECT * FROM property_images') as [Row[], unknown];
  const imgMap = new Map<number, Array<{ url: string; filename: string; isPrimary: boolean; uploadedAt: Date }>>();
  for (const img of imgRows) {
    const pid = img['property_id'] as number;
    if (!imgMap.has(pid)) imgMap.set(pid, []);
    imgMap.get(pid)!.push({
      url: `uploads/properties/${img['image_name']}`,
      filename: String(img['image_name']),
      isPrimary: Boolean(img['is_primary']),
      uploadedAt: d(img['created_at']) ?? new Date(),
    });
  }

  for (const p of propRows) {
    const parentObjId = p['parent_property_id']
      ? propMap.get(p['parent_property_id'] as number)
      : undefined;

    const doc = await Property.create({
      userId: adminId,
      type: p['is_unit'] ? 'unit' : 'master',
      parentPropertyId: parentObjId,
      unitName: str(p['unit_name']),
      owner: {
        name: str(p['owner_name']),
        contact: str(p['owner_contact']),
        email: str(p['owner_email']),
        phone: str(p['owner_phone']),
        monthlyRentAmount: num(p['monthly_rent_to_owner']),
      },
      propertyName: String(p['property_name']),
      address: str(p['address']),
      city: str(p['city']),
      state: str(p['state']),
      zipCode: str(p['zip_code']),
      country: str(p['country']) ?? 'Qatar',
      propertyType: String(p['property_type']),
      bedrooms: num(p['bedrooms']),
      bathrooms: num(p['bathrooms']),
      squareFeet: num(p['square_feet']),
      purchasePrice: num(p['purchase_price']),
      currentValue: num(p['current_value']),
      purchaseDate: d(p['purchase_date']),
      defaultRent: num(p['default_rent']),
      status: String(p['status']) as 'Vacant' | 'Occupied' | 'Under Maintenance',
      notes: str(p['notes']),
      images: imgMap.get(p['id'] as number) ?? [],
    });

    propMap.set(p['id'] as number, doc._id as mongoose.Types.ObjectId);
    console.log(`  🏠 [${p['id']}] "${p['property_name']}" → ${doc._id}`);
  }
  console.log(`\n✅ ${propRows.length} properties\n`);

  // ── 2. Tenants ───────────────────────────────────────────────────────────
  // Use raw MongoDB insertMany to bypass post-save hooks (which cause
  // OverwriteModelError via dynamic import of property.model inside the hook)
  const [tenantRows] = await sql.query(
    'SELECT * FROM tenants ORDER BY id ASC',
  ) as [Row[], unknown];

  const db = mongoose.connection.db!;
  const tenantDocs: Record<string, unknown>[] = [];
  let tenantSkipped = 0;

  for (const t of tenantRows) {
    const propObjId = propMap.get(t['property_id'] as number);
    if (!propObjId) {
      console.warn(`  ⚠️  Tenant [${t['id']}] property ${t['property_id']} not found — skipped`);
      tenantSkipped++;
      continue;
    }
    const newId = new mongoose.Types.ObjectId();
    tenantMap.set(t['id'] as number, newId);
    const now = new Date();
    tenantDocs.push({
      _id: newId,
      propertyId: propObjId,
      firstName: String(t['first_name']),
      lastName: String(t['last_name']),
      email: str(t['email']) ?? null,
      phone: str(t['phone']) ?? null,
      alternatePhone: str(t['alternate_phone']) ?? null,
      qatarId: str(t['qatar_id']) ?? null,
      moveInDate: d(t['move_in_date']) ?? null,
      moveOutDate: d(t['move_out_date']) ?? null,
      leaseStart: d(t['lease_start']) ?? null,
      leaseEnd: d(t['lease_end']) ?? null,
      monthlyRent: num(t['monthly_rent']) ?? null,
      securityDeposit: num(t['security_deposit']) ?? null,
      status: String(t['status']),
      emergencyContact: {
        name: str(t['emergency_contact_name']) ?? null,
        phone: str(t['emergency_contact_phone']) ?? null,
      },
      notes: str(t['notes']) ?? null,
      isDeleted: false,
      createdAt: d(t['created_at']) ?? now,
      updatedAt: d(t['updated_at']) ?? now,
    });
    console.log(`  👤 [${t['id']}] "${t['first_name']} ${t['last_name']}" → ${newId}`);
  }

  if (tenantDocs.length > 0) {
    await db.collection('tenants').insertMany(tenantDocs);
  }
  console.log(`\n✅ ${tenantDocs.length} tenants (${tenantSkipped} skipped)\n`);

  // ── 3. Rent payments ─────────────────────────────────────────────────────
  const [rpRows] = await sql.query(
    'SELECT * FROM rent_payments ORDER BY id ASC',
  ) as [Row[], unknown];

  let rpSkipped = 0;
  for (const r of rpRows) {
    const tenantObjId = tenantMap.get(r['tenant_id'] as number);
    const propObjId = propMap.get(r['property_id'] as number);
    if (!tenantObjId || !propObjId) { rpSkipped++; continue; }

    const doc = await RentPayment.create({
      tenantId: tenantObjId,
      propertyId: propObjId,
      amount: num(r['amount']) ?? 0,
      dueDate: d(r['due_date']) ?? new Date(),
      paidDate: d(r['paid_date']),
      chequeNumber: str(r['cheque_number']),
      paymentMethod: payMethod(r['payment_method']),
      referenceNumber: str(r['reference_number']),
      status: String(r['status']) as 'Pending' | 'Paid' | 'Overdue' | 'Partial',
      notes: str(r['notes']),
    });
    rentPayMap.set(r['id'] as number, doc._id as mongoose.Types.ObjectId);
  }
  console.log(`✅ ${rpRows.length - rpSkipped} rent payments (${rpSkipped} skipped)\n`);

  // ── 4. Owner payments ────────────────────────────────────────────────────
  const [opRows] = await sql.query(
    "SELECT * FROM owner_payments WHERE payment_month != '0000-00-00' ORDER BY id ASC",
  ) as [Row[], unknown];

  let opSkipped = 0;
  for (const o of opRows) {
    const propObjId = propMap.get(o['property_id'] as number);
    if (!propObjId) { opSkipped++; continue; }

    const doc = await OwnerPayment.create({
      propertyId: propObjId,
      userId: adminId,
      amount: num(o['amount']) ?? 0,
      paymentMonth: d(o['payment_month']) ?? new Date(),
      paidDate: d(o['paid_date']),
      chequeNumber: str(o['cheque_number']),
      paymentMethod: payMethod(o['payment_method']),
      referenceNumber: str(o['reference_number']),
      notes: str(o['notes']),
      status: String(o['status']) as 'Pending' | 'Paid' | 'Overdue',
    });
    ownerPayMap.set(o['id'] as number, doc._id as mongoose.Types.ObjectId);
  }
  console.log(`✅ ${opRows.length - opSkipped} owner payments (${opSkipped} skipped)\n`);

  // ── 5. Transactions ──────────────────────────────────────────────────────
  const [txRows] = await sql.query(
    'SELECT * FROM transactions ORDER BY id ASC',
  ) as [Row[], unknown];

  for (const t of txRows) {
    const propObjId = propMap.get(t['property_id'] as number);
    const tenantObjId = t['tenant_id'] ? tenantMap.get(t['tenant_id'] as number) : undefined;
    await Transaction.create({
      userId: adminId,
      propertyId: propObjId,
      tenantId: tenantObjId,
      type: String(t['type']) as 'Income' | 'Expense',
      category: str(t['category']) ?? 'Other',
      amount: num(t['amount']) ?? 0,
      notes: str(t['description']),
      transactionDate: d(t['transaction_date']) ?? new Date(),
      paymentMethod: payMethod(t['payment_method']),
      referenceNumber: str(t['reference_number']),
      isRecurring: Boolean(t['is_recurring']),
      recurringFrequency: str(t['recurring_frequency']) as
        | 'Monthly'
        | 'Weekly'
        | 'Yearly'
        | undefined,
    });
  }
  console.log(`✅ ${txRows.length} transactions\n`);

  // ── 6. Documents ─────────────────────────────────────────────────────────
  const [docRows] = await sql.query(
    'SELECT * FROM documents ORDER BY id ASC',
  ) as [Row[], unknown];

  for (const doc of docRows) {
    const propObjId = propMap.get(doc['property_id'] as number);
    const tenantObjId = doc['tenant_id']
      ? tenantMap.get(doc['tenant_id'] as number)
      : undefined;
    const fileName = str(doc['file_name']) ?? 'unknown';
    await Document.create({
      userId: adminId,
      propertyId: propObjId,
      tenantId: tenantObjId,
      documentType: str(doc['document_type']) ?? 'Other',
      title: str(doc['title']) ?? fileName,
      filePath: str(doc['file_path']) ?? `uploads/documents/${fileName}`,
      fileName,
      originalName: fileName,
      fileSize: num(doc['file_size']) ?? 0,
      mimeType: 'application/octet-stream',
      createdAt: d(doc['upload_date']) ?? new Date(),
    });
  }
  console.log(`✅ ${docRows.length} documents\n`);

  // ── 7. Maintenance requests ──────────────────────────────────────────────
  const [mrRows] = await sql.query(
    'SELECT * FROM maintenance_requests ORDER BY id ASC',
  ) as [Row[], unknown];

  for (const mr of mrRows) {
    const propObjId = propMap.get(mr['property_id'] as number);
    const tenantObjId = mr['tenant_id']
      ? tenantMap.get(mr['tenant_id'] as number)
      : undefined;
    await MaintenanceRequest.create({
      propertyId: propObjId,
      tenantId: tenantObjId,
      userId: adminId,
      title: String(mr['title']),
      description: str(mr['description']),
      priority: String(mr['priority']) as 'Low' | 'Medium' | 'High' | 'Emergency',
      status: String(mr['status']) as 'Pending' | 'In Progress' | 'Completed' | 'Cancelled',
      cost: num(mr['cost']),
      completedDate: d(mr['completed_date']),
      createdAt: d(mr['created_at']) ?? new Date(),
    });
  }
  console.log(`✅ ${mrRows.length} maintenance requests\n`);

  // ── 8. Contracts ─────────────────────────────────────────────────────────
  const [contractRows] = await sql.query(
    'SELECT * FROM contracts ORDER BY id ASC',
  ) as [Row[], unknown];

  for (const c of contractRows) {
    const tenantObjId = c['tenant_id']
      ? tenantMap.get(c['tenant_id'] as number)
      : undefined;
    await Contract.create({
      userId: adminId,
      tenantId: tenantObjId,
      landlordName: str(c['landlord_name']),
      landlordAddress: str(c['landlord_address']),
      landlordPhone: str(c['landlord_phone']),
      landlordEmail: str(c['landlord_email']),
      tenantName: str(c['tenant_name']),
      tenantPhone: str(c['tenant_phone']),
      tenantEmail: str(c['tenant_email']),
      tenantAlternatePhone: str(c['tenant_alternate_phone']),
      tenantQatarId: str(c['tenant_qatar_id']),
      propertyName: str(c['property_name']),
      propertyAddress: str(c['property_address']),
      propertyCity: str(c['property_city']),
      propertyState: str(c['property_state']),
      propertyZip: str(c['property_zip']),
      propertyType: str(c['property_type']),
      propertyBedrooms: num(c['property_bedrooms']),
      propertyBathrooms: num(c['property_bathrooms']),
      propertySquareFeet: num(c['property_square_feet']),
      leaseStart: d(c['lease_start']),
      leaseEnd: d(c['lease_end']),
      monthlyRent: num(c['monthly_rent']),
      securityDeposit: num(c['security_deposit']),
      lateFee: num(c['late_fee']),
      returnPeriod: str(c['return_period']),
      noticePeriod: str(c['notice_period']),
      holdoverRate: num(c['holdover_rate']),
      petsAllowed: Boolean(c['pets_allowed']),
      petDeposit: num(c['pet_deposit']),
      utilitiesResponsible: (str(c['utilities_responsible']) ??
        'Tenant') as 'Tenant' | 'Landlord' | 'Shared',
      governingLaw: str(c['governing_law']),
      termsRent: str(c['terms_rent']),
      termsSecurity: str(c['terms_security']),
      termsUse: str(c['terms_use']),
      termsMaintenance: str(c['terms_maintenance']),
      termsUtilities: str(c['terms_utilities']),
      termsQuiet: str(c['terms_quiet']),
      termsAccess: str(c['terms_access']),
      termsPets: str(c['terms_pets']),
      termsInsurance: str(c['terms_insurance']),
      termsDefault: str(c['terms_default']),
      termsTermination: str(c['terms_termination']),
      termsHoldover: str(c['terms_holdover']),
      termsGoverning: str(c['terms_governing']),
      termsEntire: str(c['terms_entire']),
      termsSeverability: str(c['terms_severability']),
      emergencyContactName: str(c['emergency_contact_name']),
      emergencyContactPhone: str(c['emergency_contact_phone']),
      agreementDate: d(c['agreement_date']),
    });
  }
  console.log(`✅ ${contractRows.length} contracts\n`);

  // ── 9. Tenant cheques ────────────────────────────────────────────────────
  const [tcRows] = await sql.query(
    'SELECT * FROM tenant_cheques ORDER BY id ASC',
  ) as [Row[], unknown];

  let tcSkipped = 0;
  for (const tc of tcRows) {
    const tenantObjId = tenantMap.get(tc['tenant_id'] as number);
    const propObjId = propMap.get(tc['property_id'] as number);
    if (!tenantObjId || !propObjId) { tcSkipped++; continue; }

    const rentPayObjId = tc['rent_payment_id']
      ? rentPayMap.get(tc['rent_payment_id'] as number)
      : undefined;
    await TenantCheque.create({
      userId: adminId,
      tenantId: tenantObjId,
      propertyId: propObjId,
      rentPaymentId: rentPayObjId,
      chequeNumber: str(tc['cheque_number']) ?? 'UNKNOWN',
      bankName: str(tc['bank_name']),
      chequeAmount: num(tc['cheque_amount']) ?? 0,
      chequeDate: d(tc['cheque_date']) ?? new Date(),
      depositDate: d(tc['deposit_date']),
      status: String(tc['status']) as 'Pending' | 'Deposited' | 'Bounced' | 'Cleared',
      notes: str(tc['notes']),
    });
  }
  console.log(`✅ ${tcRows.length - tcSkipped} tenant cheques (${tcSkipped} skipped)\n`);

  // ── 10. Owner cheques ────────────────────────────────────────────────────
  const [ocRows] = await sql.query(
    'SELECT * FROM owner_cheques ORDER BY id ASC',
  ) as [Row[], unknown];

  let ocSkipped = 0;
  for (const oc of ocRows) {
    const propObjId = propMap.get(oc['property_id'] as number);
    if (!propObjId) { ocSkipped++; continue; }

    const ownerPayObjId = oc['owner_payment_id']
      ? ownerPayMap.get(oc['owner_payment_id'] as number)
      : undefined;
    await OwnerCheque.create({
      userId: adminId,
      propertyId: propObjId,
      ownerPaymentId: ownerPayObjId,
      chequeNumber: str(oc['cheque_number']) ?? 'UNKNOWN',
      bankName: str(oc['bank_name']),
      chequeAmount: num(oc['cheque_amount']) ?? 0,
      chequeDate: d(oc['cheque_date']) ?? new Date(),
      issueDate: d(oc['issue_date']),
      status: String(oc['status']) as 'Issued' | 'Cleared' | 'Bounced' | 'Cancelled',
      notes: str(oc['notes']),
    });
  }
  console.log(`✅ ${ocRows.length - ocSkipped} owner cheques (${ocSkipped} skipped)\n`);

  await sql.end();
  await mongoose.disconnect();

  console.log('─────────────────────────────────────────');
  console.log('✅ Migration complete!');
  console.log('─────────────────────────────────────────');
}

migrate().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
