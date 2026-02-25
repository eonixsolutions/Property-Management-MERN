import { z } from 'zod';

/**
 * Zod validation schemas for auth endpoints.
 *
 * All schemas strip unknown fields automatically (Zod default is passthrough,
 * but `.strict()` or `z.object()` with no extra fields is sufficient here
 * since we only destructure the declared fields in controllers).
 */

// ── Register ───────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email('Invalid email format')
    .toLowerCase(),

  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters'),

  phone: z
    .string()
    .trim()
    .min(7, 'Phone number is too short')
    .max(20, 'Phone number is too long')
    .optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

// ── Login ──────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email('Invalid email format')
    .toLowerCase(),

  password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;
