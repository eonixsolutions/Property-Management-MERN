import { apiClient } from './axios';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ApiListing {
  _id: string;
  propertyName: string;
  propertyType?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number;
  defaultRent?: number;
  contactNumber?: string;
  primaryImage: string | null;
  allImages: string[];
}

export interface ListingsFilter {
  search?: string;
  type?: string;
  city?: string;
  minRent?: number;
  maxRent?: number;
}

// ── API wrapper ───────────────────────────────────────────────────────────────

export const listingsApi = {
  /** GET /public/listings — no auth required */
  async getListings(filters?: ListingsFilter): Promise<{ listings: ApiListing[]; total: number }> {
    const res = await apiClient.get<{
      success: true;
      data: { listings: ApiListing[]; total: number };
    }>('/public/listings', {
      params: filters,
      // Don't fail if no token — backend accepts unauthenticated requests
      headers: { Authorization: undefined },
    });
    return { listings: res.data.data.listings, total: res.data.data.total };
  },
};
