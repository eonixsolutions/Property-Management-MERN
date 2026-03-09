import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

// ── Enums ──────────────────────────────────────────────────────────────────

/**
 * User roles — mirrors the PHP system's role column.
 *
 * SUPER_ADMIN  → full system access (replaces PHP hardcoded "demo" bypass)
 * ADMIN        → management access; sees all data
 * STAFF        → scoped access; sees only data linked to their account
 */
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  STAFF = 'STAFF',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
}

// ── Interfaces ─────────────────────────────────────────────────────────────

/** Raw document shape (what Mongoose stores) */
export interface IUser {
  firstName?: string;
  lastName?: string;
  email: string;
  password: string;
  role: UserRole;
  status: UserStatus;
  phone?: string;
  lastLogin?: Date;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Instance methods available on User documents */
export interface IUserMethods {
  /**
   * Safely compare a plaintext candidate against the stored bcrypt hash.
   * Use this in auth routes — never compare passwords manually.
   */
  comparePassword(candidate: string): Promise<boolean>;
}

/** Composite model type for static helpers added to User model */
export type UserModel = mongoose.Model<IUser, Record<string, never>, IUserMethods>;

// ── Schema ─────────────────────────────────────────────────────────────────

const BCRYPT_ROUNDS = 12;

const userSchema = new mongoose.Schema<IUser, UserModel, IUserMethods>(
  {
    firstName: {
      type: String,
      trim: true,
      maxlength: 100,
    },

    lastName: {
      type: String,
      trim: true,
      maxlength: 100,
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format'],
    },

    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      // Excluded from all queries by default.
      // Use .select('+password') only in auth routes (login, password change).
      select: false,
    },

    role: {
      type: String,
      enum: {
        values: Object.values(UserRole),
        message: `Role must be one of: ${Object.values(UserRole).join(', ')}`,
      },
      default: UserRole.STAFF,
      index: true,
    },

    status: {
      type: String,
      enum: {
        values: Object.values(UserStatus),
        message: `Status must be one of: ${Object.values(UserStatus).join(', ')}`,
      },
      default: UserStatus.ACTIVE,
      index: true,
    },

    phone: {
      type: String,
      trim: true,
      default: undefined,
    },

    lastLogin: {
      type: Date,
      default: undefined,
    },

    isDeleted: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: true,
    // Prevent returning __v to API consumers
    versionKey: false,
  },
);

// ── Virtuals ─────────────────────────────────────────────

// Virtual for full name (not stored in DB, but useful for API responses)
userSchema.virtual('fullName').get(function () {
  return [this.firstName, this.lastName].filter(Boolean).join(' ');
});

// ── Instance methods ────────────────────────────────────────────────────────

userSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password as string);
};

// ── Pre-save hook: hash password ────────────────────────────────────────────

userSchema.pre('save', async function (next) {
  // Only hash when password field was modified (avoids re-hashing on other updates)
  if (!this.isModified('password')) {
    return next();
  }
  this.password = await bcrypt.hash(this.password, BCRYPT_ROUNDS);
  next();
});

// ── toJSON / toObject: include virtuals (id, fullName) + strip password ─────
//
// IMPORTANT: each schema.set('toJSON', ...) call REPLACES the previous value.
// Both options MUST be combined in a single call, otherwise the second call
// silently discards virtuals: true set by the first, causing `id` and
// `fullName` to be absent from serialized documents.

/* eslint-disable @typescript-eslint/no-explicit-any */
userSchema.set('toJSON', {
  virtuals: true,
  transform(_doc: any, ret: any) {
    delete ret.password;
    return ret;
  },
});
/* eslint-enable @typescript-eslint/no-explicit-any */

userSchema.set('toObject', { virtuals: true });

// ── Model ──────────────────────────────────────────────────────────────────

export const User = mongoose.model<IUser, UserModel>('User', userSchema);
