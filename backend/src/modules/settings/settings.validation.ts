import { z } from 'zod';

/**
 * Zod validation schema for PUT /api/settings.
 * All fields are optional — a PATCH-style update where only the provided
 * fields are changed. At least one field must be present.
 */
export const updateSettingsSchema = z
  .object({
    currency: z
      .string()
      .trim()
      .toUpperCase()
      .length(3, 'Currency must be a 3-letter ISO 4217 code (e.g. QAR, USD)')
      .optional(),

    timezone: z.string().trim().min(1, 'Timezone cannot be empty').optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: 'At least one field must be provided',
  });

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
