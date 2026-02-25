import { z } from 'zod';

// ── Contract upsert schema ─────────────────────────────────────────────────
// All fields are optional (contracts are saved incrementally while editing)

export const upsertContractSchema = z.object({
  tenantId: z.string().optional(),

  // Landlord
  landlordName: z.string().trim().optional(),
  landlordAddress: z.string().trim().optional(),
  landlordPhone: z.string().trim().optional(),
  landlordEmail: z.string().trim().optional(),

  // Tenant info (denormalised — copied at time of contract creation)
  tenantName: z.string().trim().optional(),
  tenantPhone: z.string().trim().optional(),
  tenantEmail: z.string().trim().optional(),
  tenantAlternatePhone: z.string().trim().optional(),
  tenantQatarId: z.string().trim().optional(),

  // Property
  propertyName: z.string().trim().optional(),
  propertyAddress: z.string().trim().optional(),
  propertyCity: z.string().trim().optional(),
  propertyState: z.string().trim().optional(),
  propertyZip: z.string().trim().optional(),
  propertyType: z.string().trim().optional(),
  propertyBedrooms: z.number().min(0).optional(),
  propertyBathrooms: z.number().min(0).optional(),
  propertySquareFeet: z.number().min(0).optional(),

  // Lease terms
  leaseStart: z.string().optional(), // ISO date string from client
  leaseEnd: z.string().optional(),
  monthlyRent: z.number().min(0).optional(),
  securityDeposit: z.number().min(0).optional(),
  lateFee: z.string().trim().optional(),
  returnPeriod: z.string().trim().optional(),
  noticePeriod: z.string().trim().optional(),
  holdoverRate: z.string().trim().optional(),
  petsAllowed: z.boolean().optional(),
  petDeposit: z.number().min(0).optional(),
  utilitiesResponsible: z.enum(['Tenant', 'Landlord', 'Shared']).optional(),
  governingLaw: z.string().trim().optional(),

  // Terms (15)
  termsRent: z.string().trim().optional(),
  termsSecurity: z.string().trim().optional(),
  termsUse: z.string().trim().optional(),
  termsMaintenance: z.string().trim().optional(),
  termsUtilities: z.string().trim().optional(),
  termsQuiet: z.string().trim().optional(),
  termsAccess: z.string().trim().optional(),
  termsPets: z.string().trim().optional(),
  termsInsurance: z.string().trim().optional(),
  termsDefault: z.string().trim().optional(),
  termsTermination: z.string().trim().optional(),
  termsHoldover: z.string().trim().optional(),
  termsGoverning: z.string().trim().optional(),
  termsEntire: z.string().trim().optional(),
  termsSeverability: z.string().trim().optional(),

  // Emergency contact
  emergencyContactName: z.string().trim().optional(),
  emergencyContactPhone: z.string().trim().optional(),

  agreementDate: z.string().optional(), // ISO date string
});

export type UpsertContractInput = z.infer<typeof upsertContractSchema>;
