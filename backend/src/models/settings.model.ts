import mongoose from 'mongoose';

// ── Interface ──────────────────────────────────────────────────────────────

/**
 * Per-user system preferences.
 *
 * 1:1 with User — every user has exactly one Settings document,
 * created automatically on user registration.
 *
 * Mirrors the PHP system's per-user currency/locale preferences
 * previously stored as session variables.
 */
export interface ISettings {
  /** Reference to the owning User document */
  userId: mongoose.Types.ObjectId;
  /**
   * ISO 4217 currency code used for formatting monetary values.
   * Default: 'QAR' (Qatari Riyal — primary market of the original PHP system)
   */
  currency: string;
  /**
   * IANA timezone identifier for date/time display.
   * Default: 'Asia/Qatar' (UTC+3, no DST)
   */
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ─────────────────────────────────────────────────────────────────

const settingsSchema = new mongoose.Schema<ISettings>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'userId is required'],
      unique: true,
      index: true,
    },

    currency: {
      type: String,
      default: 'QAR',
      trim: true,
      uppercase: true,
      maxlength: [3, 'Currency must be a 3-letter ISO 4217 code'],
    },

    timezone: {
      type: String,
      default: 'Asia/Qatar',
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// ── Model ──────────────────────────────────────────────────────────────────

export const Settings = mongoose.model<ISettings>('Settings', settingsSchema);
