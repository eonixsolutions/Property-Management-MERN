import { z } from 'zod';

export const createMaintenanceSchema = z.object({
  propertyId: z.string({ required_error: 'propertyId is required' }).trim().min(1),
  tenantId: z.string().trim().optional(),
  title: z
    .string({ required_error: 'title is required' })
    .trim()
    .min(1, 'title is required')
    .max(200),
  description: z.string().trim().max(5000).optional(),
  priority: z
    .enum(['Low', 'Medium', 'High', 'Emergency'], {
      errorMap: () => ({
        message: "priority must be 'Low', 'Medium', 'High', or 'Emergency'",
      }),
    })
    .default('Medium'),
  status: z
    .enum(['Pending', 'In Progress', 'Completed', 'Cancelled'], {
      errorMap: () => ({
        message: "status must be 'Pending', 'In Progress', 'Completed', or 'Cancelled'",
      }),
    })
    .default('Pending'),
  cost: z
    .number({ invalid_type_error: 'cost must be a number' })
    .min(0, 'cost must be non-negative')
    .optional(),
  completedDate: z
    .string()
    .refine((v) => !isNaN(Date.parse(v)), { message: 'completedDate must be a valid date' })
    .optional(),
  notes: z.string().trim().max(5000).optional(),
});

export type CreateMaintenanceInput = z.infer<typeof createMaintenanceSchema>;

export const updateMaintenanceSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(5000).optional().nullable(),
    priority: z
      .enum(['Low', 'Medium', 'High', 'Emergency'], {
        errorMap: () => ({
          message: "priority must be 'Low', 'Medium', 'High', or 'Emergency'",
        }),
      })
      .optional(),
    status: z
      .enum(['Pending', 'In Progress', 'Completed', 'Cancelled'], {
        errorMap: () => ({
          message: "status must be 'Pending', 'In Progress', 'Completed', or 'Cancelled'",
        }),
      })
      .optional(),
    cost: z
      .number({ invalid_type_error: 'cost must be a number' })
      .min(0, 'cost must be non-negative')
      .optional()
      .nullable(),
    completedDate: z
      .string()
      .refine((v) => !isNaN(Date.parse(v)), { message: 'completedDate must be a valid date' })
      .optional()
      .nullable(),
    notes: z.string().trim().max(5000).optional().nullable(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: 'At least one field must be provided',
  });

export type UpdateMaintenanceInput = z.infer<typeof updateMaintenanceSchema>;
