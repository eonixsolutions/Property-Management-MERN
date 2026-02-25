import mongoose, { Schema, model } from 'mongoose';

// ── Constants ──────────────────────────────────────────────────────────────────

export const DOCUMENT_TYPES = [
  'Lease Agreement',
  'Invoice',
  'Receipt',
  'Contract',
  'Other',
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

// ── Interface ─────────────────────────────────────────────────────────────────

export interface IDocument {
  userId: mongoose.Types.ObjectId;
  propertyId?: mongoose.Types.ObjectId;
  tenantId?: mongoose.Types.ObjectId;
  documentType: DocumentType;
  title: string;
  filePath: string; // relative path: uploads/documents/<filename>
  fileName: string; // stored filename (generated)
  originalName: string; // original filename (for display/download header)
  fileSize: number; // bytes
  mimeType: string; // e.g. 'application/pdf'
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ────────────────────────────────────────────────────────────────────

const documentSchema = new Schema<IDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    propertyId: { type: Schema.Types.ObjectId, ref: 'Property', index: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', index: true },
    documentType: {
      type: String,
      enum: DOCUMENT_TYPES,
      required: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 255 },
    filePath: { type: String, required: true },
    fileName: { type: String, required: true },
    originalName: { type: String, required: true },
    fileSize: { type: Number, required: true },
    mimeType: { type: String, required: true },
  },
  { timestamps: true, versionKey: false },
);

// ── Model ─────────────────────────────────────────────────────────────────────

export const Document = model<IDocument>('Document', documentSchema);
