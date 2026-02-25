import mongoose, { Schema, model } from 'mongoose';

// ── Enums ──────────────────────────────────────────────────────────────────

export type TenantChequeStatus = 'Pending' | 'Deposited' | 'Bounced' | 'Cleared';

// ── Interface ──────────────────────────────────────────────────────────────

export interface ITenantCheque {
  userId: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  propertyId: mongoose.Types.ObjectId;
  rentPaymentId?: mongoose.Types.ObjectId;
  chequeNumber: string;
  bankName?: string;
  chequeAmount: number;
  chequeDate: Date;
  depositDate?: Date;
  status: TenantChequeStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ─────────────────────────────────────────────────────────────────

const tenantChequeSchema = new Schema<ITenantCheque>(
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
      required: [true, 'tenantId is required'],
      index: true,
    },
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: 'Property',
      required: [true, 'propertyId is required'],
      index: true,
    },
    rentPaymentId: {
      type: Schema.Types.ObjectId,
      ref: 'RentPayment',
      default: null,
    },
    chequeNumber: {
      type: String,
      required: [true, 'chequeNumber is required'],
      trim: true,
      index: true,
    },
    bankName: { type: String, trim: true },
    chequeAmount: {
      type: Number,
      required: [true, 'chequeAmount is required'],
      min: [0, 'chequeAmount must be non-negative'],
    },
    chequeDate: {
      type: Date,
      required: [true, 'chequeDate is required'],
      index: true,
    },
    depositDate: Date,
    status: {
      type: String,
      enum: {
        values: ['Pending', 'Deposited', 'Bounced', 'Cleared'],
        message: "status must be 'Pending', 'Deposited', 'Bounced', or 'Cleared'",
      },
      default: 'Pending',
      index: true,
    },
    notes: { type: String, trim: true },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// ── Model ──────────────────────────────────────────────────────────────────

export const TenantCheque = model<ITenantCheque>('TenantCheque', tenantChequeSchema);
