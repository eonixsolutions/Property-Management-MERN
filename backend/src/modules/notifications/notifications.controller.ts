/**
 * notifications.controller.ts
 *
 * GET /api/notifications
 *
 * Returns a summary of actionable notifications for the authenticated user.
 * Responses are cached per user_id with a 60-second TTL to avoid running 6
 * aggregation queries on every UI poll tick.
 *
 * The 6 categories mirror the PHP `includes/notifications.php` pattern:
 *   1. Overdue rent  — count + total amount
 *   2. Rent due soon — due within 7 days, status Pending
 *   3. Leases expiring soon — Active tenants whose leaseEnd ≤ 30 days from now
 *   4. Maintenance pending — count (Phase 8; returns 0 until model exists)
 *   5. Tenant cheques upcoming — Pending cheques due in next 7 days (Phase 7) ✅
 *   6. Owner cheques upcoming  — Issued cheques due in next 7 days (Phase 7) ✅
 *
 * Data scoping (BL-04):
 *   ADMIN / SUPER_ADMIN → global (no filter)
 *   STAFF               → scoped to properties they own (via Property.userId)
 */

import type { RequestHandler } from 'express';
import NodeCache from 'node-cache';
import mongoose from 'mongoose';
import { ApiResponse } from '@utils/ApiResponse';
import { asyncHandler } from '@utils/asyncHandler';
import { UserRole } from '@models/user.model';
import { Property } from '@models/property.model';
import { Tenant } from '@models/tenant.model';
import { RentPayment } from '@models/rent-payment.model';
import { TenantCheque } from '@models/tenant-cheque.model';
import { OwnerCheque } from '@models/owner-cheque.model';
import { MaintenanceRequest } from '@models/maintenance-request.model';

// ── In-memory cache (60s TTL per userId) ─────────────────────────────────────

const notifCache = new NodeCache({ stdTTL: 60, checkperiod: 30, useClones: false });

// ── Types ─────────────────────────────────────────────────────────────────────

export interface NotificationSummary {
  overdueRent: {
    count: number;
    totalAmount: number;
  };
  rentDueSoon: {
    count: number;
  };
  leasesExpiringSoon: {
    count: number;
  };
  maintenancePending: {
    count: number;
  };
  tenantChequesUpcoming: {
    count: number;
  };
  ownerChequesUpcoming: {
    count: number;
  };
  /** Sum of all counts — used by the notification badge */
  totalCount: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns the set of property _ids accessible to STAFF users.
 * Returns undefined for ADMIN/SUPER_ADMIN (no filter needed).
 */
async function getScopedPropertyIds(
  role: UserRole,
  userId: string,
): Promise<mongoose.Types.ObjectId[] | undefined> {
  if (role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN) return undefined;
  const props = await Property.find({ userId }).select('_id').lean();
  return props.map((p) => p._id as mongoose.Types.ObjectId);
}

// ── Controller ────────────────────────────────────────────────────────────────

export const getNotifications: RequestHandler = asyncHandler(async (req, res) => {
  const { role, id: userId } = req.user!;
  const cacheKey = `notif:${userId}`;

  // Return cached result if still fresh
  const cached = notifCache.get<NotificationSummary>(cacheKey);
  if (cached) {
    return ApiResponse.ok(res, cached);
  }

  // ── Build scoping filter ────────────────────────────────────────────────────
  const scopedIds = await getScopedPropertyIds(role, userId);
  const propertyFilter = scopedIds !== undefined ? { propertyId: { $in: scopedIds } } : {};
  const tenantPropertyFilter = scopedIds !== undefined ? { propertyId: { $in: scopedIds } } : {};

  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // ── Run all 6 queries in parallel ─────────────────────────────────────────

  const [
    overdueAgg,
    rentDueSoonCount,
    leasesExpiringCount,
    maintenancePendingCount,
    tenantChequesCount,
    ownerChequesCount,
  ] = await Promise.all([
    // 1. Overdue rent — count + total amount
    RentPayment.aggregate<{ count: number; totalAmount: number }>([
      { $match: { ...propertyFilter, status: 'Overdue' } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
        },
      },
    ]),

    // 2. Rent due in next 7 days (Pending, dueDate between now and +7d)
    RentPayment.countDocuments({
      ...propertyFilter,
      status: 'Pending',
      dueDate: { $gte: now, $lte: in7Days },
    }),

    // 3. Active leases expiring in next 30 days
    Tenant.countDocuments({
      ...tenantPropertyFilter,
      status: 'Active',
      leaseEnd: { $gte: now, $lte: in30Days },
    }),

    // 4. Maintenance requests in Pending or In Progress (BL-09)
    MaintenanceRequest.countDocuments({
      ...propertyFilter,
      status: { $in: ['Pending', 'In Progress'] },
    }),

    // 5. Tenant cheques due in the next 7 days (Pending, chequeDate between now and +7d)
    TenantCheque.countDocuments({
      ...propertyFilter,
      status: 'Pending',
      chequeDate: { $gte: now, $lte: in7Days },
    }),

    // 6. Owner cheques due in the next 7 days (Issued, chequeDate between now and +7d)
    OwnerCheque.countDocuments({
      ...propertyFilter,
      status: 'Issued',
      chequeDate: { $gte: now, $lte: in7Days },
    }),
  ]);

  // Extract overdue aggregation result (empty array = 0 overdue payments)
  const overdueResult = overdueAgg[0] ?? { count: 0, totalAmount: 0 };

  const summary: NotificationSummary = {
    overdueRent: {
      count: overdueResult.count,
      totalAmount: overdueResult.totalAmount,
    },
    rentDueSoon: {
      count: rentDueSoonCount,
    },
    leasesExpiringSoon: {
      count: leasesExpiringCount,
    },
    maintenancePending: {
      count: maintenancePendingCount,
    },
    tenantChequesUpcoming: {
      count: tenantChequesCount,
    },
    ownerChequesUpcoming: {
      count: ownerChequesCount,
    },
    totalCount:
      overdueResult.count +
      rentDueSoonCount +
      leasesExpiringCount +
      maintenancePendingCount +
      tenantChequesCount +
      ownerChequesCount,
  };

  // Store in cache
  notifCache.set(cacheKey, summary);

  return ApiResponse.ok(res, summary);
});

/**
 * Invalidates the notification cache for a specific user.
 * Exported so other modules (e.g. rent-payment controller) can invalidate
 * the cache immediately when data changes rather than waiting for TTL expiry.
 */
export function invalidateNotifCache(userId: string): void {
  notifCache.del(`notif:${userId}`);
}
