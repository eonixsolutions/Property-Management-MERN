import { z } from 'zod';

const positiveNumeric = z
  .string()
  .min(1, 'This field is required')
  .refine((v) => !isNaN(Number(v)), { message: 'Must be a valid number' })
  .refine((v) => Number(v) >= 0, { message: 'Must be 0 or greater' });

const numericOptional = z
  .string()
  .optional()
  .or(z.literal(''))
  .refine((v) => !v || !isNaN(Number(v)), { message: 'Must be a valid number' })
  .refine((v) => !v || Number(v) >= 0, { message: 'Must be 0 or greater' });

const dateOptional = z
  .string()
  .optional()
  .or(z.literal(''))
  .refine((v) => !v || !isNaN(Date.parse(v)), { message: 'Invalid date format' });

function applyDateRefinements(
  data: { leaseStart?: string; leaseEnd?: string; moveInDate?: string; moveOutDate?: string },
  ctx: z.RefinementCtx,
) {
  if (data.leaseStart && data.leaseEnd && data.leaseEnd < data.leaseStart) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['leaseEnd'],
      message: 'Lease end date must be after lease start date',
    });
  }
  if (data.moveInDate && data.moveOutDate && data.moveOutDate < data.moveInDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['moveOutDate'],
      message: 'Move-out date must be after move-in date',
    });
  }
}

// Base object without superRefine so .extend() can be called safely
const tenantBaseObject = z.object({
  propertyId: z.string().min(1, 'Property is required'),
  firstName: z
    .string()
    .trim()
    .min(1, 'First name is required')
    .max(100, 'First name is too long')
    .regex(/^[A-Za-z\s'\-.]+$/, 'First name must contain letters only'),
  lastName: z
    .string()
    .trim()
    .min(1, 'Last name is required')
    .max(100, 'Last name is too long')
    .regex(/^[A-Za-z\s'\-.]+$/, 'Last name must contain letters only'),
  email: z
    .string()
    .trim()
    .email('Invalid email format')
    .optional()
    .or(z.literal('')),
  phone: z
    .string()
    .trim()
    .min(7, 'Phone number is too short')
    .max(20, 'Phone number is too long')
    .regex(/^[0-9+\-\s()]+$/, 'Invalid phone number format')
    .optional()
    .or(z.literal('')),
  alternatePhone: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((v) => !v || /^[0-9+\-\s()]+$/.test(v.trim()), { message: 'Invalid phone number format' })
    .refine((v) => !v || v.trim().length >= 7, { message: 'Phone number is too short' })
    .refine((v) => !v || v.trim().length <= 20, { message: 'Phone number is too long' }),
  qatarId: z
    .string()
    .trim()
    .max(50, 'Qatar ID is too long')
    .optional()
    .or(z.literal('')),
  moveInDate: dateOptional,
  moveOutDate: dateOptional,
  leaseStart: dateOptional,
  leaseEnd: dateOptional,
  monthlyRent: positiveNumeric,
  securityDeposit: numericOptional,
  status: z.enum(['Active', 'Past', 'Pending'] as const),
  emergencyName: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((v) => !v || /^[A-Za-z\s'\-.]+$/.test(v), { message: 'Name must contain letters only' })
    .refine((v) => !v || v.trim().length >= 2, { message: 'Name must be at least 2 characters' }),
  emergencyPhone: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((v) => !v || /^[0-9+\-\s()]+$/.test(v.trim()), { message: 'Invalid phone number format' })
    .refine((v) => !v || v.trim().length >= 7, { message: 'Phone number is too short' })
    .refine((v) => !v || v.trim().length <= 20, { message: 'Phone number is too long' }),
  notes: z.string().max(2000, 'Notes are too long').optional().or(z.literal('')),
});

export const addTenantSchema = tenantBaseObject.superRefine(applyDateRefinements);

export const editTenantSchema = tenantBaseObject
  .extend({
    propertyId: z.string().optional().or(z.literal('')),
  })
  .superRefine(applyDateRefinements);

export type TenantFormValues = z.infer<typeof addTenantSchema>;
