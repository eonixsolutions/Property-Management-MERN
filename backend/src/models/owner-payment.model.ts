import mongoose, { Schema, model } from 'mongoose';

// ── Enums ──────────────────────────────────────────────────────────────────

export type OwnerPaymentStatus = 'Pending' | 'Paid' | 'Overdue';

export const OWNER_PAYMENT_METHODS = [
  'Cash',
  'Cheque',
  'Bank Transfer',
  'Online',
  'Other',
] as const;

export type OwnerPaymentMethod = (typeof OWNER_PAYMENT_METHODS)[number];

// ── Interface ──────────────────────────────────────────────────────────────

export interface IOwnerPayment {
  propertyId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  amount: number;
  /**
   * Stored as the 1st of the month (YYYY-MM-01) to simplify month-based
   * deduplication and querying. Index allows fast month-range lookups.
   */
  paymentMonth: Date;
  paidDate?: Date;
  chequeNumber?: string;
  paymentMethod?: OwnerPaymentMethod;
  referenceNumber?: string;
  notes?: string;
  status: OwnerPaymentStatus;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ─────────────────────────────────────────────────────────────────

const ownerPaymentSchema = new Schema<IOwnerPayment>(
  {
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: 'Property',
      required: [true, 'propertyId is required'],
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'userId is required'],
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'amount is required'],
      min: [0, 'amount must be non-negative'],
    },
    paymentMonth: {
      type: Date,
      required: [true, 'paymentMonth is required'],
      index: true,
    },
    paidDate: Date,
    chequeNumber: { type: String, trim: true },
    paymentMethod: {
      type: String,
      enum: {
        values: OWNER_PAYMENT_METHODS,
        message: `paymentMethod must be one of: ${OWNER_PAYMENT_METHODS.join(', ')}`,
      },
    },
    referenceNumber: { type: String, trim: true },
    notes: { type: String, trim: true },
    status: {
      type: String,
      enum: {
        values: ['Pending', 'Paid', 'Overdue'],
        message: "status must be 'Pending', 'Paid', or 'Overdue'",
      },
      default: 'Pending',
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// ── Model ──────────────────────────────────────────────────────────────────

export const OwnerPayment = model<IOwnerPayment>('OwnerPayment', ownerPaymentSchema);
