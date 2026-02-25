import type { RequestHandler } from 'express';
import { ApiResponse } from '@utils/ApiResponse';
import { asyncHandler } from '@utils/asyncHandler';
import { Property } from '@models/property.model';

// ── GET /api/public/listings ──────────────────────────────────────────────────
//
// Public endpoint — no auth required.
// Returns Vacant properties with optional filters for the public landing page.

export const getListings: RequestHandler = asyncHandler(async (req, res) => {
  const { search, type, city, minRent, maxRent } = req.query;

  const baseFilter: Record<string, unknown> = { status: 'Vacant' };
  const andConditions: Record<string, unknown>[] = [];

  if (type && typeof type === 'string') {
    andConditions.push({ propertyType: type });
  }

  if (city && typeof city === 'string') {
    andConditions.push({ city: { $regex: city, $options: 'i' } });
  }

  if (minRent !== undefined || maxRent !== undefined) {
    const rentFilter: Record<string, number> = {};
    if (minRent !== undefined) rentFilter.$gte = Number(minRent);
    if (maxRent !== undefined) rentFilter.$lte = Number(maxRent);
    andConditions.push({ defaultRent: rentFilter });
  }

  if (search && typeof search === 'string') {
    andConditions.push({
      $or: [
        { propertyName: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
      ],
    });
  }

  if (andConditions.length > 0) {
    baseFilter.$and = andConditions;
  }

  const properties = await Property.find(baseFilter)
    .select(
      'propertyName propertyType address city state zipCode country ' +
        'bedrooms bathrooms squareFeet defaultRent contactNumber ' +
        'type parentPropertyId images',
    )
    .sort({ defaultRent: 1, createdAt: -1 })
    .limit(200)
    .lean();

  // Shape the response: include primary image URL
  const listings = properties.map((p) => {
    const primaryImage = p.images.find((img) => img.isPrimary)?.url ?? p.images[0]?.url ?? null;
    return {
      _id: p._id,
      propertyName: p.propertyName,
      propertyType: p.propertyType,
      address: p.address,
      city: p.city,
      state: p.state,
      zipCode: p.zipCode,
      country: p.country,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      squareFeet: p.squareFeet,
      defaultRent: p.defaultRent,
      contactNumber: p.contactNumber,
      primaryImage,
      allImages: p.images.map((img) => img.url),
    };
  });

  return ApiResponse.ok(res, { listings, total: listings.length });
});
