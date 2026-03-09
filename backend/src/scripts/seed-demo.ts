/**
 * Demo Data Seed Script
 *
 * Clears all collections EXCEPT users & settings, then inserts a full set of
 * realistic, cross-linked demo data that exercises every page and calculation.
 *
 * Today assumed: 2026-03-04
 *
 * Usage:
 *   npm run seed:demo
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '@config/database';
import { User, UserRole } from '@models/user.model';
import { Property } from '@models/property.model';
import { Tenant } from '@models/tenant.model';
import { RentPayment } from '@models/rent-payment.model';
import { OwnerPayment } from '@models/owner-payment.model';
import { TenantCheque } from '@models/tenant-cheque.model';
import { OwnerCheque } from '@models/owner-cheque.model';
import { Transaction } from '@models/transaction.model';
import { MaintenanceRequest } from '@models/maintenance-request.model';
import { Contract } from '@models/contract.model';
import { logger } from '@utils/logger';

// ── Date helpers ──────────────────────────────────────────────────────────────

/** UTC midnight of the 1st day of a given year+month (1-based month). */
function d(year: number, month: number, day = 1): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

// ── Clear collections ─────────────────────────────────────────────────────────

async function clearCollections(): Promise<void> {
  await Promise.all([
    Property.deleteMany({}),
    Tenant.deleteMany({}),
    RentPayment.deleteMany({}),
    OwnerPayment.deleteMany({}),
    TenantCheque.deleteMany({}),
    OwnerCheque.deleteMany({}),
    Transaction.deleteMany({}),
    MaintenanceRequest.deleteMany({}),
    Contract.deleteMany({}),
  ]);
  logger.info('All demo collections cleared.');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function seed(): Promise<void> {
  // Find the SUPER_ADMIN
  const admin = await User.findOne({ role: UserRole.SUPER_ADMIN }).lean();
  if (!admin) throw new Error('No SUPER_ADMIN found. Run `npm run seed` first.');
  const uid = admin._id as mongoose.Types.ObjectId;
  logger.info({ email: admin.email }, 'Seeding demo data for SUPER_ADMIN');

  await clearCollections();

  // ═══════════════════════════════════════════════════════════════════════════
  // PROPERTIES
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Master 1: Al Dafna Tower ──────────────────────────────────────────────
  const pMaster1 = await Property.create({
    userId: uid,
    type: 'master',
    propertyName: 'Al Dafna Tower',
    address: '45 Al Dafna Street',
    city: 'Doha',
    state: 'Ad Dawhah',
    zipCode: '22210',
    country: 'Qatar',
    propertyType: 'Building',
    bedrooms: 0,
    bathrooms: 0,
    squareFeet: 12000,
    purchasePrice: 4200000,
    currentValue: 5100000,
    purchaseDate: d(2018, 3, 15),
    defaultRent: 0,
    status: 'Occupied',
    owner: { name: 'Abdullah Al-Rashid', contact: '+974 5512 3456' },
    notes: 'Residential tower with 10 units. Well-maintained.',
  });

  // ── Unit 101: Al Dafna Tower (Occupied) ──────────────────────────────────
  const pUnit101 = await Property.create({
    userId: uid,
    type: 'unit',
    parentPropertyId: pMaster1._id,
    propertyName: 'Al Dafna Tower — Unit 101',
    address: '45 Al Dafna Street, Unit 101',
    city: 'Doha',
    state: 'Ad Dawhah',
    zipCode: '22210',
    country: 'Qatar',
    propertyType: 'Apartment',
    bedrooms: 2,
    bathrooms: 2,
    squareFeet: 1350,
    purchasePrice: 680000,
    currentValue: 820000,
    purchaseDate: d(2018, 3, 15),
    defaultRent: 8000,
    status: 'Vacant', // will be updated by tenant hook
    owner: { name: 'Abdullah Al-Rashid', contact: '+974 5512 3456' },
    notes: '2BR with balcony, sea view.',
  });

  // ── Unit 102: Al Dafna Tower (Vacant) ────────────────────────────────────
  const pUnit102 = await Property.create({
    userId: uid,
    type: 'unit',
    parentPropertyId: pMaster1._id,
    propertyName: 'Al Dafna Tower — Unit 102',
    address: '45 Al Dafna Street, Unit 102',
    city: 'Doha',
    state: 'Ad Dawhah',
    zipCode: '22210',
    country: 'Qatar',
    propertyType: 'Apartment',
    bedrooms: 1,
    bathrooms: 1,
    squareFeet: 860,
    purchasePrice: 420000,
    currentValue: 510000,
    purchaseDate: d(2018, 3, 15),
    defaultRent: 5500,
    status: 'Vacant',
    owner: { name: 'Abdullah Al-Rashid', contact: '+974 5512 3456' },
    notes: '1BR, recently renovated.',
  });

  // ── Master 2: Pearl Villa ─────────────────────────────────────────────────
  const pMaster2 = await Property.create({
    userId: uid,
    type: 'master',
    propertyName: 'Pearl Villa Complex',
    address: '12 Pearl District Boulevard',
    city: 'Doha',
    state: 'Ad Dawhah',
    zipCode: '22001',
    country: 'Qatar',
    propertyType: 'Villa',
    bedrooms: 0,
    bathrooms: 0,
    squareFeet: 8500,
    purchasePrice: 7500000,
    currentValue: 9200000,
    purchaseDate: d(2016, 8, 1),
    defaultRent: 0,
    status: 'Occupied',
    owner: { name: 'Fatima Al-Mansoori', contact: '+974 5523 4567' },
    notes: 'Luxury villa complex in Pearl district.',
  });

  // ── Pearl Villa Unit A (Occupied) ─────────────────────────────────────────
  const pUnitA = await Property.create({
    userId: uid,
    type: 'unit',
    parentPropertyId: pMaster2._id,
    propertyName: 'Pearl Villa — Unit A',
    address: '12 Pearl District Blvd, Villa A',
    city: 'Doha',
    state: 'Ad Dawhah',
    zipCode: '22001',
    country: 'Qatar',
    propertyType: 'Villa',
    bedrooms: 4,
    bathrooms: 3,
    squareFeet: 4200,
    purchasePrice: 3800000,
    currentValue: 4700000,
    purchaseDate: d(2016, 8, 1),
    defaultRent: 15000,
    status: 'Vacant', // will be updated by tenant hook
    owner: { name: 'Fatima Al-Mansoori', contact: '+974 5523 4567' },
    notes: '4BR luxury villa with private pool.',
  });

  // ── Pearl Villa Unit B (Under Maintenance) ────────────────────────────────
  const pUnitB = await Property.create({
    userId: uid,
    type: 'unit',
    parentPropertyId: pMaster2._id,
    propertyName: 'Pearl Villa — Unit B',
    address: '12 Pearl District Blvd, Villa B',
    city: 'Doha',
    state: 'Ad Dawhah',
    zipCode: '22001',
    country: 'Qatar',
    propertyType: 'Villa',
    bedrooms: 3,
    bathrooms: 2,
    squareFeet: 3800,
    purchasePrice: 3400000,
    currentValue: 4200000,
    purchaseDate: d(2016, 8, 1),
    defaultRent: 12000,
    status: 'Under Maintenance',
    owner: { name: 'Fatima Al-Mansoori', contact: '+974 5523 4567' },
    notes: '3BR villa. Currently under HVAC renovation.',
  });

  // ── Standalone: Marina Studio 304 (Occupied) ─────────────────────────────
  const pMarina = await Property.create({
    userId: uid,
    type: 'unit',
    propertyName: 'West Bay Marina Studio 304',
    address: 'Tower 7, West Bay Marina, Unit 304',
    city: 'Doha',
    state: 'Ad Dawhah',
    zipCode: '22445',
    country: 'Qatar',
    propertyType: 'Studio',
    bedrooms: 0,
    bathrooms: 1,
    squareFeet: 620,
    purchasePrice: 320000,
    currentValue: 395000,
    purchaseDate: d(2020, 2, 10),
    defaultRent: 4200,
    status: 'Vacant', // will be updated by tenant hook
    owner: { name: 'Khalid Hussain', contact: '+974 5534 5678' },
    notes: 'Studio with marina view. High-demand location.',
  });

  logger.info('Properties created: 3 masters/standalone + 4 units');

  // ═══════════════════════════════════════════════════════════════════════════
  // TENANTS  (use save() so post-save hook updates property status)
  // ═══════════════════════════════════════════════════════════════════════════

  // T1: Ahmed Hassan — Active, Al Dafna Unit 101
  const tAhmed = new Tenant({
    userId: uid,
    propertyId: pUnit101._id,
    firstName: 'Ahmed',
    lastName: 'Hassan',
    email: 'ahmed.hassan@gmail.com',
    phone: '+974 5511 2233',
    qatarId: '28401122334',
    moveInDate: d(2025, 1, 1),
    leaseStart: d(2025, 1, 1),
    leaseEnd: d(2026, 12, 31),
    monthlyRent: 8000,
    securityDeposit: 16000,
    status: 'Active',
    emergencyContact: { name: 'Layla Hassan', phone: '+974 5511 9988' },
    notes: 'Long-term tenant. Excellent payment history.',
  });
  await tAhmed.save();

  // T2: Siddharth Patel — Active, Pearl Villa Unit A
  const tSiddharth = new Tenant({
    userId: uid,
    propertyId: pUnitA._id,
    firstName: 'Siddharth',
    lastName: 'Patel',
    email: 'siddharth.patel@outlook.com',
    phone: '+974 5522 3344',
    qatarId: '29511233445',
    moveInDate: d(2025, 2, 1),
    leaseStart: d(2025, 2, 1),
    leaseEnd: d(2027, 1, 31),
    monthlyRent: 15000,
    securityDeposit: 30000,
    status: 'Active',
    emergencyContact: { name: 'Anita Patel', phone: '+974 5522 8877' },
    notes: 'Corporate tenant. Company pays rent via bank transfer.',
  });
  await tSiddharth.save();

  // T3: Priya Sharma — Active, Marina Studio (lease expiring Mar 31 → tests notification)
  const tPriya = new Tenant({
    userId: uid,
    propertyId: pMarina._id,
    firstName: 'Priya',
    lastName: 'Sharma',
    email: 'priya.sharma@yahoo.com',
    phone: '+974 5533 4455',
    qatarId: '30600344556',
    moveInDate: d(2025, 6, 1),
    leaseStart: d(2025, 6, 1),
    leaseEnd: d(2026, 3, 31), // expiring in 27 days — triggers "expiring soon" notification
    monthlyRent: 4200,
    securityDeposit: 8400,
    status: 'Active',
    emergencyContact: { name: 'Ravi Sharma', phone: '+974 5533 7766' },
    notes: 'Lease renewal discussion ongoing.',
  });
  await tPriya.save();

  // T4: John Martinez — Past, Al Dafna Unit 102 (left Jan 31 2026)
  const tJohn = new Tenant({
    userId: uid,
    propertyId: pUnit102._id,
    firstName: 'John',
    lastName: 'Martinez',
    email: 'john.martinez@email.com',
    phone: '+974 5544 5566',
    qatarId: '27312433667',
    moveInDate: d(2024, 3, 1),
    moveOutDate: d(2026, 1, 31),
    leaseStart: d(2024, 3, 1),
    leaseEnd: d(2026, 1, 31),
    monthlyRent: 5500,
    securityDeposit: 11000,
    status: 'Past',
    notes: 'Left voluntarily. Security deposit refunded.',
  });
  await tJohn.save();

  // T5: Maria Gonzalez — Pending, Pearl Villa Unit B (future tenant Apr 2026)
  const tMaria = new Tenant({
    userId: uid,
    propertyId: pUnitB._id,
    firstName: 'Maria',
    lastName: 'Gonzalez',
    email: 'maria.gonzalez@email.com',
    phone: '+974 5555 6677',
    moveInDate: d(2026, 4, 1),
    leaseStart: d(2026, 4, 1),
    leaseEnd: d(2027, 3, 31),
    monthlyRent: 12000,
    securityDeposit: 24000,
    status: 'Pending',
    notes: 'Confirmed. Awaiting unit maintenance completion.',
  });
  await tMaria.save();

  // Restore Unit B to Under Maintenance (tenant hook sets it to Vacant since Maria is Pending)
  await Property.findByIdAndUpdate(pUnitB._id, { status: 'Under Maintenance' });

  logger.info('Tenants created: 3 Active, 1 Past, 1 Pending. Property statuses updated.');

  // ═══════════════════════════════════════════════════════════════════════════
  // RENT PAYMENTS  (7 months: Sep 2025 – Mar 2026)
  // ═══════════════════════════════════════════════════════════════════════════

  // Helper: create payment for a tenant + property for a given month
  const rentPayments: mongoose.Document[] = [];

  // Ahmed (8,000 QAR): Sep–Jan Paid, Feb Overdue, Mar Pending
  const ahmedPayments = [
    { month: d(2025, 9), status: 'Paid', paidDate: d(2025, 9, 5) },
    { month: d(2025, 10), status: 'Paid', paidDate: d(2025, 10, 4) },
    { month: d(2025, 11), status: 'Paid', paidDate: d(2025, 11, 3) },
    { month: d(2025, 12), status: 'Paid', paidDate: d(2025, 12, 2) },
    { month: d(2026, 1), status: 'Paid', paidDate: d(2026, 1, 5) },
    { month: d(2026, 2), status: 'Overdue', paidDate: null }, // missed payment
    { month: d(2026, 3, 7), status: 'Pending', paidDate: null }, // due in 3 days
  ];
  for (const p of ahmedPayments) {
    const doc = await RentPayment.create({
      tenantId: tAhmed._id,
      propertyId: pUnit101._id,
      amount: 8000,
      dueDate: p.month,
      paidDate: p.paidDate ?? undefined,
      status: p.status,
      paymentMethod: p.status === 'Paid' ? 'Cheque' : undefined,
      notes: p.status === 'Overdue' ? 'Tenant missed February payment.' : undefined,
    });
    rentPayments.push(doc);
  }
  // Reference: Ahmed's March pending payment (index 6)
  const ahmedMarPay = rentPayments[rentPayments.length - 1] as InstanceType<typeof RentPayment>;
  const ahmedFebOverdue = rentPayments[rentPayments.length - 2] as InstanceType<typeof RentPayment>;

  // Siddharth (15,000 QAR): Sep–Feb Paid, Mar Pending
  const sidPayments: InstanceType<typeof RentPayment>[] = [];
  const sidMonths = [
    { month: d(2025, 9), status: 'Paid', paidDate: d(2025, 9, 2) },
    { month: d(2025, 10), status: 'Paid', paidDate: d(2025, 10, 1) },
    { month: d(2025, 11), status: 'Paid', paidDate: d(2025, 11, 1) },
    { month: d(2025, 12), status: 'Paid', paidDate: d(2025, 12, 1) },
    { month: d(2026, 1), status: 'Paid', paidDate: d(2026, 1, 2) },
    { month: d(2026, 2), status: 'Paid', paidDate: d(2026, 2, 3) },
    { month: d(2026, 3, 7), status: 'Pending', paidDate: null },
  ];
  for (const p of sidMonths) {
    const doc = await RentPayment.create({
      tenantId: tSiddharth._id,
      propertyId: pUnitA._id,
      amount: 15000,
      dueDate: p.month,
      paidDate: p.paidDate ?? undefined,
      status: p.status,
      paymentMethod: p.status === 'Paid' ? 'Bank Transfer' : undefined,
    });
    sidPayments.push(doc as InstanceType<typeof RentPayment>);
  }
  const sidMarPay = sidPayments[sidPayments.length - 1];

  // Priya (4,200 QAR): Sep–Feb Paid, Mar Pending
  const priyaPayments: InstanceType<typeof RentPayment>[] = [];
  const priyaMonths = [
    { month: d(2025, 9), status: 'Paid', paidDate: d(2025, 9, 6) },
    { month: d(2025, 10), status: 'Paid', paidDate: d(2025, 10, 5) },
    { month: d(2025, 11), status: 'Paid', paidDate: d(2025, 11, 6) },
    { month: d(2025, 12), status: 'Paid', paidDate: d(2025, 12, 4) },
    { month: d(2026, 1), status: 'Paid', paidDate: d(2026, 1, 7) },
    { month: d(2026, 2), status: 'Paid', paidDate: d(2026, 2, 5) },
    { month: d(2026, 3, 7), status: 'Pending', paidDate: null },
  ];
  for (const p of priyaMonths) {
    const doc = await RentPayment.create({
      tenantId: tPriya._id,
      propertyId: pMarina._id,
      amount: 4200,
      dueDate: p.month,
      paidDate: p.paidDate ?? undefined,
      status: p.status,
      paymentMethod: p.status === 'Paid' ? 'Cash' : undefined,
    });
    priyaPayments.push(doc as InstanceType<typeof RentPayment>);
  }
  const priyaMarPay = priyaPayments[priyaPayments.length - 1];

  // John (5,500 QAR) — past tenant, historical payments only
  const johnMonths = [
    { month: d(2025, 9), status: 'Paid', paidDate: d(2025, 9, 8) },
    { month: d(2025, 10), status: 'Paid', paidDate: d(2025, 10, 7) },
    { month: d(2025, 11), status: 'Paid', paidDate: d(2025, 11, 8) },
    { month: d(2025, 12), status: 'Paid', paidDate: d(2025, 12, 6) },
    { month: d(2026, 1), status: 'Paid', paidDate: d(2026, 1, 9) },
  ];
  for (const p of johnMonths) {
    await RentPayment.create({
      tenantId: tJohn._id,
      propertyId: pUnit102._id,
      amount: 5500,
      dueDate: p.month,
      paidDate: p.paidDate,
      status: p.status,
      paymentMethod: 'Cheque',
    });
  }

  logger.info('Rent payments created: 26 total across 4 tenants');

  // ═══════════════════════════════════════════════════════════════════════════
  // OWNER PAYMENTS  (Sep 2025 – Mar 2026)
  // ═══════════════════════════════════════════════════════════════════════════

  // Abdullah (Unit 101, receives 7000/month): Sep–Jan Paid, Feb Overdue, Mar Pending
  const abdullahPayments: InstanceType<typeof OwnerPayment>[] = [];
  for (const [i, month] of [
    d(2025, 9),
    d(2025, 10),
    d(2025, 11),
    d(2025, 12),
    d(2026, 1),
  ].entries()) {
    const doc = await OwnerPayment.create({
      propertyId: pUnit101._id,
      userId: uid,
      amount: 7000,
      paymentMonth: month,
      paidDate: new Date(month.getTime() + 7 * 24 * 60 * 60 * 1000),
      status: 'Paid',
      paymentMethod: 'Cheque',
      chequeNumber: `OP-ABD-${String(i + 1).padStart(3, '0')}`,
      notes: 'Monthly owner settlement.',
    });
    abdullahPayments.push(doc as InstanceType<typeof OwnerPayment>);
  }
  const abdullahFebPay = await OwnerPayment.create({
    propertyId: pUnit101._id,
    userId: uid,
    amount: 7000,
    paymentMonth: d(2026, 2),
    status: 'Overdue', // missed
    notes: 'Payment delayed — awaiting rent collection from tenant.',
  });
  const abdullahMarPay = await OwnerPayment.create({
    propertyId: pUnit101._id,
    userId: uid,
    amount: 7000,
    paymentMonth: d(2026, 3),
    status: 'Pending',
  });

  // Fatima (Unit A, receives 13000/month): Sep–Mar; all Paid except Mar Pending
  const fatimaPayments: InstanceType<typeof OwnerPayment>[] = [];
  for (const [i, month] of [
    d(2025, 9),
    d(2025, 10),
    d(2025, 11),
    d(2025, 12),
    d(2026, 1),
    d(2026, 2),
  ].entries()) {
    const doc = await OwnerPayment.create({
      propertyId: pUnitA._id,
      userId: uid,
      amount: 13000,
      paymentMonth: month,
      paidDate: new Date(month.getTime() + 5 * 24 * 60 * 60 * 1000),
      status: 'Paid',
      paymentMethod: 'Bank Transfer',
      referenceNumber: `FAT-TX-2025-${String(i + 1).padStart(2, '0')}`,
    });
    fatimaPayments.push(doc as InstanceType<typeof OwnerPayment>);
  }
  const fatimaMarPay = await OwnerPayment.create({
    propertyId: pUnitA._id,
    userId: uid,
    amount: 13000,
    paymentMonth: d(2026, 3),
    status: 'Pending',
  });

  // Khalid (Marina Studio, receives 3500/month): Sep–Feb Paid, Mar Pending
  for (const [i, month] of [
    d(2025, 9),
    d(2025, 10),
    d(2025, 11),
    d(2025, 12),
    d(2026, 1),
    d(2026, 2),
  ].entries()) {
    await OwnerPayment.create({
      propertyId: pMarina._id,
      userId: uid,
      amount: 3500,
      paymentMonth: month,
      paidDate: new Date(month.getTime() + 6 * 24 * 60 * 60 * 1000),
      status: 'Paid',
      paymentMethod: 'Cash',
      notes: `Month ${i + 1} settlement.`,
    });
  }
  const khalidMarPay = await OwnerPayment.create({
    propertyId: pMarina._id,
    userId: uid,
    amount: 3500,
    paymentMonth: d(2026, 3),
    status: 'Pending',
  });

  logger.info('Owner payments created across 3 properties');

  // ═══════════════════════════════════════════════════════════════════════════
  // TRANSACTIONS (12 months: Apr 2025 – Mar 2026)
  // ═══════════════════════════════════════════════════════════════════════════

  const txData = [
    // Apr 2025
    {
      date: d(2025, 4, 3),
      type: 'Income',
      category: 'Management Fee',
      amount: 3200,
      desc: 'April management fees collected',
      propertyId: pUnit101._id,
    },
    {
      date: d(2025, 4, 15),
      type: 'Expense',
      category: 'Insurance',
      amount: 2800,
      desc: 'Annual insurance premium Q2 installment',
      propertyId: pUnitA._id,
    },
    // May 2025
    {
      date: d(2025, 5, 5),
      type: 'Income',
      category: 'Late Fee',
      amount: 500,
      desc: 'Late payment fee — Unit 102',
      propertyId: pUnit102._id,
    },
    {
      date: d(2025, 5, 20),
      type: 'Expense',
      category: 'Maintenance',
      amount: 950,
      desc: 'Elevator servicing — Al Dafna Tower',
      propertyId: pMaster1._id,
    },
    // Jun 2025
    {
      date: d(2025, 6, 1),
      type: 'Income',
      category: 'Security Deposit',
      amount: 8400,
      desc: 'Security deposit received — Priya Sharma',
      propertyId: pMarina._id,
    },
    {
      date: d(2025, 6, 18),
      type: 'Expense',
      category: 'Property Tax',
      amount: 1400,
      desc: 'Q2 property tax — Al Dafna Tower',
      propertyId: pMaster1._id,
    },
    // Jul 2025
    {
      date: d(2025, 7, 4),
      type: 'Income',
      category: 'Management Fee',
      amount: 3000,
      desc: 'July management fees',
      propertyId: pUnitA._id,
    },
    {
      date: d(2025, 7, 22),
      type: 'Expense',
      category: 'Cleaning',
      amount: 450,
      desc: 'Deep cleaning — Marina Studio (tenant change)',
      propertyId: pMarina._id,
    },
    // Aug 2025
    {
      date: d(2025, 8, 6),
      type: 'Income',
      category: 'Parking Fee',
      amount: 700,
      desc: 'Parking fees collected — Aug',
      propertyId: pMaster1._id,
    },
    {
      date: d(2025, 8, 14),
      type: 'Expense',
      category: 'Utilities',
      amount: 380,
      desc: 'Common area utilities — Al Dafna Tower',
      propertyId: pMaster1._id,
    },
    // Sep 2025
    {
      date: d(2025, 9, 3),
      type: 'Income',
      category: 'Management Fee',
      amount: 3400,
      desc: 'September management fees',
      propertyId: null,
    },
    {
      date: d(2025, 9, 25),
      type: 'Expense',
      category: 'Repairs',
      amount: 1650,
      desc: 'Plumbing repair — Unit 101 bathroom',
      propertyId: pUnit101._id,
    },
    // Oct 2025
    {
      date: d(2025, 10, 2),
      type: 'Income',
      category: 'Management Fee',
      amount: 3000,
      desc: 'October management fees',
      propertyId: null,
    },
    {
      date: d(2025, 10, 10),
      type: 'Income',
      category: 'Other Income',
      amount: 600,
      desc: 'Storage room rental',
      propertyId: pMaster1._id,
    },
    {
      date: d(2025, 10, 18),
      type: 'Expense',
      category: 'Legal Fees',
      amount: 900,
      desc: 'Contract review — new tenant (Priya)',
      propertyId: pMarina._id,
    },
    {
      date: d(2025, 10, 28),
      type: 'Expense',
      category: 'Maintenance',
      amount: 1300,
      desc: 'External façade touch-up — Pearl Villa',
      propertyId: pMaster2._id,
    },
    // Nov 2025
    {
      date: d(2025, 11, 4),
      type: 'Income',
      category: 'Management Fee',
      amount: 3000,
      desc: 'November management fees',
      propertyId: null,
    },
    {
      date: d(2025, 11, 20),
      type: 'Expense',
      category: 'Insurance',
      amount: 2600,
      desc: 'Annual insurance renewal — Pearl Villa',
      propertyId: pMaster2._id,
    },
    // Dec 2025
    {
      date: d(2025, 12, 3),
      type: 'Income',
      category: 'Management Fee',
      amount: 3000,
      desc: 'December management fees',
      propertyId: null,
    },
    {
      date: d(2025, 12, 10),
      type: 'Income',
      category: 'Late Fee',
      amount: 800,
      desc: 'Late fee — Unit 102 (John Martinez)',
      propertyId: pUnit102._id,
    },
    {
      date: d(2025, 12, 15),
      type: 'Expense',
      category: 'Maintenance',
      amount: 3800,
      desc: 'HVAC full service — Pearl Villa Unit B',
      propertyId: pUnitB._id,
    },
    {
      date: d(2025, 12, 28),
      type: 'Expense',
      category: 'Property Tax',
      amount: 1400,
      desc: 'Q4 property tax — Al Dafna Tower',
      propertyId: pMaster1._id,
    },
    // Jan 2026
    {
      date: d(2026, 1, 5),
      type: 'Income',
      category: 'Management Fee',
      amount: 3000,
      desc: 'January management fees',
      propertyId: null,
    },
    {
      date: d(2026, 1, 12),
      type: 'Income',
      category: 'Other Income',
      amount: 250,
      desc: 'Satellite dish installation fee',
      propertyId: pUnit101._id,
    },
    {
      date: d(2026, 1, 18),
      type: 'Expense',
      category: 'Repairs',
      amount: 650,
      desc: 'Door lock replacement — Unit 102',
      propertyId: pUnit102._id,
    },
    {
      date: d(2026, 1, 25),
      type: 'Expense',
      category: 'Cleaning',
      amount: 320,
      desc: 'Post-tenant cleaning — Unit 102',
      propertyId: pUnit102._id,
    },
    // Feb 2026
    {
      date: d(2026, 2, 5),
      type: 'Income',
      category: 'Management Fee',
      amount: 2500,
      desc: 'February management fees',
      propertyId: null,
    },
    {
      date: d(2026, 2, 8),
      type: 'Expense',
      category: 'Maintenance',
      amount: 4800,
      desc: 'Emergency HVAC replacement — Pearl Villa Unit B',
      propertyId: pUnitB._id,
    },
    {
      date: d(2026, 2, 20),
      type: 'Expense',
      category: 'Utilities',
      amount: 520,
      desc: 'Common area water & electricity — Feb',
      propertyId: pMaster1._id,
    },
    // Mar 2026 (current month)
    {
      date: d(2026, 3, 1),
      type: 'Income',
      category: 'Management Fee',
      amount: 3000,
      desc: 'March management fees',
      propertyId: null,
    },
    {
      date: d(2026, 3, 3),
      type: 'Expense',
      category: 'Property Tax',
      amount: 1400,
      desc: 'Q1 2026 property tax — Pearl Villa',
      propertyId: pMaster2._id,
    },
  ];

  await Transaction.insertMany(
    txData.map((t) => ({
      userId: uid,
      propertyId: t.propertyId ?? undefined,
      type: t.type,
      category: t.category,
      amount: t.amount,
      description: t.desc,
      transactionDate: t.date,
      isRecurring: t.category === 'Management Fee',
      recurringFrequency: t.category === 'Management Fee' ? 'Monthly' : undefined,
    })),
  );

  logger.info(`Transactions created: ${txData.length} entries across 12 months`);

  // ═══════════════════════════════════════════════════════════════════════════
  // TENANT CHEQUES
  // ═══════════════════════════════════════════════════════════════════════════

  // Ahmed — Jan cheque (Deposited), Feb cheque (Bounced), Mar-May post-dated (Pending)
  await TenantCheque.create({
    userId: uid,
    tenantId: tAhmed._id,
    propertyId: pUnit101._id,
    rentPaymentId: rentPayments[4], // Jan paid
    chequeNumber: 'TC-AHM-001',
    bankName: 'Qatar National Bank',
    chequeAmount: 8000,
    chequeDate: d(2026, 1, 5),
    depositDate: d(2026, 1, 7),
    status: 'Deposited',
    notes: 'January 2026 rent cheque.',
  });

  await TenantCheque.create({
    userId: uid,
    tenantId: tAhmed._id,
    propertyId: pUnit101._id,
    rentPaymentId: (ahmedFebOverdue as { _id: mongoose.Types.ObjectId })._id,
    chequeNumber: 'TC-AHM-002',
    bankName: 'Qatar National Bank',
    chequeAmount: 8000,
    chequeDate: d(2026, 2, 1),
    status: 'Bounced',
    notes: 'Cheque returned — insufficient funds. Follow-up required.',
  });

  await TenantCheque.create({
    userId: uid,
    tenantId: tAhmed._id,
    propertyId: pUnit101._id,
    rentPaymentId: (ahmedMarPay as { _id: mongoose.Types.ObjectId })._id,
    chequeNumber: 'TC-AHM-003',
    bankName: 'Qatar National Bank',
    chequeAmount: 8000,
    chequeDate: d(2026, 3, 5), // 1 day from today — triggers upcoming notification
    status: 'Pending',
    notes: 'Post-dated cheque for March 2026.',
  });

  await TenantCheque.create({
    userId: uid,
    tenantId: tAhmed._id,
    propertyId: pUnit101._id,
    chequeNumber: 'TC-AHM-004',
    bankName: 'Qatar National Bank',
    chequeAmount: 8000,
    chequeDate: d(2026, 4, 1),
    status: 'Pending',
    notes: 'Post-dated cheque for April 2026.',
  });

  await TenantCheque.create({
    userId: uid,
    tenantId: tAhmed._id,
    propertyId: pUnit101._id,
    chequeNumber: 'TC-AHM-005',
    bankName: 'Qatar National Bank',
    chequeAmount: 8000,
    chequeDate: d(2026, 5, 1),
    status: 'Pending',
    notes: 'Post-dated cheque for May 2026.',
  });

  // Siddharth — Feb cheque (Cleared), Mar cheque (Pending)
  await TenantCheque.create({
    userId: uid,
    tenantId: tSiddharth._id,
    propertyId: pUnitA._id,
    rentPaymentId: (sidPayments[sidPayments.length - 2] as { _id: mongoose.Types.ObjectId })._id, // Feb paid
    chequeNumber: 'TC-SID-001',
    bankName: 'Commercial Bank of Qatar',
    chequeAmount: 15000,
    chequeDate: d(2026, 2, 3),
    depositDate: d(2026, 2, 5),
    status: 'Cleared',
    notes: 'February 2026 — cleared successfully.',
  });

  await TenantCheque.create({
    userId: uid,
    tenantId: tSiddharth._id,
    propertyId: pUnitA._id,
    rentPaymentId: (sidMarPay as { _id: mongoose.Types.ObjectId })._id,
    chequeNumber: 'TC-SID-002',
    bankName: 'Commercial Bank of Qatar',
    chequeAmount: 15000,
    chequeDate: d(2026, 3, 7),
    status: 'Pending',
    notes: 'March 2026 post-dated cheque.',
  });

  // Priya — Feb cheque (Cleared), Mar cheque (Pending, upcoming in 3 days)
  await TenantCheque.create({
    userId: uid,
    tenantId: tPriya._id,
    propertyId: pMarina._id,
    rentPaymentId: (priyaPayments[priyaPayments.length - 2] as { _id: mongoose.Types.ObjectId })
      ._id,
    chequeNumber: 'TC-PRI-001',
    bankName: 'Masraf Al Rayan',
    chequeAmount: 4200,
    chequeDate: d(2026, 2, 5),
    depositDate: d(2026, 2, 7),
    status: 'Cleared',
    notes: 'Feb 2026 cleared.',
  });

  await TenantCheque.create({
    userId: uid,
    tenantId: tPriya._id,
    propertyId: pMarina._id,
    rentPaymentId: (priyaMarPay as { _id: mongoose.Types.ObjectId })._id,
    chequeNumber: 'TC-PRI-002',
    bankName: 'Masraf Al Rayan',
    chequeAmount: 4200,
    chequeDate: d(2026, 3, 6), // 2 days from today — upcoming ✓
    status: 'Pending',
    notes: 'March 2026 post-dated cheque.',
  });

  // John — one historical cleared cheque
  await TenantCheque.create({
    userId: uid,
    tenantId: tJohn._id,
    propertyId: pUnit102._id,
    chequeNumber: 'TC-JHN-001',
    bankName: 'Doha Bank',
    chequeAmount: 5500,
    chequeDate: d(2026, 1, 9),
    depositDate: d(2026, 1, 12),
    status: 'Cleared',
    notes: 'Final rent payment before moveout.',
  });

  logger.info('Tenant cheques created: 10 cheques (Pending/Deposited/Bounced/Cleared)');

  // ═══════════════════════════════════════════════════════════════════════════
  // OWNER CHEQUES
  // ═══════════════════════════════════════════════════════════════════════════

  // Abdullah (Unit 101) — Jan Cleared, Feb Issued, Mar Issued
  await OwnerCheque.create({
    userId: uid,
    propertyId: pUnit101._id,
    ownerPaymentId: abdullahPayments[4]?._id, // Jan paid
    chequeNumber: 'OC-ABD-001',
    bankName: 'Qatar National Bank',
    chequeAmount: 7000,
    chequeDate: d(2026, 1, 10),
    issueDate: d(2026, 1, 8),
    status: 'Cleared',
    notes: 'January 2026 owner settlement.',
  });

  await OwnerCheque.create({
    userId: uid,
    propertyId: pUnit101._id,
    ownerPaymentId: (abdullahFebPay as { _id: mongoose.Types.ObjectId })._id,
    chequeNumber: 'OC-ABD-002',
    bankName: 'Qatar National Bank',
    chequeAmount: 7000,
    chequeDate: d(2026, 2, 10),
    issueDate: d(2026, 2, 8),
    status: 'Bounced',
    notes: 'Bounced — reissued pending.',
  });

  await OwnerCheque.create({
    userId: uid,
    propertyId: pUnit101._id,
    ownerPaymentId: (abdullahMarPay as { _id: mongoose.Types.ObjectId })._id,
    chequeNumber: 'OC-ABD-003',
    bankName: 'Qatar National Bank',
    chequeAmount: 7000,
    chequeDate: d(2026, 3, 8), // 4 days from today — upcoming ✓
    issueDate: d(2026, 3, 4),
    status: 'Issued',
    notes: 'March 2026 owner cheque — to be presented.',
  });

  // Fatima (Unit A) — Feb Cleared, Mar Issued
  await OwnerCheque.create({
    userId: uid,
    propertyId: pUnitA._id,
    ownerPaymentId: (fatimaPayments[fatimaPayments.length - 1] as { _id: mongoose.Types.ObjectId })
      ._id,
    chequeNumber: 'OC-FAT-001',
    bankName: 'Commercial Bank of Qatar',
    chequeAmount: 13000,
    chequeDate: d(2026, 2, 7),
    issueDate: d(2026, 2, 5),
    status: 'Cleared',
    notes: 'February 2026 settlement.',
  });

  await OwnerCheque.create({
    userId: uid,
    propertyId: pUnitA._id,
    ownerPaymentId: (fatimaMarPay as { _id: mongoose.Types.ObjectId })._id,
    chequeNumber: 'OC-FAT-002',
    bankName: 'Commercial Bank of Qatar',
    chequeAmount: 13000,
    chequeDate: d(2026, 3, 9),
    issueDate: d(2026, 3, 4),
    status: 'Issued',
  });

  // Khalid (Marina Studio) — Mar Issued (due March 6 = 2 days → upcoming ✓)
  await OwnerCheque.create({
    userId: uid,
    propertyId: pMarina._id,
    ownerPaymentId: (khalidMarPay as { _id: mongoose.Types.ObjectId })._id,
    chequeNumber: 'OC-KHA-001',
    bankName: 'Masraf Al Rayan',
    chequeAmount: 3500,
    chequeDate: d(2026, 3, 6), // 2 days from today — upcoming ✓
    issueDate: d(2026, 3, 4),
    status: 'Issued',
    notes: 'March 2026 — Khalid Hussain.',
  });

  logger.info('Owner cheques created: 6 cheques (Cleared/Bounced/Issued)');

  // ═══════════════════════════════════════════════════════════════════════════
  // MAINTENANCE REQUESTS
  // ═══════════════════════════════════════════════════════════════════════════

  await MaintenanceRequest.create({
    userId: uid,
    propertyId: pUnitB._id,
    tenantId: tMaria._id,
    title: 'Full HVAC System Replacement',
    description:
      'The entire HVAC system in Pearl Villa Unit B has failed. Emergency replacement required before new tenant move-in on April 1st. Unit currently uninhabitable.',
    priority: 'Emergency',
    status: 'In Progress',
    cost: 28000,
    notes:
      'Contractor: Al-Noor HVAC Services. Works started March 1. Expected completion March 20.',
  });

  await MaintenanceRequest.create({
    userId: uid,
    propertyId: pUnit101._id,
    tenantId: tAhmed._id,
    title: 'Kitchen Tap Leaking',
    description:
      'Persistent slow leak from the kitchen mixer tap. Tenant reported water damage under cabinet.',
    priority: 'Medium',
    status: 'In Progress',
    cost: 350,
    notes: 'Plumber scheduled for March 7.',
  });

  await MaintenanceRequest.create({
    userId: uid,
    propertyId: pUnitA._id,
    tenantId: tSiddharth._id,
    title: 'Exterior Wall Paint Peeling',
    description:
      'Paint peeling on the east-facing exterior wall due to moisture ingress. Cosmetic issue.',
    priority: 'Low',
    status: 'Pending',
    cost: 1200,
    notes: 'Tenant requested professional assessment.',
  });

  await MaintenanceRequest.create({
    userId: uid,
    propertyId: pMarina._id,
    tenantId: tPriya._id,
    title: 'Bathroom Waterproofing',
    description:
      'Bathroom shower area needed full waterproofing membrane replacement. Job completed successfully.',
    priority: 'High',
    status: 'Completed',
    cost: 2800,
    completedDate: d(2026, 1, 20),
    notes: 'Work completed Jan 20. No further issues reported.',
  });

  await MaintenanceRequest.create({
    userId: uid,
    propertyId: pUnit102._id,
    title: 'Main Door Lock Replacement',
    description:
      'Replace old door lock with smart lock system. Requested by new prospective tenant.',
    priority: 'Medium',
    status: 'Cancelled',
    notes: 'Cancelled — new tenant arrangement fell through.',
  });

  await MaintenanceRequest.create({
    userId: uid,
    propertyId: pMaster1._id,
    title: 'Lobby CCTV Camera Upgrade',
    description:
      'Replace 4 lobby CCTV cameras with HD models. Current cameras have poor night vision.',
    priority: 'Medium',
    status: 'Pending',
    cost: 4500,
    notes: 'Quotes requested from 3 vendors.',
  });

  logger.info('Maintenance requests created: 6 requests (all statuses & priorities)');

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTRACTS
  // ═══════════════════════════════════════════════════════════════════════════

  await Contract.create({
    userId: uid,
    tenantId: tAhmed._id,
    landlordName: 'Abdullah Al-Rashid',
    landlordAddress: '45 Al Dafna Street, Doha, Qatar',
    landlordPhone: '+974 5512 3456',
    landlordEmail: 'abdullah.alrashid@gmail.com',
    tenantName: 'Ahmed Hassan',
    tenantPhone: '+974 5511 2233',
    tenantEmail: 'ahmed.hassan@gmail.com',
    tenantQatarId: '28401122334',
    propertyName: 'Al Dafna Tower — Unit 101',
    propertyAddress: '45 Al Dafna Street, Unit 101, Doha, Qatar',
    propertyCity: 'Doha',
    propertyState: 'Ad Dawhah',
    propertyZip: '22210',
    propertyType: 'Apartment',
    propertyBedrooms: 2,
    propertyBathrooms: 2,
    propertySquareFeet: 1350,
    leaseStart: d(2025, 1, 1),
    leaseEnd: d(2026, 12, 31),
    monthlyRent: 8000,
    securityDeposit: 16000,
    lateFee: 500,
    noticePeriod: '2 months',
    returnPeriod: '30 days',
    petsAllowed: false,
    utilitiesResponsible: 'Tenant',
    governingLaw: 'Qatar',
    agreementDate: d(2024, 12, 28),
    emergencyContactName: 'Layla Hassan',
    emergencyContactPhone: '+974 5511 9988',
    termsRent:
      'Monthly rent of QAR 8,000 is due on the 1st of each month. A late fee of QAR 500 applies for payments received after the 5th.',
    termsSecurity:
      'Security deposit of QAR 16,000 will be returned within 30 days of lease end, subject to property inspection.',
    termsUse:
      'The premises shall be used exclusively as a private residential dwelling by the Tenant and their immediate family.',
    termsMaintenance:
      'Tenant is responsible for minor maintenance (under QAR 200). Landlord is responsible for structural and major appliance repairs.',
    termsUtilities:
      'Tenant shall pay all utility bills including electricity, water, and internet directly to the service providers.',
    termsQuiet:
      'Tenant agrees to maintain quiet enjoyment of the premises and shall not disturb other residents.',
    termsAccess:
      'Landlord shall provide 24-hour written notice before entering the premises except in emergencies.',
    termsPets: 'No pets are permitted on the premises.',
    termsInsurance:
      'Tenant is strongly advised to obtain renters insurance to cover personal belongings.',
    termsDefault:
      'Failure to pay rent for 15 days after the due date constitutes default. Landlord may initiate eviction proceedings.',
    termsTermination: 'Either party may terminate this agreement with 2 months written notice.',
    termsHoldover:
      'If Tenant remains after lease expiry without written extension, a month-to-month arrangement applies at 110% of the last agreed rent.',
    termsGoverning: 'This agreement shall be governed by the laws of the State of Qatar.',
    termsEntire:
      'This agreement constitutes the entire agreement between the parties and supersedes all prior negotiations.',
    termsSeverability:
      'If any provision of this agreement is found unenforceable, the remaining provisions shall remain in full force.',
  });

  await Contract.create({
    userId: uid,
    tenantId: tSiddharth._id,
    landlordName: 'Fatima Al-Mansoori',
    landlordAddress: '12 Pearl District Boulevard, Doha, Qatar',
    landlordPhone: '+974 5523 4567',
    landlordEmail: 'fatima.mansoori@email.com',
    tenantName: 'Siddharth Patel',
    tenantPhone: '+974 5522 3344',
    tenantEmail: 'siddharth.patel@outlook.com',
    tenantQatarId: '29511233445',
    propertyName: 'Pearl Villa — Unit A',
    propertyAddress: '12 Pearl District Blvd, Villa A, Doha, Qatar',
    propertyCity: 'Doha',
    propertyState: 'Ad Dawhah',
    propertyZip: '22001',
    propertyType: 'Villa',
    propertyBedrooms: 4,
    propertyBathrooms: 3,
    propertySquareFeet: 4200,
    leaseStart: d(2025, 2, 1),
    leaseEnd: d(2027, 1, 31),
    monthlyRent: 15000,
    securityDeposit: 30000,
    lateFee: 1000,
    noticePeriod: '3 months',
    returnPeriod: '30 days',
    petsAllowed: true,
    petDeposit: 5000,
    utilitiesResponsible: 'Tenant',
    governingLaw: 'Qatar',
    agreementDate: d(2025, 1, 20),
    termsRent:
      'Monthly rent of QAR 15,000 due on the 1st. Late fee of QAR 1,000 applies after the 5th.',
    termsSecurity: 'Security deposit of QAR 30,000 held against damage and unpaid rent.',
    termsUse: 'Residential use only. Corporate housing permitted for Tenant and family.',
    termsMaintenance: 'Tenant responsible for minor repairs under QAR 500.',
    termsUtilities: 'Tenant pays all utilities directly.',
    termsQuiet: 'Tenant to maintain quiet between 10 PM and 7 AM.',
    termsAccess: 'Landlord to give 48 hours notice for non-emergency access.',
    termsPets: 'One dog or cat permitted. Pet deposit of QAR 5,000 applies.',
  });

  await Contract.create({
    userId: uid,
    tenantId: tPriya._id,
    landlordName: 'Khalid Hussain',
    landlordAddress: 'Tower 7, West Bay Marina, Doha, Qatar',
    landlordPhone: '+974 5534 5678',
    tenantName: 'Priya Sharma',
    tenantPhone: '+974 5533 4455',
    tenantEmail: 'priya.sharma@yahoo.com',
    tenantQatarId: '30600344556',
    propertyName: 'West Bay Marina Studio 304',
    propertyAddress: 'Tower 7, West Bay Marina, Unit 304, Doha, Qatar',
    propertyCity: 'Doha',
    propertyState: 'Ad Dawhah',
    propertyZip: '22445',
    propertyType: 'Studio',
    propertyBedrooms: 0,
    propertyBathrooms: 1,
    propertySquareFeet: 620,
    leaseStart: d(2025, 6, 1),
    leaseEnd: d(2026, 3, 31),
    monthlyRent: 4200,
    securityDeposit: 8400,
    lateFee: 300,
    noticePeriod: '1 month',
    returnPeriod: '21 days',
    petsAllowed: false,
    utilitiesResponsible: 'Tenant',
    governingLaw: 'Qatar',
    agreementDate: d(2025, 5, 25),
    termsRent: 'Monthly rent of QAR 4,200 due on the 1st. Late fee of QAR 300 after the 5th.',
    termsSecurity: 'Security deposit of QAR 8,400 refundable within 21 days of lease end.',
    termsUse: 'Residential use only by Tenant.',
    termsMaintenance: 'Tenant responsible for minor repairs under QAR 150.',
    termsUtilities: 'Tenant pays water, electricity, and internet.',
  });

  logger.info('Contracts created: 3 (Ahmed, Siddharth, Priya)');

  // ═══════════════════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════
  logger.info(
    {
      properties: 7,
      tenants: 5,
      rentPayments: 26,
      ownerPayments: 16,
      tenantCheques: 10,
      ownerCheques: 6,
      transactions: txData.length,
      maintenanceRequests: 6,
      contracts: 3,
    },
    '✅ Demo seed complete.',
  );

  logger.info('');
  logger.info('── TEST SCENARIOS COVERED ──────────────────────────────────────');
  logger.info('Dashboard:    3 occupied props, 1 vacant unit, 1 under maintenance');
  logger.info('              12-month cashflow chart with real income+expense data');
  logger.info('              Overdue rent: Ahmed Feb 2026 (QAR 8,000)');
  logger.info('              Upcoming rent (30d): Mar 7 payments = QAR 27,200 total');
  logger.info('Notifications: Overdue rent ✓  Rent due soon (Mar 7) ✓');
  logger.info('              Lease expiring: Priya (Mar 31) ✓  Maintenance pending ✓');
  logger.info('              Tenant cheques upcoming: Ahmed Mar 5, Priya Mar 6 ✓');
  logger.info('              Owner cheques upcoming: Abdullah Mar 8, Khalid Mar 6 ✓');
  logger.info('Cheques:      Tenant — Pending/Deposited/Bounced/Cleared all present');
  logger.info('              Owner  — Issued/Cleared/Bounced all present');
  logger.info('Maintenance:  Emergency(In Progress) + High(Completed) + Medium + Low + Cancelled');
  logger.info('Contracts:    3 linked contracts with full terms');
  logger.info('Accounting:   12 months of transactions for P&L / Balance Sheet');
  logger.info('Reports:      Multi-property performance with master→unit hierarchy');
}

// ── Entry point ───────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  try {
    await connectDB();
    await seed();
  } catch (err) {
    logger.error({ err }, '❌ Demo seed failed');
    process.exitCode = 1;
  } finally {
    await disconnectDB();
  }
}

void main();
