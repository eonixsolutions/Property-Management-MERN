import { z } from 'zod';

export const transactionSchema = z
  .object({
    type: z.enum(['Income', 'Expense'] as const, { error: 'Transaction type is required' }),
    category: z.string().trim().min(1, 'Category is required').max(100, 'Category is too long'),
    amount: z
      .string()
      .min(1, 'Amount is required')
      .refine((v) => !isNaN(Number(v)), { message: 'Amount must be a valid number' })
      .refine((v) => Number(v) > 0, { message: 'Amount must be greater than 0' }),
    transactionDate: z.string().min(1, 'Date is required').refine(
      (v) => !isNaN(Date.parse(v)),
      { message: 'Invalid date' },
    ),
    description: z.string().max(1000, 'Description is too long').optional().or(z.literal('')),
    paymentMethod: z.string().max(50).optional().or(z.literal('')),
    referenceNumber: z.string().max(100, 'Reference is too long').optional().or(z.literal('')),
    propertyId: z.string().optional().or(z.literal('')),
    tenantId: z.string().optional().or(z.literal('')),
    isRecurring: z.boolean(),
    recurringFrequency: z.string().optional().or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    if (data.isRecurring && !data.recurringFrequency) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['recurringFrequency'],
        message: 'Recurring frequency is required when recurring is enabled',
      });
    }
  });

export type TransactionFormValues = z.infer<typeof transactionSchema>;
