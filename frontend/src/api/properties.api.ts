import { apiClient } from './axios';
import type { PaginationMeta } from './users.api';

// ── Types ─────────────────────────────────────────────────────────────────────

export const PROPERTY_TYPES = [
  'Apartment',
  'Villa',
  'Office',
  'Shop',
  'Warehouse',
  'Land',
  'Building',
  'Townhouse',
  'Compound',
  'Studio',
  'Labor Camp',
  'Other',
] as const;

export type PropertyType = (typeof PROPERTY_TYPES)[number];
export type PropertyStatus = 'Vacant' | 'Occupied' | 'Under Maintenance';

export interface ApiPropertyOwner {
  name?: string;
  contact?: string;
  email?: string;
  phone?: string;
  monthlyRentAmount?: number;
  rentStartDate?: string;
}

export interface ApiPropertyImage {
  _id: string;
  url: string;
  filename: string;
  isPrimary: boolean;
  uploadedAt: string;
}

export interface ApiProperty {
  _id: string;
  userId: string;
  type: 'master' | 'unit';
  parentPropertyId?: string;
  unitName?: string;
  owner: ApiPropertyOwner;
  propertyName: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country: string;
  propertyType?: PropertyType;
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number;
  purchasePrice?: number;
  currentValue?: number;
  purchaseDate?: string;
  defaultRent?: number;
  contactNumber?: string;
  status: PropertyStatus;
  notes?: string;
  images: ApiPropertyImage[];
  createdAt: string;
  updatedAt: string;
}

export interface DropdownItem {
  _id: string;
  label: string;
  type: 'master' | 'unit';
  parentPropertyId?: string;
}

export interface ListPropertiesParams {
  page?: number;
  limit?: number;
  type?: 'master' | 'unit';
  status?: PropertyStatus;
  search?: string;
}

export interface CreatePropertyInput {
  type: 'master' | 'unit';
  parentPropertyId?: string;
  unitName?: string;
  propertyName: string;
  owner?: ApiPropertyOwner;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  propertyType?: PropertyType;
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number;
  purchasePrice?: number;
  currentValue?: number;
  purchaseDate?: string;
  defaultRent?: number;
  contactNumber?: string;
  status?: PropertyStatus;
  notes?: string;
}

export type UpdatePropertyInput = Partial<Omit<CreatePropertyInput, 'type'>>;

// ── API wrappers ──────────────────────────────────────────────────────────────

export const propertiesApi = {
  /**
   * GET /properties
   * Returns a paginated list of properties, filtered by query params.
   */
  async list(
    params?: ListPropertiesParams,
  ): Promise<{ properties: ApiProperty[]; meta: PaginationMeta }> {
    const res = await apiClient.get<{
      success: true;
      data: ApiProperty[];
      meta: PaginationMeta;
    }>('/properties', { params });
    return { properties: res.data.data, meta: res.data.meta };
  },

  /**
   * POST /properties
   * Creates a new property.
   */
  async create(data: CreatePropertyInput): Promise<ApiProperty> {
    const res = await apiClient.post<{ success: true; data: { property: ApiProperty } }>(
      '/properties',
      data,
    );
    return res.data.data.property;
  },

  /**
   * GET /properties/:id
   * Returns a single property by ID.
   */
  async get(id: string): Promise<ApiProperty> {
    const res = await apiClient.get<{ success: true; data: { property: ApiProperty } }>(
      `/properties/${id}`,
    );
    return res.data.data.property;
  },

  /**
   * PUT /properties/:id
   * Partial update of a property.
   */
  async update(id: string, data: UpdatePropertyInput): Promise<ApiProperty> {
    const res = await apiClient.put<{ success: true; data: { property: ApiProperty } }>(
      `/properties/${id}`,
      data,
    );
    return res.data.data.property;
  },

  /**
   * DELETE /properties/:id
   * Hard-deletes a property and its associated images.
   */
  async remove(id: string): Promise<void> {
    await apiClient.delete(`/properties/${id}`);
  },

  /**
   * GET /properties/dropdown
   * Returns an ordered flat list for <select> dropdowns (BL-08):
   * masters first, then units immediately after their parent.
   */
  async dropdown(): Promise<DropdownItem[]> {
    const res = await apiClient.get<{ success: true; data: { items: DropdownItem[] } }>(
      '/properties/dropdown',
    );
    return res.data.data.items;
  },

  /**
   * POST /properties/:id/images
   * Uploads a single image file (multipart/form-data, field name: "image").
   */
  async uploadImage(id: string, file: File): Promise<ApiProperty> {
    const formData = new FormData();
    formData.append('image', file);
    const res = await apiClient.post<{ success: true; data: { property: ApiProperty } }>(
      `/properties/${id}/images`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return res.data.data.property;
  },

  /**
   * DELETE /properties/:id/images/:imageId
   * Removes an image from a property and deletes it from disk.
   */
  async deleteImage(id: string, imageId: string): Promise<ApiProperty> {
    const res = await apiClient.delete<{ success: true; data: { property: ApiProperty } }>(
      `/properties/${id}/images/${imageId}`,
    );
    return res.data.data.property;
  },

  /**
   * PATCH /properties/:id/images/:imageId/primary
   * Sets the specified image as the primary image.
   */
  async setPrimaryImage(id: string, imageId: string): Promise<ApiProperty> {
    const res = await apiClient.patch<{ success: true; data: { property: ApiProperty } }>(
      `/properties/${id}/images/${imageId}/primary`,
    );
    return res.data.data.property;
  },
};
