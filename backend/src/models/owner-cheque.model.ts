import mongoose, { Schema, model } from 'mongoose';

// ── Enums ──────────────────────────────────────────────────────────────────

export type OwnerChequeStatus = 'Issued' | 'Cleared' | 'Bounced' | 'Cancelled';

// ── Interface ──────────────────────────────────────────────────────────────

export interface IOwnerCheque {
  userId: mongoose.Types.ObjectId;
  propertyId: mongoose.Types.ObjectId;
  ownerPaymentId?: mongoose.Types.ObjectId;
  chequeNumber: string;
  bankName?: string;
  chequeAmount: number;
  chequeDate: Date;
  issueDate?: Date;
  status: OwnerChequeStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ─────────────────────────────────────────────────────────────────

const ownerChequeSchema = new Schema<IOwnerCheque>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'userId is required'],
      index: true,
    },
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: 'Property',
      required: [true, 'propertyId is required'],
      index: true,
    },
    ownerPaymentId: {
      type: Schema.Types.ObjectId,
      ref: 'OwnerPayment',
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
    issueDate: { type: Date },
    status: {
      type: String,
      enum: {
        values: ['Issued', 'Cleared', 'Bounced', 'Cancelled'],
        message: "status must be 'Issued', 'Cleared', 'Bounced', or 'Cancelled'",
      },
      default: 'Issued',
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

export const OwnerCheque = model<IOwnerCheque>('OwnerCheque', ownerChequeSchema);
