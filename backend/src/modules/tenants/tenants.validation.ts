import { z } from 'zod';

/**
 * Zod validation schemas for the /api/tenants endpoints.
 */

// ── Shared field definitions ─────────────────────────────────────────────

const sharedFields = {
  firstName: z.string().trim().min(1, 'First name cannot be empty').max(100),
  lastName: z.string().trim().min(1, 'Last name cannot be empty').max(100),
  email: z.union([z.string().trim().email('Invalid email address'), z.literal('')]).optional(),
  phone: z.string().trim().max(30).optional(),
  alternatePhone: z.string().trim().max(30).optional(),
  qatarId: z.string().trim().max(50).optional(),
  moveInDate: z
    .string()
    .datetime({ message: 'moveInDate must be an ISO 8601 datetime' })
    .optional(),
  moveOutDate: z
    .string()
    .datetime({ message: 'moveOutDate must be an ISO 8601 datetime' })
    .optional(),
  leaseStart: z
    .string()
    .datetime({ message: 'leaseStart must be an ISO 8601 datetime' })
    .optional(),
  leaseEnd: z.string().datetime({ message: 'leaseEnd must be an ISO 8601 datetime' }).optional(),
  monthlyRent: z.coerce
    .number({ required_error: 'Monthly rent is required' })
    .min(0, 'Monthly rent must be non-negative'),
  securityDeposit: z.coerce.number().min(0, 'Security deposit must be non-negative').optional(),
  status: z
    .enum(['Active', 'Past', 'Pending'], {
      errorMap: () => ({ message: "Status must be 'Active', 'Past', or 'Pending'" }),
    })
    .default('Pending'),
  emergencyContact: z
    .object({
      name: z.string().trim().max(100).optional(),
      phone: z.string().trim().max(30).optional(),
    })
    .optional(),
  notes: z.string().trim().max(5000).optional(),
};

// ── Create ───────────────────────────────────────────────────────────────

export const createTenantSchema = z.object({
  propertyId: z.string({ required_error: 'propertyId is required' }).trim().min(1),
  ...sharedFields,
});

export type CreateTenantInput = z.infer<typeof createTenantSchema>;

// ── Update ───────────────────────────────────────────────────────────────

// propertyId is intentionally excluded — moving a tenant between properties
// would corrupt property status and rent payment history.
const updateTenantBase = z.object({
  ...{
    ...sharedFields,
    firstName: sharedFields.firstName.optional(),
    lastName: sharedFields.lastName.optional(),
    monthlyRent: sharedFields.monthlyRent.optional(),
    status: z
      .enum(['Active', 'Past', 'Pending'], {
        errorMap: () => ({ message: "Status must be 'Active', 'Past', or 'Pending'" }),
      })
      .optional(),
  },
});

export const updateTenantSchema = updateTenantBase.refine(
  (data) => Object.values(data).some((v) => v !== undefined),
  { message: 'At least one field must be provided' },
);

export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
