import { z } from 'zod';

// ── Tenant Cheque ──────────────────────────────────────────────────────────

export const createTenantChequeSchema = z.object({
  tenantId: z.string({ required_error: 'tenantId is required' }).min(1),
  propertyId: z.string({ required_error: 'propertyId is required' }).min(1),
  rentPaymentId: z.string().optional(),
  chequeNumber: z.string({ required_error: 'chequeNumber is required' }).trim().min(1),
  bankName: z.string().trim().optional(),
  chequeAmount: z
    .number({
      required_error: 'chequeAmount is required',
      invalid_type_error: 'chequeAmount must be a number',
    })
    .min(0, 'chequeAmount must be non-negative'),
  chequeDate: z
    .string({ required_error: 'chequeDate is required' })
    .refine((v) => !isNaN(Date.parse(v)), { message: 'chequeDate must be a valid date' }),
  depositDate: z
    .string()
    .refine((v) => !isNaN(Date.parse(v)), { message: 'depositDate must be a valid date' })
    .optional(),
  status: z.enum(['Pending', 'Deposited', 'Bounced', 'Cleared']).optional(),
  notes: z.string().trim().optional(),
});

export type CreateTenantChequeInput = z.infer<typeof createTenantChequeSchema>;

export const updateTenantChequeStatusSchema = z.object({
  status: z.enum(['Pending', 'Deposited', 'Bounced', 'Cleared'], {
    errorMap: () => ({
      message: "status must be 'Pending', 'Deposited', 'Bounced', or 'Cleared'",
    }),
  }),
  depositDate: z
    .string()
    .refine((v) => !isNaN(Date.parse(v)), { message: 'depositDate must be a valid date' })
    .optional(),
  notes: z.string().trim().optional().nullable(),
});

export type UpdateTenantChequeStatusInput = z.infer<typeof updateTenantChequeStatusSchema>;

// ── Owner Cheque ───────────────────────────────────────────────────────────

export const createOwnerChequeSchema = z.object({
  propertyId: z.string({ required_error: 'propertyId is required' }).min(1),
  ownerPaymentId: z.string().optional(),
  chequeNumber: z.string({ required_error: 'chequeNumber is required' }).trim().min(1),
  bankName: z.string().trim().optional(),
  chequeAmount: z
    .number({
      required_error: 'chequeAmount is required',
      invalid_type_error: 'chequeAmount must be a number',
    })
    .min(0, 'chequeAmount must be non-negative'),
  chequeDate: z
    .string({ required_error: 'chequeDate is required' })
    .refine((v) => !isNaN(Date.parse(v)), { message: 'chequeDate must be a valid date' }),
  issueDate: z
    .string()
    .refine((v) => !isNaN(Date.parse(v)), { message: 'issueDate must be a valid date' })
    .optional(),
  status: z.enum(['Issued', 'Cleared', 'Bounced', 'Cancelled']).optional(),
  notes: z.string().trim().optional(),
});

export type CreateOwnerChequeInput = z.infer<typeof createOwnerChequeSchema>;

export const updateOwnerChequeStatusSchema = z.object({
  status: z.enum(['Issued', 'Cleared', 'Bounced', 'Cancelled'], {
    errorMap: () => ({
      message: "status must be 'Issued', 'Cleared', 'Bounced', or 'Cancelled'",
    }),
  }),
  notes: z.string().trim().optional().nullable(),
});

export type UpdateOwnerChequeStatusInput = z.infer<typeof updateOwnerChequeStatusSchema>;

// ── Owner Cheques Bulk ─────────────────────────────────────────────────────

export const createOwnerChequesBulkSchema = z
  .object({
    propertyId: z.string({ required_error: 'propertyId is required' }).min(1),
    chequeAmount: z
      .number({
        required_error: 'chequeAmount is required',
        invalid_type_error: 'chequeAmount must be a number',
      })
      .min(0.01, 'chequeAmount must be greater than 0'),
    bankName: z.string().trim().optional(),
    /** 'manual' — provide startingChequeNumber; 'copy_from' — copy from existing cheque */
    chequeMode: z.enum(['manual', 'copy_from'], {
      required_error: 'chequeMode is required',
    }),
    startingChequeNumber: z.string().trim().optional(),
    sourceChequeId: z.string().optional(),
    startDate: z
      .string({ required_error: 'startDate is required' })
      .refine((v) => !isNaN(Date.parse(v)), { message: 'startDate must be a valid date' }),
    numCheques: z
      .number({
        required_error: 'numCheques is required',
        invalid_type_error: 'numCheques must be a number',
      })
      .int()
      .min(1, 'numCheques must be at least 1')
      .max(24, 'numCheques cannot exceed 24'),
    frequency: z.enum(['Monthly', 'Weekly'], {
      required_error: 'frequency is required',
    }),
    notes: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.chequeMode === 'manual' && !data.startingChequeNumber?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['startingChequeNumber'],
        message: 'startingChequeNumber is required when chequeMode is manual',
      });
    }
    if (data.chequeMode === 'copy_from' && !data.sourceChequeId?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['sourceChequeId'],
        message: 'sourceChequeId is required when chequeMode is copy_from',
      });
    }
  });

export type CreateOwnerChequesBulkInput = z.infer<typeof createOwnerChequesBulkSchema>;
