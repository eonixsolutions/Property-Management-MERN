import mongoose, { Schema, model } from 'mongoose';

// ── Types ─────────────────────────────────────────────────────────────────────

export type UtilitiesResponsible = 'Tenant' | 'Landlord' | 'Shared';

// ── Main document interface ────────────────────────────────────────────────

export interface IContract {
  userId: mongoose.Types.ObjectId;
  tenantId?: mongoose.Types.ObjectId;

  // Landlord
  landlordName?: string;
  landlordAddress?: string;
  landlordPhone?: string;
  landlordEmail?: string;

  // Tenant
  tenantName?: string;
  tenantPhone?: string;
  tenantEmail?: string;
  tenantAlternatePhone?: string;
  tenantQatarId?: string;

  // Property
  propertyName?: string;
  propertyAddress?: string;
  propertyCity?: string;
  propertyState?: string;
  propertyZip?: string;
  propertyType?: string;
  propertyBedrooms?: number;
  propertyBathrooms?: number;
  propertySquareFeet?: number;

  // Lease terms
  leaseStart?: Date;
  leaseEnd?: Date;
  monthlyRent?: number;
  securityDeposit?: number;
  lateFee?: string;
  returnPeriod?: string;
  noticePeriod?: string;
  holdoverRate?: string;
  petsAllowed: boolean;
  petDeposit?: number;
  utilitiesResponsible?: UtilitiesResponsible;
  governingLaw?: string;

  // Terms (15 editable sections)
  termsRent?: string;
  termsSecurity?: string;
  termsUse?: string;
  termsMaintenance?: string;
  termsUtilities?: string;
  termsQuiet?: string;
  termsAccess?: string;
  termsPets?: string;
  termsInsurance?: string;
  termsDefault?: string;
  termsTermination?: string;
  termsHoldover?: string;
  termsGoverning?: string;
  termsEntire?: string;
  termsSeverability?: string;

  // Emergency contact
  emergencyContactName?: string;
  emergencyContactPhone?: string;

  agreementDate?: Date;

  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ────────────────────────────────────────────────────────────────────

const contractSchema = new Schema<IContract>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'userId is required'],
      index: true,
    },

    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      default: null,
      index: true,
    },

    // Landlord
    landlordName: { type: String, trim: true },
    landlordAddress: { type: String, trim: true },
    landlordPhone: { type: String, trim: true },
    landlordEmail: { type: String, trim: true },

    // Tenant
    tenantName: { type: String, trim: true },
    tenantPhone: { type: String, trim: true },
    tenantEmail: { type: String, trim: true },
    tenantAlternatePhone: { type: String, trim: true },
    tenantQatarId: { type: String, trim: true },

    // Property
    propertyName: { type: String, trim: true },
    propertyAddress: { type: String, trim: true },
    propertyCity: { type: String, trim: true },
    propertyState: { type: String, trim: true },
    propertyZip: { type: String, trim: true },
    propertyType: { type: String, trim: true },
    propertyBedrooms: { type: Number, min: 0 },
    propertyBathrooms: { type: Number, min: 0 },
    propertySquareFeet: { type: Number, min: 0 },

    // Lease terms
    leaseStart: Date,
    leaseEnd: Date,
    monthlyRent: { type: Number, min: 0 },
    securityDeposit: { type: Number, min: 0 },
    lateFee: { type: String, trim: true },
    returnPeriod: { type: String, trim: true },
    noticePeriod: { type: String, trim: true },
    holdoverRate: { type: String, trim: true },
    petsAllowed: { type: Boolean, default: false },
    petDeposit: { type: Number, min: 0 },
    utilitiesResponsible: {
      type: String,
      enum: {
        values: ['Tenant', 'Landlord', 'Shared'],
        message: "utilitiesResponsible must be 'Tenant', 'Landlord', or 'Shared'",
      },
      default: 'Tenant',
    },
    governingLaw: { type: String, trim: true, default: 'Qatar' },

    // Terms
    termsRent: { type: String, trim: true },
    termsSecurity: { type: String, trim: true },
    termsUse: { type: String, trim: true },
    termsMaintenance: { type: String, trim: true },
    termsUtilities: { type: String, trim: true },
    termsQuiet: { type: String, trim: true },
    termsAccess: { type: String, trim: true },
    termsPets: { type: String, trim: true },
    termsInsurance: { type: String, trim: true },
    termsDefault: { type: String, trim: true },
    termsTermination: { type: String, trim: true },
    termsHoldover: { type: String, trim: true },
    termsGoverning: { type: String, trim: true },
    termsEntire: { type: String, trim: true },
    termsSeverability: { type: String, trim: true },

    // Emergency contact
    emergencyContactName: { type: String, trim: true },
    emergencyContactPhone: { type: String, trim: true },

    agreementDate: Date,
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// ── Model ─────────────────────────────────────────────────────────────────────

export const Contract = model<IContract>('Contract', contractSchema);
