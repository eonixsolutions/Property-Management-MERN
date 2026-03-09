import { z } from 'zod';

export const createRentPaymentSchema = z.object({
  tenantId: z.string().min(1, 'Tenant is required'),
  propertyId: z.string().min(1, 'Property is required'),
  amount: z
    .string()
    .min(1, 'Amount is required')
    .refine((v) => !isNaN(Number(v)), { message: 'Amount must be a valid number' })
    .refine((v) => Number(v) >= 0, { message: 'Amount must be 0 or greater' }),
  dueDate: z.string().min(1, 'Due date is required').refine(
    (v) => !isNaN(Date.parse(v)),
    { message: 'Invalid date' },
  ),
  paidDate: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((v) => !v || !isNaN(Date.parse(v)), { message: 'Invalid date' }),
  status: z.enum(['Pending', 'Paid', 'Overdue', 'Partial'] as const, { error: 'Status is required' }),
  paymentMethod: z.string().optional().or(z.literal('')),
  chequeNumber: z.string().max(50, 'Cheque number is too long').optional().or(z.literal('')),
  referenceNumber: z.string().max(100, 'Reference is too long').optional().or(z.literal('')),
  notes: z.string().max(2000, 'Notes are too long').optional().or(z.literal('')),
});

export const editRentPaymentSchema = z.object({
  amount: z
    .string()
    .min(1, 'Amount is required')
    .refine((v) => !isNaN(Number(v)), { message: 'Amount must be a valid number' })
    .refine((v) => Number(v) >= 0, { message: 'Amount must be 0 or greater' }),
  dueDate: z.string().min(1, 'Due date is required').refine(
    (v) => !isNaN(Date.parse(v)),
    { message: 'Invalid date' },
  ),
  paidDate: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((v) => !v || !isNaN(Date.parse(v)), { message: 'Invalid date' }),
  status: z.enum(['Pending', 'Paid', 'Overdue', 'Partial'] as const, { error: 'Status is required' }),
  paymentMethod: z.string().optional().or(z.literal('')),
  chequeNumber: z.string().max(50, 'Cheque number is too long').optional().or(z.literal('')),
  referenceNumber: z.string().max(100, 'Reference is too long').optional().or(z.literal('')),
  notes: z.string().max(2000, 'Notes are too long').optional().or(z.literal('')),
});

export type CreateRentPaymentFormValues = z.infer<typeof createRentPaymentSchema>;
export type EditRentPaymentFormValues = z.infer<typeof editRentPaymentSchema>;
