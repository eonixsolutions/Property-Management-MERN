import { z } from 'zod';
import { PAYMENT_METHODS } from '@models/rent-payment.model';

/**
 * Zod validation schemas for the /api/rent-payments endpoints.
 */

// ── Create ───────────────────────────────────────────────────────────────────

export const createRentPaymentSchema = z.object({
  tenantId: z.string({ required_error: 'tenantId is required' }).trim().min(1),
  propertyId: z.string({ required_error: 'propertyId is required' }).trim().min(1),
  amount: z.coerce
    .number({ required_error: 'amount is required' })
    .min(0, 'amount must be non-negative'),
  dueDate: z.string({ required_error: 'dueDate is required' }).datetime({
    message: 'dueDate must be an ISO 8601 datetime',
  }),
  paidDate: z.string().datetime({ message: 'paidDate must be an ISO 8601 datetime' }).optional(),
  chequeNumber: z.string().trim().max(100).optional(),
  paymentMethod: z
    .enum(PAYMENT_METHODS, {
      errorMap: () => ({
        message: `Payment method must be one of: ${PAYMENT_METHODS.join(', ')}`,
      }),
    })
    .optional(),
  status: z
    .enum(['Pending', 'Paid', 'Overdue', 'Partial'], {
      errorMap: () => ({
        message: "Status must be 'Pending', 'Paid', 'Overdue', or 'Partial'",
      }),
    })
    .default('Pending'),
  referenceNumber: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export type CreateRentPaymentInput = z.infer<typeof createRentPaymentSchema>;

// ── Update ───────────────────────────────────────────────────────────────────

const updateRentPaymentBase = z.object({
  amount: z.coerce.number().min(0, 'amount must be non-negative').optional(),
  dueDate: z.string().datetime({ message: 'dueDate must be an ISO 8601 datetime' }).optional(),
  paidDate: z
    .string()
    .datetime({ message: 'paidDate must be an ISO 8601 datetime' })
    .optional()
    .nullable(),
  chequeNumber: z.string().trim().max(100).optional(),
  paymentMethod: z
    .enum(PAYMENT_METHODS, {
      errorMap: () => ({
        message: `Payment method must be one of: ${PAYMENT_METHODS.join(', ')}`,
      }),
    })
    .optional(),
  status: z
    .enum(['Pending', 'Paid', 'Overdue', 'Partial'], {
      errorMap: () => ({
        message: "Status must be 'Pending', 'Paid', 'Overdue', or 'Partial'",
      }),
    })
    .optional(),
  referenceNumber: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const updateRentPaymentSchema = updateRentPaymentBase.refine(
  (data) => Object.values(data).some((v) => v !== undefined),
  { message: 'At least one field must be provided' },
);

export type UpdateRentPaymentInput = z.infer<typeof updateRentPaymentSchema>;
