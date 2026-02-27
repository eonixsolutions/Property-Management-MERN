import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Property } from '../models/property.model';

dotenv.config();

async function seedProperties() {
  try {
    await mongoose.connect(process.env.MONGO_URI!);
    console.log('Connected to MongoDB');

    await Property.deleteMany({});

    // 🔴 Replace with real user _id
    const user1 = new mongoose.Types.ObjectId("PUT_USER1_ID_HERE");

    // Create fixed ObjectIds to maintain relationships
    const property1 = new mongoose.Types.ObjectId();
    const property2 = new mongoose.Types.ObjectId();
    const property3 = new mongoose.Types.ObjectId();
    const property5 = new mongoose.Types.ObjectId();
    const property6 = new mongoose.Types.ObjectId();
    const property7 = new mongoose.Types.ObjectId();

    await Property.insertMany([
      // ===== MASTER PROPERTY 1 =====
      {
        _id: property1,
        userId: user1,
        type: 'master',
        parentPropertyId: null,
        owner: {
          name: 'Sulthan',
          email: 'sidhyk@gmail.com',
          monthlyRentAmount: 8000,
        },
        propertyName: 'Thumama Villa 21',
        address: 'Doha Qatar',
        city: 'Nuaija',
        state: 'Doha',
        zipCode: '610',
        country: 'Qatar',
        propertyType: 'Villa',
        bedrooms: 6,
        bathrooms: 6,
        status: 'Vacant',
        images: [],
        createdAt: new Date('2025-11-17T18:14:30'),
        updatedAt: new Date('2025-11-17T22:53:26'),
      },

      // ===== UNIT 1 =====
      {
        _id: property2,
        userId: user1,
        type: 'unit',
        parentPropertyId: property1,
        unitName: '1',
        owner: {},
        propertyName: 'Unit 1',
        address: 'Doha Qatar',
        city: 'pitipana',
        state: 'Qa',
        zipCode: '610',
        country: 'USA',
        propertyType: 'Apartment',
        bedrooms: 1,
        bathrooms: 1,
        defaultRent: 1800,
        status: 'Occupied',
        images: [],
        createdAt: new Date('2025-11-17T18:14:56'),
        updatedAt: new Date('2025-11-17T19:35:19'),
      },

      // ===== UNIT 2 =====
      {
        _id: property3,
        userId: user1,
        type: 'unit',
        parentPropertyId: property1,
        unitName: '2',
        owner: {},
        propertyName: 'Unit 2',
        address: 'Doha Qatar',
        city: 'pitipana',
        state: 'Qa',
        zipCode: '610',
        country: 'USA',
        propertyType: 'Apartment',
        bedrooms: 1,
        bathrooms: 1,
        defaultRent: 1800,
        status: 'Occupied',
        images: [],
        createdAt: new Date('2025-11-17T18:15:22'),
        updatedAt: new Date('2025-11-17T23:06:41'),
      },

      // ===== UNIT 3 =====
      {
        _id: property5,
        userId: user1,
        type: 'unit',
        parentPropertyId: property1,
        unitName: '3',
        owner: {},
        propertyName: 'unit 3',
        address: 'Doha Qatar',
        city: 'pitipana',
        state: 'Qa',
        zipCode: '610',
        country: 'USA',
        propertyType: 'Apartment',
        bedrooms: 2,
        bathrooms: 2,
        defaultRent: 2800,
        status: 'Vacant',
        images: [],
        createdAt: new Date('2025-11-17T22:47:30'),
        updatedAt: new Date('2025-11-17T22:47:30'),
      },

      // ===== MASTER PROPERTY 6 =====
      {
        _id: property6,
        userId: user1,
        type: 'master',
        parentPropertyId: null,
        owner: {
          name: 'Thameem',
          contact: 'Doha Qatar',
          email: 'sidhykdsd@gmail.com',
          phone: '+97454578712',
          monthlyRentAmount: 6000,
        },
        propertyName: 'Villa Mathar',
        address: 'Doha Qatar',
        city: 'Rayyan',
        state: 'Doha',
        country: 'Qatar',
        propertyType: 'Villa',
        bedrooms: 10,
        bathrooms: 10,
        status: 'Vacant',
        images: [],
        createdAt: new Date('2025-11-17T23:05:11'),
        updatedAt: new Date('2025-11-17T23:05:11'),
      },

      // ===== UNIT under property 6 =====
      {
        _id: property7,
        userId: user1,
        type: 'unit',
        parentPropertyId: property6,
        unitName: '1',
        owner: {},
        propertyName: 'Unit 1',
        images: [],
      },
    ]);

    console.log('Properties seeded successfully');
    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

seedProperties();