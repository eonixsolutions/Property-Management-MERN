import { z } from 'zod';

export const addOwnerPaymentSchema = z.object({
  propertyId: z.string().min(1, 'Property is required'),
  amount: z
    .string()
    .min(1, 'Amount is required')
    .refine((v) => !isNaN(Number(v)), { message: 'Amount must be a valid number' })
    .refine((v) => Number(v) >= 0, { message: 'Amount must be 0 or greater' }),
  paymentMonth: z.string().min(1, 'Payment month is required'),
  status: z.enum(['Pending', 'Paid', 'Overdue'] as const, { error: 'Status is required' }),
  paidDate: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((v) => !v || !isNaN(Date.parse(v)), { message: 'Invalid date' }),
  paymentMethod: z.string().optional().or(z.literal('')),
  chequeNumber: z.string().max(50, 'Cheque number is too long').optional().or(z.literal('')),
  referenceNumber: z.string().max(100, 'Reference is too long').optional().or(z.literal('')),
  notes: z.string().max(2000, 'Notes are too long').optional().or(z.literal('')),
});

export const editOwnerPaymentSchema = addOwnerPaymentSchema.extend({
  propertyId: z.string().optional().or(z.literal('')),
});

export type OwnerPaymentFormValues = z.infer<typeof addOwnerPaymentSchema>;
