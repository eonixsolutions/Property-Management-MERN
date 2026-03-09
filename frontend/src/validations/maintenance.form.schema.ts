import { z } from 'zod';

export const maintenanceSchema = z.object({
  propertyId: z.string().min(1, 'Property is required'),
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(200, 'Title is too long'),
  description: z.string().max(2000, 'Description is too long').optional().or(z.literal('')),
  priority: z.enum(['Low', 'Medium', 'High', 'Emergency'] as const, { error: 'Priority is required' }),
  status: z.enum(['Pending', 'In Progress', 'Completed', 'Cancelled'] as const, { error: 'Status is required' }),
  cost: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((v) => !v || !isNaN(Number(v)), { message: 'Cost must be a valid number' })
    .refine((v) => !v || Number(v) >= 0, { message: 'Cost must be 0 or greater' }),
  completedDate: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((v) => !v || !isNaN(Date.parse(v)), { message: 'Invalid date' }),
  notes: z.string().max(2000, 'Notes are too long').optional().or(z.literal('')),
});

export const editMaintenanceSchema = maintenanceSchema.extend({
  propertyId: z.string().optional().or(z.literal('')),
});

export type MaintenanceFormValues = z.infer<typeof maintenanceSchema>;
