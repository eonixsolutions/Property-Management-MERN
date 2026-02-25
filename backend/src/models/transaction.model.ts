import { Schema, model, type Document, type Types } from 'mongoose';

// ── Constants ─────────────────────────────────────────────────────────────────

export const TRANSACTION_TYPES = ['Income', 'Expense'] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const RECURRING_FREQUENCIES = ['Monthly', 'Weekly', 'Yearly'] as const;
export type RecurringFrequency = (typeof RECURRING_FREQUENCIES)[number];

/** Suggested income categories (user may type any free-text value) */
export const INCOME_CATEGORIES = [
  'Rent',
  'Security Deposit',
  'Late Fee',
  'Maintenance Fee',
  'Parking Fee',
  'Other Income',
] as const;

/** Suggested expense categories (user may type any free-text value) */
export const EXPENSE_CATEGORIES = [
  'Maintenance',
  'Repairs',
  'Utilities',
  'Insurance',
  'Property Tax',
  'Management Fee',
  'Cleaning',
  'Legal Fees',
  'Other Expense',
] as const;

// ── Interface ─────────────────────────────────────────────────────────────────

export interface ITransaction extends Document {
  _id: Types.ObjectId;
  /** Owner of this transaction — used for BL-04 data isolation */
  userId: Types.ObjectId;
  /** Optional — links the transaction to a specific property */
  propertyId?: Types.ObjectId;
  /** Optional — links the transaction to a specific tenant */
  tenantId?: Types.ObjectId;
  type: TransactionType;
  /** Free-text category (suggestions provided via datalist in UI) */
  category: string;
  amount: number;
  description?: string;
  transactionDate: Date;
  paymentMethod?: string;
  referenceNumber?: string;
  isRecurring: boolean;
  recurringFrequency?: RecurringFrequency;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ────────────────────────────────────────────────────────────────────

const transactionSchema = new Schema<ITransaction>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: 'Property',
      default: undefined,
    },
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      default: undefined,
    },
    type: {
      type: String,
      enum: TRANSACTION_TYPES,
      required: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    transactionDate: {
      type: Date,
      required: true,
      index: true,
    },
    paymentMethod: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    referenceNumber: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurringFrequency: {
      type: String,
      enum: [...RECURRING_FREQUENCIES, null],
      default: undefined,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Compound index for efficient per-user date-sorted queries
transactionSchema.index({ userId: 1, transactionDate: -1 });

// ── Model ─────────────────────────────────────────────────────────────────────

export const Transaction = model<ITransaction>('Transaction', transactionSchema);
