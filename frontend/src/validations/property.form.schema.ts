import { z } from 'zod';

const numericOptional = z
  .string()
  .optional()
  .refine((v) => !v || !isNaN(Number(v)) || v === '', { message: 'Must be a valid number' })
  .refine((v) => !v || Number(v) >= 0, { message: 'Must be 0 or greater' });

export const propertySchema = z
  .object({
    type: z.enum(['master', 'unit']),
    parentPropertyId: z.string().optional(),
    unitName: z.string().max(100, 'Unit name is too long').optional().or(z.literal('')),
    propertyName: z
      .string()
      .trim()
      .min(1, 'Property name is required')
      .max(200, 'Property name is too long'),
    propertyType: z.string().optional().or(z.literal('')),
    status: z.enum(['Vacant', 'Occupied', 'Under Maintenance']),
    address: z.string().max(300, 'Address is too long').optional().or(z.literal('')),
    city: z.string().max(100, 'City is too long').optional().or(z.literal('')),
    state: z.string().max(100, 'State is too long').optional().or(z.literal('')),
    zipCode: z
      .string()
      .max(20, 'ZIP code is too long')
      .regex(/^[A-Za-z0-9\s-]*$/, 'Invalid ZIP code format')
      .optional()
      .or(z.literal('')),
    country: z.string().max(100, 'Country is too long').optional().or(z.literal('')),
    bedrooms: numericOptional,
    bathrooms: numericOptional,
    squareFeet: numericOptional,
    purchasePrice: numericOptional,
    currentValue: numericOptional,
    defaultRent: numericOptional,
    contactNumber: z
      .string()
      .max(30, 'Contact number is too long')
      .regex(/^[0-9+\-\s()]*$/, 'Invalid phone number format')
      .optional()
      .or(z.literal('')),
    notes: z.string().max(2000, 'Notes are too long').optional().or(z.literal('')),
    // Owner fields
    ownerName: z.string().max(200, 'Owner name is too long').optional().or(z.literal('')),
    ownerContact: z.string().max(300, 'Owner contact is too long').optional().or(z.literal('')),
    ownerEmail: z
      .string()
      .email('Invalid owner email format')
      .optional()
      .or(z.literal('')),
    ownerPhone: z
      .string()
      .max(30, 'Owner phone is too long')
      .regex(/^[0-9+\-\s()]*$/, 'Invalid phone number format')
      .optional()
      .or(z.literal('')),
    ownerMonthlyRent: numericOptional,
  })
  .superRefine((data, ctx) => {
    if (data.type === 'unit' && !data.parentPropertyId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['parentPropertyId'],
        message: 'Please select a parent property for this unit',
      });
    }
  });

export type PropertyFormValues = z.infer<typeof propertySchema>;
