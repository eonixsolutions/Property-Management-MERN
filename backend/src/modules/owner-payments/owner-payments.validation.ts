import { z } from 'zod';
import { OWNER_PAYMENT_METHODS } from '@models/owner-payment.model';

// ── Shared ─────────────────────────────────────────────────────────────────

const paymentMethodEnum = z.enum(OWNER_PAYMENT_METHODS as unknown as [string, ...string[]], {
  errorMap: () => ({
    message: `paymentMethod must be one of: ${OWNER_PAYMENT_METHODS.join(', ')}`,
  }),
});

// ── Create ─────────────────────────────────────────────────────────────────

export const createOwnerPaymentSchema = z.object({
  propertyId: z.string({ required_error: 'propertyId is required' }).min(1),
  amount: z
    .number({ required_error: 'amount is required', invalid_type_error: 'amount must be a number' })
    .min(0, 'amount must be non-negative'),
  /** ISO date string — normalised to 1st of month server-side */
  paymentMonth: z
    .string({ required_error: 'paymentMonth is required' })
    .refine((v) => !isNaN(Date.parse(v)), { message: 'paymentMonth must be a valid date' }),
  status: z.enum(['Pending', 'Paid', 'Overdue']).optional(),
  paidDate: z
    .string()
    .refine((v) => !isNaN(Date.parse(v)), { message: 'paidDate must be a valid date' })
    .optional(),
  paymentMethod: paymentMethodEnum.optional(),
  chequeNumber: z.string().trim().optional(),
  referenceNumber: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export type CreateOwnerPaymentInput = z.infer<typeof createOwnerPaymentSchema>;

// ── Update ─────────────────────────────────────────────────────────────────

export const updateOwnerPaymentSchema = z.object({
  amount: z
    .number({ invalid_type_error: 'amount must be a number' })
    .min(0, 'amount must be non-negative')
    .optional(),
  paymentMonth: z
    .string()
    .refine((v) => !isNaN(Date.parse(v)), { message: 'paymentMonth must be a valid date' })
    .optional(),
  status: z.enum(['Pending', 'Paid', 'Overdue']).optional(),
  paidDate: z
    .string()
    .refine((v) => !isNaN(Date.parse(v)), { message: 'paidDate must be a valid date' })
    .optional()
    .nullable(),
  paymentMethod: paymentMethodEnum.optional().nullable(),
  chequeNumber: z.string().trim().optional().nullable(),
  referenceNumber: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
});

export type UpdateOwnerPaymentInput = z.infer<typeof updateOwnerPaymentSchema>;
