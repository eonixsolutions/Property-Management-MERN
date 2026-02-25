import mongoose, { Schema, model } from 'mongoose';

// ── Enums & constants ──────────────────────────────────────────────────────

export type TenantStatus = 'Active' | 'Past' | 'Pending';

// ── Subdocument interface ──────────────────────────────────────────────────

export interface IEmergencyContact {
  name?: string;
  phone?: string;
}

// ── Main document interface ────────────────────────────────────────────────

export interface ITenant {
  propertyId: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  alternatePhone?: string;
  qatarId?: string;
  moveInDate?: Date;
  moveOutDate?: Date;
  leaseStart?: Date;
  leaseEnd?: Date;
  monthlyRent: number;
  securityDeposit?: number;
  status: TenantStatus;
  emergencyContact?: IEmergencyContact;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Subdocument schema ─────────────────────────────────────────────────────

const emergencyContactSchema = new Schema<IEmergencyContact>(
  {
    name: { type: String, trim: true },
    phone: { type: String, trim: true },
  },
  { _id: false },
);

// ── Tenant schema ──────────────────────────────────────────────────────────

const tenantSchema = new Schema<ITenant>(
  {
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: 'Property',
      required: [true, 'propertyId is required'],
      index: true,
    },

    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },

    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
    },

    email: { type: String, trim: true },
    phone: { type: String, trim: true },
    alternatePhone: { type: String, trim: true },
    qatarId: { type: String, trim: true },

    moveInDate: Date,
    moveOutDate: Date,
    leaseStart: Date,
    leaseEnd: Date,

    monthlyRent: {
      type: Number,
      required: [true, 'Monthly rent is required'],
      min: [0, 'Monthly rent must be non-negative'],
    },

    securityDeposit: {
      type: Number,
      min: [0, 'Security deposit must be non-negative'],
    },

    status: {
      type: String,
      enum: {
        values: ['Active', 'Past', 'Pending'],
        message: "Status must be 'Active', 'Past', or 'Pending'",
      },
      default: 'Pending',
      index: true,
    },

    emergencyContact: {
      type: emergencyContactSchema,
    },

    notes: { type: String, trim: true },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Additional index per migration plan
tenantSchema.index({ leaseEnd: 1 });

// ── Hooks ──────────────────────────────────────────────────────────────────

/**
 * BL-01: After tenant is saved (create or update), recalculate the property
 * status. Dynamic import breaks the tenant.model ↔ property.model circular dep.
 */
tenantSchema.post('save', async function (doc) {
  const { updatePropertyStatus } = await import('./property.model');
  await updatePropertyStatus(doc.propertyId);
});

/**
 * BL-01: After tenant is deleted via findByIdAndDelete (which internally calls
 * findOneAndDelete), recalculate the property status.
 */
tenantSchema.post('findOneAndDelete', async function (doc: ITenant | null) {
  if (doc) {
    const { updatePropertyStatus } = await import('./property.model');
    await updatePropertyStatus(doc.propertyId);
  }
});

// ── Model ──────────────────────────────────────────────────────────────────

export const Tenant = model<ITenant>('Tenant', tenantSchema);
