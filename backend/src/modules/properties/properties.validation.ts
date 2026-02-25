import { z } from 'zod';
import { PROPERTY_TYPES } from '@models/property.model';

/**
 * Zod validation schemas for the /api/properties endpoints.
 */

// ── Owner sub-schema ─────────────────────────────────────────────────────

const ownerSchema = z
  .object({
    name: z.string().trim().max(200).optional(),
    contact: z.string().trim().max(200).optional(),
    // Allow empty string (clear the field) or a valid email
    email: z.union([z.string().trim().email('Invalid owner email'), z.literal('')]).optional(),
    phone: z.string().trim().max(30).optional(),
    monthlyRentAmount: z.coerce.number().min(0).optional(),
    rentStartDate: z
      .string()
      .datetime({ message: 'rentStartDate must be an ISO 8601 datetime' })
      .optional(),
  })
  .optional();

// ── Shared field definitions ─────────────────────────────────────────────

const sharedFields = {
  unitName: z.string().trim().max(100).optional(),
  owner: ownerSchema,
  propertyName: z
    .string({ required_error: 'Property name is required' })
    .trim()
    .min(1, 'Property name cannot be empty')
    .max(200, 'Property name must not exceed 200 characters'),
  address: z.string().trim().max(500).optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  zipCode: z.string().trim().max(20).optional(),
  country: z.string().trim().max(100).default('Qatar'),
  propertyType: z
    .enum(PROPERTY_TYPES, {
      errorMap: () => ({ message: `Property type must be one of: ${PROPERTY_TYPES.join(', ')}` }),
    })
    .optional(),
  bedrooms: z.coerce.number().int().min(0).optional(),
  bathrooms: z.coerce.number().int().min(0).optional(),
  squareFeet: z.coerce.number().min(0).optional(),
  purchasePrice: z.coerce.number().min(0).optional(),
  currentValue: z.coerce.number().min(0).optional(),
  purchaseDate: z
    .string()
    .datetime({ message: 'purchaseDate must be an ISO 8601 datetime' })
    .optional(),
  defaultRent: z.coerce.number().min(0).optional(),
  contactNumber: z.string().trim().max(30).optional(),
  status: z
    .enum(['Vacant', 'Occupied', 'Under Maintenance'], {
      errorMap: () => ({
        message: "Status must be 'Vacant', 'Occupied', or 'Under Maintenance'",
      }),
    })
    .optional(),
  notes: z.string().trim().max(5000).optional(),
};

// ── Create ───────────────────────────────────────────────────────────────

export const createPropertySchema = z.object({
  type: z.enum(['master', 'unit'], {
    errorMap: (issue) => ({
      message:
        issue.code === 'invalid_enum_value' || issue.code === 'invalid_type'
          ? 'type must be "master" or "unit"'
          : 'Property type (master/unit) is required',
    }),
  }),
  parentPropertyId: z.string().trim().min(1).optional(),
  ...sharedFields,
});

export type CreatePropertyInput = z.infer<typeof createPropertySchema>;

// ── Update ───────────────────────────────────────────────────────────────

const updatePropertyBase = z.object({
  type: z
    .enum(['master', 'unit'], {
      errorMap: () => ({ message: 'type must be "master" or "unit"' }),
    })
    .optional(),
  parentPropertyId: z.string().trim().min(1).optional().nullable(),
  ...{
    ...sharedFields,
    propertyName: sharedFields.propertyName.optional(),
    country: sharedFields.country.optional(),
  },
});

export const updatePropertySchema = updatePropertyBase.refine(
  (data) => Object.values(data).some((v) => v !== undefined),
  { message: 'At least one field must be provided' },
);

export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>;
