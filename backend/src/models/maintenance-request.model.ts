import mongoose, { Schema, model } from 'mongoose';

// ── Enums ────────────────────────────────────────────────────────────────────

export const MAINTENANCE_PRIORITIES = ['Low', 'Medium', 'High', 'Emergency'] as const;
export type MaintenancePriority = (typeof MAINTENANCE_PRIORITIES)[number];

export const MAINTENANCE_STATUSES = ['Pending', 'In Progress', 'Completed', 'Cancelled'] as const;
export type MaintenanceStatus = (typeof MAINTENANCE_STATUSES)[number];

// ── Interface ─────────────────────────────────────────────────────────────────

export interface IMaintenanceRequest {
  /**
   * Denormalized from property.userId for efficient BL-04 data scoping.
   * Set to property.userId at creation time.
   */
  userId: mongoose.Types.ObjectId;
  propertyId: mongoose.Types.ObjectId;
  tenantId?: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  cost?: number;
  completedDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ────────────────────────────────────────────────────────────────────

const maintenanceRequestSchema = new Schema<IMaintenanceRequest>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    propertyId: { type: Schema.Types.ObjectId, ref: 'Property', required: true, index: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', default: undefined },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 5000 },
    priority: {
      type: String,
      enum: MAINTENANCE_PRIORITIES,
      required: true,
      default: 'Medium',
      index: true,
    },
    status: {
      type: String,
      enum: MAINTENANCE_STATUSES,
      required: true,
      default: 'Pending',
      index: true,
    },
    cost: { type: Number, min: 0, default: undefined },
    completedDate: { type: Date, default: undefined },
    notes: { type: String, trim: true, maxlength: 5000 },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// ── Model ─────────────────────────────────────────────────────────────────────

export const MaintenanceRequest = model<IMaintenanceRequest>(
  'MaintenanceRequest',
  maintenanceRequestSchema,
);
