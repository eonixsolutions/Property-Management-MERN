import { z } from 'zod';
import { UserRole, UserStatus } from '@models/user.model';

/**
 * Zod validation schemas for the /api/users endpoints.
 */

// ── Create ──────────────────────────────────────────────────────────────────

export const createUserSchema = z.object({
  firstName: z
    .string({ required_error: 'First name is required' })
    .trim()
    .min(1, 'First name is required')
    .max(100, 'First name is too long'),

  lastName: z
    .string({ required_error: 'Last name is required' })
    .trim()
    .min(1, 'Last name is required')
    .max(100, 'Last name is too long'),

  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email('Invalid email format')
    .toLowerCase(),

  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters'),

  role: z.nativeEnum(UserRole).optional(),

  phone: z
    .string()
    .trim()
    .min(7, 'Phone number is too short')
    .max(20, 'Phone number is too long')
    .optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

// ── Update ──────────────────────────────────────────────────────────────────

const updateUserBase = z.object({
  firstName: z
  .string()
  .trim()
  .min(1, 'First name cannot be empty')
  .max(100, 'First name is too long')
  .optional(),

  lastName: z
    .string()
    .trim()
    .min(1, 'Last name cannot be empty')
    .max(100, 'Last name is too long')
    .optional(),

  email: z.string().trim().email('Invalid email format').toLowerCase().optional(),

  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters')
    .optional(),

  role: z.nativeEnum(UserRole).optional(),

  status: z.nativeEnum(UserStatus).optional(),

  phone: z
    .string()
    .trim()
    .min(7, 'Phone number is too short')
    .max(20, 'Phone number is too long')
    .optional()
    .nullable(), // null clears the phone field
});

export const updateUserSchema = updateUserBase.refine(
  (data) => Object.values(data).some((v) => v !== undefined),
  { message: 'At least one field must be provided' },
);

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
