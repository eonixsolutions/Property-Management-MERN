import mongoose, { Schema, model } from 'mongoose';

// ── Enums & constants ──────────────────────────────────────────────────────

/**
 * Supported property types — matches the 12 types in the PHP system.
 */
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

// ── Subdocument interfaces ─────────────────────────────────────────────────

export interface IPropertyOwner {
  name?: string;
  contact?: string;
  email?: string;
  phone?: string;
  monthlyRentAmount?: number;
  rentStartDate?: Date;
}

export interface IPropertyImage {
  _id: mongoose.Types.ObjectId;
  url: string;
  filename: string;
  isPrimary: boolean;
  uploadedAt: Date;
}

// ── Main document interface ────────────────────────────────────────────────

export interface IProperty {
  userId: mongoose.Types.ObjectId;

  // Unit / master structure (replaces PHP is_unit + parent_property_id)
  type: 'master' | 'unit';
  parentPropertyId: mongoose.Types.ObjectId | null;
  unitName?: string;

  // Owner info (embedded — replaces 4 separate PHP columns)
  owner: IPropertyOwner;

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
  purchaseDate?: Date;
  defaultRent?: number;
  contactNumber?: string;

  status: PropertyStatus;
  notes?: string;

  images: IPropertyImage[];

  createdAt: Date;
  updatedAt: Date;
}

// ── Subdocument schemas ────────────────────────────────────────────────────

const ownerSchema = new Schema<IPropertyOwner>(
  {
    name: String,
    contact: String,
    email: String,
    phone: String,
    monthlyRentAmount: Number,
    rentStartDate: Date,
  },
  { _id: false },
);

const imageSchema = new Schema<IPropertyImage>(
  {
    url: { type: String, required: true },
    filename: { type: String, required: true },
    isPrimary: { type: Boolean, default: false },
    uploadedAt: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

// ── Property schema ────────────────────────────────────────────────────────

const propertySchema = new Schema<IProperty>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'userId is required'],
      index: true,
    },

    type: {
      type: String,
      enum: { values: ['master', 'unit'], message: 'Type must be master or unit' },
      required: [true, 'Property type (master/unit) is required'],
    },

    parentPropertyId: {
      type: Schema.Types.ObjectId,
      ref: 'Property',
      default: null,
      index: true,
    },

    unitName: {
      type: String,
      trim: true,
    },

    owner: {
      type: ownerSchema,
      default: () => ({}),
    },

    propertyName: {
      type: String,
      required: [true, 'Property name is required'],
      trim: true,
      index: true,
    },

    address: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    zipCode: { type: String, trim: true },
    country: { type: String, trim: true, default: 'Qatar' },

    propertyType: {
      type: String,
      enum: {
        values: PROPERTY_TYPES,
        message: `Property type must be one of: ${PROPERTY_TYPES.join(', ')}`,
      },
    },

    bedrooms: { type: Number, min: 0 },
    bathrooms: { type: Number, min: 0 },
    squareFeet: { type: Number, min: 0 },
    purchasePrice: { type: Number, min: 0 },
    currentValue: { type: Number, min: 0 },
    purchaseDate: Date,
    defaultRent: { type: Number, min: 0 },
    contactNumber: { type: String, trim: true },

    status: {
      type: String,
      enum: {
        values: ['Vacant', 'Occupied', 'Under Maintenance'],
        message: "Status must be 'Vacant', 'Occupied', or 'Under Maintenance'",
      },
      default: 'Vacant',
      index: true,
    },

    notes: { type: String, trim: true },

    images: { type: [imageSchema], default: [] },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Additional indexes per migration plan
propertySchema.index({ 'owner.name': 1 });

// ── Model ──────────────────────────────────────────────────────────────────

export const Property = model<IProperty>('Property', propertySchema);

// ── Compound indexes (Phase 12 performance) ────────────────────────────────
// Support common filter combinations in list queries
propertySchema.index({ userId: 1, status: 1 });       // owner's properties by status
propertySchema.index({ userId: 1, type: 1 });          // owner's properties by type
propertySchema.index({ userId: 1, createdAt: -1 });    // owner's sorted list

// ── Service function ───────────────────────────────────────────────────────

/**
 * updatePropertyStatus — BL-01
 *
 * Called by Tenant model post-save / post-findOneAndDelete hooks.
 *
 * Business rule:
 *   IF property.status === 'Under Maintenance' → do nothing
 *   ELSE IF active tenant count > 0 → SET status = 'Occupied'
 *   ELSE → SET status = 'Vacant'
 *
 * Uses dynamic import of Tenant to prevent circular dependency:
 *   property.model → (static) → tenant.model → (dynamic) → property.model ✓
 */
export async function updatePropertyStatus(
  propertyId: mongoose.Types.ObjectId | string,
): Promise<void> {
  const property = await Property.findById(propertyId);
  if (!property) return;

  // BL-01: never override 'Under Maintenance' via this function
  if (property.status === 'Under Maintenance') return;

  const { Tenant } = await import('./tenant.model');
  const activeCount = await Tenant.countDocuments({ propertyId: property._id, status: 'Active' });

  property.status = activeCount > 0 ? 'Occupied' : 'Vacant';
  await property.save();
}
