import mongoose, { Schema, model } from 'mongoose';

// ── Enums & constants ──────────────────────────────────────────────────────

export const PAYMENT_METHODS = [
  'Cash',
  'Cheque',
  'Bank Transfer',
  'Credit Card',
  'Debit Card',
  'Online Transfer',
  'Other',
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type RentPaymentStatus = 'Pending' | 'Paid' | 'Overdue' | 'Partial';

// ── Document interface ─────────────────────────────────────────────────────

export interface IRentPayment {
  tenantId: mongoose.Types.ObjectId;
  propertyId: mongoose.Types.ObjectId;
  amount: number;
  dueDate: Date;
  paidDate?: Date;
  chequeNumber?: string;
  paymentMethod?: PaymentMethod;
  status: RentPaymentStatus;
  referenceNumber?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ─────────────────────────────────────────────────────────────────

const rentPaymentSchema = new Schema<IRentPayment>(
  {
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

    amount: {
      type: Number,
      required: [true, 'amount is required'],
      min: [0, 'amount must be non-negative'],
    },

    dueDate: {
      type: Date,
      required: [true, 'dueDate is required'],
      index: true,
    },

    paidDate: Date,

    chequeNumber: { type: String, trim: true },

    paymentMethod: {
      type: String,
      enum: {
        values: PAYMENT_METHODS,
        message: `Payment method must be one of: ${PAYMENT_METHODS.join(', ')}`,
      },
    },

    status: {
      type: String,
      enum: {
        values: ['Pending', 'Paid', 'Overdue', 'Partial'],
        message: "Status must be 'Pending', 'Paid', 'Overdue', or 'Partial'",
      },
      default: 'Pending',
      index: true,
    },

    referenceNumber: { type: String, trim: true },

    notes: { type: String, trim: true },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Additional indexes per migration plan
rentPaymentSchema.index({ paidDate: 1 });

// ── Model ──────────────────────────────────────────────────────────────────

export const RentPayment = model<IRentPayment>('RentPayment', rentPaymentSchema);
