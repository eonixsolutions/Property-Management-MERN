import { z } from 'zod';

/* ──────────────────────────────────────────────
   Base Schema (shared fields)
────────────────────────────────────────────── */

const baseUserSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(2, 'First name must be at least 2 characters')
    .max(50)
    .regex(/^[A-Za-z\s'-]+$/, 'First name can only contain letters'),

  lastName: z
    .string()
    .trim()
    .min(2, 'Last name must be at least 2 characters')
    .max(50)
    .regex(/^[A-Za-z\s'-]+$/, 'Last name can only contain letters'),

  email: z
    .string()
    .trim()
    .email('Invalid email format'),

  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s()]*$/, 'Invalid phone number format')
    .max(20)
    .optional()
    .or(z.literal('')),

  role: z.string().optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
});

/* ──────────────────────────────────────────────
   Add User Schema (password required)
────────────────────────────────────────────── */

export const addUserSchema = baseUserSchema
  .extend({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128)
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
        'Password must include uppercase, lowercase, number and special character'
      ),
    confirmPassword: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmPassword'],
        message: 'Passwords do not match',
      });
    }
  });

/* ──────────────────────────────────────────────
   Edit User Schema (password optional)
────────────────────────────────────────────── */

export const editUserSchema = baseUserSchema
  .extend({
    password: z.string().optional().or(z.literal('')),
    confirmPassword: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.password) {
      const passwordRegex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,128}$/;

      if (!passwordRegex.test(data.password)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['password'],
          message:
            'Password must include uppercase, lowercase, number and special character',
        });
      }

      if (data.password !== data.confirmPassword) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['confirmPassword'],
          message: 'Passwords do not match',
        });
      }
    }
  });