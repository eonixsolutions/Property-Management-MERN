/**
 * Database seed script — Phase 1 bootstrap.
 *
 * Creates the SUPER_ADMIN user (and their default Settings document)
 * if one does not already exist.
 *
 * SAFE to run repeatedly — idempotent by design.
 *
 * Usage:
 *   npm run seed
 *   # or directly:
 *   npx tsx src/scripts/seed.ts
 *
 * Credentials resolution (in priority order):
 *   1. SEED_ADMIN_EMAIL    env var  (default: admin@property.local)
 *   2. SEED_ADMIN_PASSWORD env var  (default: auto-generated 20-char hex, printed to console)
 *
 * The auto-generated password is printed ONCE and never stored in plain text.
 * Copy it immediately — it cannot be recovered after this run.
 */

// dotenv MUST be the very first import so env.ts validation has access
// to the populated process.env when it runs its top-level validateEnv() call.
import 'dotenv/config';

import crypto from 'crypto';
import { connectDB, disconnectDB } from '@config/database';
import { User, UserRole, UserStatus } from '@models/user.model';
import { Settings } from '@models/settings.model';
import { logger } from '@utils/logger';

async function seed(): Promise<void> {
  // ── Check for existing SUPER_ADMIN ────────────────────────────────────────
  const existing = await User.findOne({ role: UserRole.SUPER_ADMIN }).lean();

  if (existing) {
    logger.info(
      { email: existing.email },
      'SUPER_ADMIN already exists — seed skipped (idempotent)',
    );
    return;
  }

  // ── Resolve credentials ───────────────────────────────────────────────────
  const email = process.env['SEED_ADMIN_EMAIL'] ?? 'admin@property.local';
  const passwordProvided = Boolean(process.env['SEED_ADMIN_PASSWORD']);
  const password = process.env['SEED_ADMIN_PASSWORD'] ?? crypto.randomBytes(10).toString('hex');

  // ── Create User ───────────────────────────────────────────────────────────
  // The pre-save hook in user.model.ts will bcrypt-hash the password.
  const user = new User({
    email,
    password,
    role: UserRole.SUPER_ADMIN,
    status: UserStatus.ACTIVE,
  });

  await user.save();

  // ── Create default Settings (1:1 with User) ───────────────────────────────
  await Settings.create({
    userId: user._id,
    currency: 'QAR',
    timezone: 'Asia/Qatar',
  });

  // ── Output ────────────────────────────────────────────────────────────────
  logger.info({ email, role: UserRole.SUPER_ADMIN }, '✅  SUPER_ADMIN created successfully');

  if (!passwordProvided) {
    // Print auto-generated password to stdout so the operator can copy it.
    // It will never be shown again after this run.
    process.stdout.write(
      [
        '',
        '╔══════════════════════════════════════════════════════════════╗',
        '║              ⚠️   SAVE YOUR CREDENTIALS NOW   ⚠️              ║',
        '╠══════════════════════════════════════════════════════════════╣',
        `║  Email    : ${email.padEnd(48)}║`,
        `║  Password : ${password.padEnd(48)}║`,
        '║                                                              ║',
        '║  This password will NOT be shown again.                      ║',
        '╚══════════════════════════════════════════════════════════════╝',
        '',
      ].join('\n'),
    );
  } else {
    logger.info('Password was provided via SEED_ADMIN_PASSWORD env var');
  }
}

// ── Entry point ────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  try {
    await connectDB();
    await seed();
  } catch (err) {
    logger.error({ err }, '❌  Seed failed');
    process.exitCode = 1;
  } finally {
    await disconnectDB();
  }
}

void main();
