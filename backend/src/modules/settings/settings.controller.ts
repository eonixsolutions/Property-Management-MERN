import type { RequestHandler } from 'express';
import { ApiResponse } from '@utils/ApiResponse';
import { asyncHandler } from '@utils/asyncHandler';
import { Settings } from '@models/settings.model';
import { updateSettingsSchema } from './settings.validation';

// ── Controllers ─────────────────────────────────────────────────────────────

/**
 * GET /api/settings
 *
 * Returns the authenticated user's settings document.
 * Settings are created automatically on user registration (register endpoint
 * and POST /api/users both call Settings.create()), so a missing document
 * is an edge-case. We create a default on the fly if needed.
 */
export const getSettings: RequestHandler = asyncHandler(async (req, res) => {
  const userId = req.user!.id;

  let settings = await Settings.findOne({ userId }).lean();

  // Edge-case: settings were not created at registration (e.g. migration gap)
  if (!settings) {
    await Settings.create({ userId, currency: 'QAR', timezone: 'Asia/Qatar' });
    settings = await Settings.findOne({ userId }).lean();
  }

  return ApiResponse.ok(res, { settings });
});

/**
 * PUT /api/settings
 *
 * Partially updates the authenticated user's settings.
 * Only the fields provided in the request body are changed.
 * Uses upsert so the endpoint is safe even if the document is missing.
 */
export const updateSettings: RequestHandler = asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const updates = updateSettingsSchema.parse(req.body);

  const settings = await Settings.findOneAndUpdate(
    { userId },
    { $set: updates },
    { new: true, upsert: true, runValidators: true },
  ).lean();

  return ApiResponse.ok(res, { settings }, 'Settings updated successfully');
});
