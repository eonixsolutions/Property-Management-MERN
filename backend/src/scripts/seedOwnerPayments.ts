import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { OwnerPayment } from '../models/owner-payment.model';

dotenv.config();

async function seedOwnerPayments() {
  try {
    await mongoose.connect(process.env.MONGO_URI!);

    console.log('Connected to MongoDB');

    // 🔴 REPLACE THESE WITH REAL IDS
    const property1 = new mongoose.Types.ObjectId("PUT_PROPERTY1_ID_HERE");
    const property6 = new mongoose.Types.ObjectId("PUT_PROPERTY6_ID_HERE");
    const user1 = new mongoose.Types.ObjectId("PUT_USER1_ID_HERE");

    await OwnerPayment.deleteMany({}); // optional: clear old data

    await OwnerPayment.insertMany([
      // --- Paid Records ---
      {
        propertyId: property1,
        userId: user1,
        amount: 5000,
        paymentMonth: new Date(2025, 10, 1), // Nov 2025
        paidDate: new Date('2025-11-17'),
        paymentMethod: 'Cash',
        status: 'Paid',
      },
      {
        propertyId: property1,
        userId: user1,
        amount: 8000,
        paymentMonth: new Date(2025, 10, 1),
        paidDate: new Date('2025-11-17'),
        paymentMethod: 'Cash',
        status: 'Paid',
      },
      {
        propertyId: property1,
        userId: user1,
        amount: 8000,
        paymentMonth: new Date(2025, 10, 1),
        paidDate: new Date('2025-11-17'),
        paymentMethod: 'Bank Transfer',
        status: 'Paid',
      },

      // --- Pending Property 1 (8000 series) ---
      ...[
        '2025-11-01','2025-12-01','2026-01-01','2026-02-01',
        '2026-03-01','2026-04-01','2026-05-01','2026-06-01',
        '2026-07-01','2026-08-01','2026-09-01','2026-10-01',
        '2026-11-01'
      ].map(date => ({
        propertyId: property1,
        userId: user1,
        amount: 8000,
        paymentMonth: new Date(date),
        paymentMethod: 'Bank Transfer',
        status: 'Pending',
      })),

      // --- Pending Property 6 (6000 series) ---
      ...[
        '2025-11-01','2025-12-01','2026-01-01','2026-02-01',
        '2026-03-01','2026-04-01','2026-05-01','2026-06-01',
        '2026-07-01'
      ].map(date => ({
        propertyId: property6,
        userId: user1,
        amount: 6000,
        paymentMonth: new Date(date),
        paymentMethod: 'Bank Transfer',
        status: 'Pending',
      })),
    ]);

    console.log('OwnerPayments seeded successfully');
    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

seedOwnerPayments();