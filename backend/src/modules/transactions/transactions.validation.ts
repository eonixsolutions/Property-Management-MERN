import { z } from 'zod';
import { TRANSACTION_TYPES, RECURRING_FREQUENCIES } from '@models/transaction.model';

/**
 * Zod validation schemas for the /api/transactions endpoints.
 */

// ── Create ────────────────────────────────────────────────────────────────────

export const createTransactionSchema = z.object({
  propertyId: z.string().trim().min(1).optional(),
  tenantId: z.string().trim().min(1).optional(),
  type: z.enum(TRANSACTION_TYPES, {
    errorMap: () => ({ message: "type must be 'Income' or 'Expense'" }),
  }),
  category: z.string({ required_error: 'category is required' }).trim().min(1).max(100),
  amount: z.coerce
    .number({ required_error: 'amount is required' })
    .min(0, 'amount must be non-negative'),
  description: z.string().trim().max(2000).optional(),
  transactionDate: z.string({ required_error: 'transactionDate is required' }).datetime({
    message: 'transactionDate must be an ISO 8601 datetime',
  }),
  paymentMethod: z.string().trim().max(100).optional(),
  referenceNumber: z.string().trim().max(100).optional(),
  isRecurring: z.coerce.boolean().default(false),
  recurringFrequency: z
    .enum(RECURRING_FREQUENCIES, {
      errorMap: () => ({
        message: `recurringFrequency must be one of: ${RECURRING_FREQUENCIES.join(', ')}`,
      }),
    })
    .optional(),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

// ── Update ────────────────────────────────────────────────────────────────────

const updateTransactionBase = z.object({
  type: z
    .enum(TRANSACTION_TYPES, {
      errorMap: () => ({ message: "type must be 'Income' or 'Expense'" }),
    })
    .optional(),
  category: z.string().trim().min(1).max(100).optional(),
  amount: z.coerce.number().min(0, 'amount must be non-negative').optional(),
  description: z.string().trim().max(2000).optional(),
  transactionDate: z
    .string()
    .datetime({ message: 'transactionDate must be an ISO 8601 datetime' })
    .optional(),
  paymentMethod: z.string().trim().max(100).optional(),
  referenceNumber: z.string().trim().max(100).optional(),
  isRecurring: z.coerce.boolean().optional(),
  recurringFrequency: z
    .enum(RECURRING_FREQUENCIES, {
      errorMap: () => ({
        message: `recurringFrequency must be one of: ${RECURRING_FREQUENCIES.join(', ')}`,
      }),
    })
    .optional()
    .nullable(),
});

export const updateTransactionSchema = updateTransactionBase.refine(
  (data) => Object.values(data).some((v) => v !== undefined),
  { message: 'At least one field must be provided' },
);

export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
