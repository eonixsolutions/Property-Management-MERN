import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import type { RequestHandler } from 'express';
import { ApiError } from '@utils/ApiError';
import { ApiResponse } from '@utils/ApiResponse';
import { asyncHandler } from '@utils/asyncHandler';
import { env } from '@config/env';
import { UserRole } from '@models/user.model';
import { Property } from '@models/property.model';
import { createPropertySchema, updatePropertySchema } from './properties.validation';

// ── Helpers ──────────────────────────────────────────────────────────────

function validateObjectId(id: string): void {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, 'INVALID_ID', 'Invalid property ID format');
  }
}

// ── Ownership middleware ──────────────────────────────────────────────────

/**
 * propertyOwnerMiddleware
 *
 * Verifies the authenticated user owns the property, or is ADMIN/SUPER_ADMIN.
 * Attaches the found property document to `req.propertyDoc` for downstream handlers.
 *
 * Must be used AFTER authMiddleware.
 */
export const propertyOwnerMiddleware: RequestHandler = asyncHandler(async (req, _res, next) => {
  const id = req.params['id'] as string;
  validateObjectId(id);

  const property = await Property.findById(id).lean();
  if (!property) {
    throw ApiError.notFound('Property');
  }

  const { role, id: userId } = req.user!;

  // STAFF may only access their own properties
  if (role !== UserRole.ADMIN && role !== UserRole.SUPER_ADMIN) {
    if (property.userId.toString() !== userId) {
      throw ApiError.forbidden('You do not have permission to access this property');
    }
  }

  // Attach to request so handlers avoid a second DB lookup
  req.propertyDoc = property;
  next();
});

// ── Controllers ──────────────────────────────────────────────────────────

/**
 * GET /api/properties
 *
 * Paginated property list scoped by dataScopeMiddleware.
 *
 * Query params:
 *   ?page    — 1-based page number (default: 1)
 *   ?limit   — items per page (default: 25, max: 100)
 *   ?type    — 'master' | 'unit'
 *   ?status  — 'Vacant' | 'Occupied' | 'Under Maintenance'
 *   ?search  — partial match on propertyName (case-insensitive)
 */
export const listProperties: RequestHandler = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt((req.query['page'] as string) || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt((req.query['limit'] as string) || '25', 10)));
  const skip = (page - 1) * limit;

  // Build filter from dataScope + query params
  const filter: Record<string, unknown> = { ...req.dataScope };

  const typeParam = req.query['type'] as string | undefined;
  if (typeParam === 'master' || typeParam === 'unit') {
    filter['type'] = typeParam;
  }

  const statusParam = req.query['status'] as string | undefined;
  if (statusParam) {
    filter['status'] = statusParam;
  }

  const searchParam = req.query['search'] as string | undefined;
  if (searchParam && searchParam.trim()) {
    filter['propertyName'] = { $regex: searchParam.trim(), $options: 'i' };
  }

  const [properties, total] = await Promise.all([
    Property.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Property.countDocuments(filter),
  ]);

  return ApiResponse.paginated(res, properties, { total, page, limit });
});

/**
 * POST /api/properties
 *
 * Creates a new property.  userId is taken from the authenticated user.
 *
 * Business rules:
 *   - If type === 'unit', parentPropertyId is required and must resolve to
 *     a master property belonging to the same user (or any property for admins)
 *   - status defaults to 'Vacant' if not provided
 */
export const createProperty: RequestHandler = asyncHandler(async (req, res) => {
  const data = createPropertySchema.parse(req.body);
  const userId = new mongoose.Types.ObjectId(req.user!.id);

  // Units must have a parentPropertyId pointing to a master
  if (data.type === 'unit') {
    if (!data.parentPropertyId) {
      throw ApiError.badRequest('parentPropertyId is required for unit properties', [
        { field: 'parentPropertyId', message: 'Required when type is "unit"' },
      ]);
    }

    if (!mongoose.isValidObjectId(data.parentPropertyId)) {
      throw ApiError.badRequest('Invalid parentPropertyId format', [
        { field: 'parentPropertyId', message: 'Must be a valid property ID' },
      ]);
    }

    // Validate parent exists and is a master property the user can access
    const parentFilter: Record<string, unknown> = {
      _id: data.parentPropertyId,
      type: 'master',
    };

    // STAFF can only add units under their own master properties
    if (req.user!.role !== UserRole.ADMIN && req.user!.role !== UserRole.SUPER_ADMIN) {
      parentFilter['userId'] = userId;
    }

    const parentExists = await Property.exists(parentFilter);
    if (!parentExists) {
      throw ApiError.notFound('Parent property (must be a master property you own)');
    }
  }

  const property = await Property.create({
    ...data,
    userId,
    parentPropertyId: data.parentPropertyId ?? null,
    status: data.status ?? 'Vacant',
    owner: data.owner ?? {},
  });

  return ApiResponse.created(res, { property }, 'Property created successfully');
});

/**
 * GET /api/properties/:id
 *
 * Returns a single property.  Ownership enforced by propertyOwnerMiddleware.
 */
export const getProperty: RequestHandler = asyncHandler(async (req, res) => {
  return ApiResponse.ok(res, { property: req.propertyDoc });
});

/**
 * PUT /api/properties/:id
 *
 * Partial update.  Ownership enforced by propertyOwnerMiddleware.
 */
export const updateProperty: RequestHandler = asyncHandler(async (req, res) => {
  const id = req.params['id'] as string;
  const updates = updatePropertySchema.parse(req.body);

  const property = await Property.findByIdAndUpdate(
    id,
    { $set: updates },
    { new: true, runValidators: true },
  ).lean();

  if (!property) throw ApiError.notFound('Property');

  return ApiResponse.ok(res, { property }, 'Property updated successfully');
});

/**
 * DELETE /api/properties/:id
 *
 * Hard-deletes a property.  Ownership enforced by propertyOwnerMiddleware.
 * Also deletes all associated image files from disk.
 */
export const deleteProperty: RequestHandler = asyncHandler(async (req, res) => {
  const property = req.propertyDoc!;

  // Remove image files from disk (best-effort, don't fail if a file is missing)
  for (const image of property.images) {
    const filePath = path.join(env.UPLOAD_DEST, 'properties', image.filename);
    fs.unlink(filePath, () => {
      // Ignore errors — file may already be gone
    });
  }

  await Property.findByIdAndDelete(property._id);

  return ApiResponse.noContent(res);
});

/**
 * GET /api/properties/dropdown
 *
 * Returns an ordered flat list for UI dropdowns (BL-08):
 *   1. Master properties sorted alphabetically
 *   2. Units immediately after their master, sorted by unitName / propertyName
 *
 * Display labels:
 *   Master: "Property Name"
 *   Unit:   "Master Property Name — Unit Name"
 */
export const getPropertiesDropdown: RequestHandler = asyncHandler(async (req, res) => {
  const scope = req.dataScope ?? {};

  const [masters, units] = await Promise.all([
    Property.find({ ...scope, type: 'master' })
      .select('_id propertyName type')
      .sort({ propertyName: 1 })
      .lean(),
    Property.find({ ...scope, type: 'unit' })
      .select('_id propertyName unitName type parentPropertyId')
      .sort({ unitName: 1, propertyName: 1 })
      .lean(),
  ]);

  // Build a map from masterId → units array for O(1) lookup
  const unitsByMaster = new Map<string, (typeof units)[number][]>();
  const orphanUnits: (typeof units)[number][] = [];

  for (const unit of units) {
    if (unit.parentPropertyId) {
      const key = unit.parentPropertyId.toString();
      const existing = unitsByMaster.get(key);
      if (existing) {
        existing.push(unit);
      } else {
        unitsByMaster.set(key, [unit]);
      }
    } else {
      orphanUnits.push(unit);
    }
  }

  // Flatten: master → its units → next master → ...
  const items: {
    _id: string;
    label: string;
    type: 'master' | 'unit';
    parentPropertyId?: string;
  }[] = [];

  for (const master of masters) {
    items.push({
      _id: master._id.toString(),
      label: master.propertyName,
      type: 'master',
    });

    const masterUnits = unitsByMaster.get(master._id.toString()) ?? [];
    for (const unit of masterUnits) {
      items.push({
        _id: unit._id.toString(),
        label: `${master.propertyName} — ${unit.unitName || unit.propertyName}`,
        type: 'unit',
        parentPropertyId: master._id.toString(),
      });
    }
  }

  // Units whose parent master wasn't found (orphan edge-case) — append at end
  for (const unit of orphanUnits) {
    items.push({
      _id: unit._id.toString(),
      label: unit.unitName || unit.propertyName,
      type: 'unit',
      parentPropertyId: unit.parentPropertyId?.toString(),
    });
  }

  return ApiResponse.ok(res, { items });
});

/**
 * POST /api/properties/:id/images
 *
 * Uploads a single image file (handled by propertyImageUpload Multer middleware).
 * The first uploaded image is automatically set as primary.
 */
export const uploadImage: RequestHandler = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'UPLOAD_ERROR', 'No image file provided. Use field name "image".');
  }

  const id = req.params['id'] as string;
  const property = req.propertyDoc!;

  const url = `/uploads/properties/${req.file.filename}`;
  const isPrimary = property.images.length === 0;

  const updated = await Property.findByIdAndUpdate(
    id,
    {
      $push: {
        images: {
          url,
          filename: req.file.filename,
          isPrimary,
          uploadedAt: new Date(),
        },
      },
    },
    { new: true },
  ).lean();

  if (!updated) throw ApiError.notFound('Property');

  return ApiResponse.ok(res, { property: updated }, 'Image uploaded successfully');
});

/**
 * DELETE /api/properties/:id/images/:imageId
 *
 * Removes an image from the property's images array and deletes it from disk.
 * If the deleted image was primary and others remain, promotes the first remaining.
 */
export const deleteImage: RequestHandler = asyncHandler(async (req, res) => {
  const id = req.params['id'] as string;
  const imageId = req.params['imageId'] as string;

  if (!mongoose.isValidObjectId(imageId)) {
    throw new ApiError(400, 'INVALID_ID', 'Invalid image ID format');
  }

  // Find the image record before removing it (we need the filename for disk cleanup)
  const property = req.propertyDoc!;
  const targetImage = property.images.find((img) => img._id.toString() === imageId);

  if (!targetImage) {
    throw ApiError.notFound('Image');
  }

  const wasPrimary = targetImage.isPrimary;

  // Remove from DB
  let updated = await Property.findByIdAndUpdate(
    id,
    { $pull: { images: { _id: new mongoose.Types.ObjectId(imageId) } } },
    { new: true },
  ).lean();

  if (!updated) throw ApiError.notFound('Property');

  // If deleted image was primary and others remain, auto-promote the first one
  if (wasPrimary && updated.images.length > 0) {
    const firstImageId = updated.images[0]!._id;
    updated = await Property.findOneAndUpdate(
      { _id: id },
      { $set: { 'images.$[el].isPrimary': true } },
      {
        arrayFilters: [{ 'el._id': firstImageId }],
        new: true,
      },
    ).lean();
  }

  // Delete file from disk (best-effort)
  const filePath = path.join(env.UPLOAD_DEST, 'properties', targetImage.filename);
  fs.unlink(filePath, () => {
    // Ignore error — file may already be gone
  });

  return ApiResponse.ok(res, { property: updated }, 'Image deleted successfully');
});

/**
 * PATCH /api/properties/:id/images/:imageId/primary
 *
 * Sets the specified image as the primary image, clearing the flag on all others.
 */
export const setPrimaryImage: RequestHandler = asyncHandler(async (req, res) => {
  const id = req.params['id'] as string;
  const imageId = req.params['imageId'] as string;

  if (!mongoose.isValidObjectId(imageId)) {
    throw new ApiError(400, 'INVALID_ID', 'Invalid image ID format');
  }

  const property = req.propertyDoc!;
  const imageExists = property.images.some((img) => img._id.toString() === imageId);

  if (!imageExists) {
    throw ApiError.notFound('Image');
  }

  // Unset isPrimary on all images, then set it on the target
  await Property.updateOne({ _id: id }, { $set: { 'images.$[].isPrimary': false } });

  const updated = await Property.findOneAndUpdate(
    { _id: id, 'images._id': new mongoose.Types.ObjectId(imageId) },
    { $set: { 'images.$.isPrimary': true } },
    { new: true },
  ).lean();

  if (!updated) throw ApiError.notFound('Property');

  return ApiResponse.ok(res, { property: updated }, 'Primary image updated');
});
