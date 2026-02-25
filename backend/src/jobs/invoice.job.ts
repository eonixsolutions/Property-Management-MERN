/**
 * invoice.job.ts — Recurring invoice cron jobs.
 *
 * Two scheduled tasks:
 *
 * 1. Monthly invoice generation (1st of each month at 00:05 UTC)
 *    Iterates all Active tenants and runs generateRecurringInvoices so that
 *    the current month's invoice is created if it doesn't already exist.
 *    Idempotent — safe to run multiple times.
 *
 * 2. Daily overdue auto-marking (every day at 01:00 UTC)
 *    Updates all Pending rent payments whose dueDate is in the past to 'Overdue'.
 *    Mirrors PHP's manual overdue-check pattern.
 */

import cron from 'node-cron';
import { Tenant } from '@models/tenant.model';
import { RentPayment } from '@models/rent-payment.model';
import { generateRecurringInvoices } from '@services/recurring-invoices.service';
import { generateMonthlyOwnerPayments } from '@services/owner-payment.service';
import { logger } from '@utils/logger';
import mongoose from 'mongoose';

// ── Monthly invoice generation ────────────────────────────────────────────

/**
 * Runs once per month (1st at 00:05 UTC).
 * Generates the current-month invoice for every Active tenant that doesn't
 * already have one (deduplication is handled inside generateRecurringInvoices).
 */
async function runMonthlyInvoiceGeneration(): Promise<void> {
  logger.info('invoice.job: monthly generation starting');

  const activeTenants = await Tenant.find({ status: 'Active' }).select('_id').lean();

  let totalGenerated = 0;
  let errors = 0;

  for (const tenant of activeTenants) {
    try {
      const count = await generateRecurringInvoices(tenant._id as mongoose.Types.ObjectId);
      totalGenerated += count;
    } catch (err) {
      errors++;
      logger.error(
        { err, tenantId: tenant._id },
        'invoice.job: error generating invoice for tenant',
      );
    }
  }

  logger.info(
    { tenantsProcessed: activeTenants.length, invoicesGenerated: totalGenerated, errors },
    'invoice.job: monthly generation complete',
  );
}

// ── Daily overdue auto-marking ────────────────────────────────────────────

/**
 * Runs every day at 01:00 UTC.
 * Marks all Pending payments whose dueDate is before today as 'Overdue'.
 */
async function runDailyOverdueUpdate(): Promise<void> {
  logger.info('invoice.job: daily overdue update starting');

  try {
    const now = new Date();
    // Start of today (UTC midnight)
    const todayStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );

    const result = await RentPayment.updateMany(
      { status: 'Pending', dueDate: { $lt: todayStart } },
      { $set: { status: 'Overdue' } },
    );

    logger.info({ updated: result.modifiedCount }, 'invoice.job: daily overdue update complete');
  } catch (err) {
    logger.error({ err }, 'invoice.job: error during daily overdue update');
  }
}

// ── Monthly owner payment generation ─────────────────────────────────────

/**
 * Runs once per month (1st at 00:10 UTC).
 * Generates owner payments for every configured property that doesn't
 * already have one for the current month.
 */
async function runMonthlyOwnerPaymentGeneration(): Promise<void> {
  logger.info('invoice.job: monthly owner payment generation starting');
  try {
    const count = await generateMonthlyOwnerPayments();
    logger.info({ count }, 'invoice.job: monthly owner payment generation complete');
  } catch (err) {
    logger.error({ err }, 'invoice.job: error during monthly owner payment generation');
  }
}

// ── Job registration ──────────────────────────────────────────────────────

/**
 * Registers and starts all cron jobs.
 * Call this once after the MongoDB connection is established.
 */
export function startInvoiceJobs(): void {
  // Monthly rent invoice generation — 00:05 UTC on the 1st of every month
  cron.schedule('5 0 1 * *', () => {
    void runMonthlyInvoiceGeneration();
  });

  // Monthly owner payment generation — 00:10 UTC on the 1st of every month
  cron.schedule('10 0 1 * *', () => {
    void runMonthlyOwnerPaymentGeneration();
  });

  // Daily overdue auto-marking — 01:00 UTC every day
  cron.schedule('0 1 * * *', () => {
    void runDailyOverdueUpdate();
  });

  logger.info(
    'invoice.job: cron jobs scheduled (monthly rent + monthly owner payments + daily overdue)',
  );
}
