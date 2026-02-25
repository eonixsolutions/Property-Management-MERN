import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import type { RequestHandler } from 'express';
import { ApiError } from '@utils/ApiError';
import { ApiResponse } from '@utils/ApiResponse';
import { asyncHandler } from '@utils/asyncHandler';
import { UserRole } from '@models/user.model';
import { Document } from '@models/document.model';
import type { IDocument } from '@models/document.model';
import { env } from '@config/env';
import { createDocumentSchema } from './documents.validation';

// ── Helpers ───────────────────────────────────────────────────────────────────

function validateObjectId(id: string, label = 'ID'): void {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, 'INVALID_ID', `Invalid ${label} format`);
  }
}

// ── Access middleware ──────────────────────────────────────────────────────────

/**
 * documentAccessMiddleware
 *
 * Fetches the document by req.params.id and verifies the requesting user
 * has access (admin = always; staff = only their own documents).
 * Attaches `req.documentDoc`.
 */
export const documentAccessMiddleware: RequestHandler = asyncHandler(async (req, _res, next) => {
  const id = req.params['id'] as string;
  validateObjectId(id, 'document ID');

  const doc = await Document.findById(id).lean();
  if (!doc) throw ApiError.notFound('Document');

  const { role, id: userId } = req.user!;

  if (role !== UserRole.ADMIN && role !== UserRole.SUPER_ADMIN) {
    if (doc.userId.toString() !== userId) {
      throw ApiError.forbidden('You do not have permission to access this document');
    }
  }

  req.documentDoc = doc as unknown as IDocument & { _id: mongoose.Types.ObjectId };
  next();
});

// ── Controllers ────────────────────────────────────────────────────────────────

/**
 * GET /api/documents
 *
 * Query params: page, limit, propertyId, tenantId, documentType, search (title)
 */
export const listDocuments: RequestHandler = asyncHandler(async (req, res) => {
  const { role, id: userId } = req.user!;
  const page = Math.max(1, Number(req.query['page'] ?? 1));
  const limit = Math.min(100, Math.max(1, Number(req.query['limit'] ?? 20)));
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {};

  // BL-04 data scoping — documents are scoped by userId
  if (role !== UserRole.ADMIN && role !== UserRole.SUPER_ADMIN) {
    filter['userId'] = new mongoose.Types.ObjectId(userId);
  }

  if (req.query['propertyId']) {
    const pid = req.query['propertyId'] as string;
    validateObjectId(pid, 'propertyId');
    filter['propertyId'] = new mongoose.Types.ObjectId(pid);
  }
  if (req.query['tenantId']) {
    const tid = req.query['tenantId'] as string;
    validateObjectId(tid, 'tenantId');
    filter['tenantId'] = new mongoose.Types.ObjectId(tid);
  }
  if (req.query['documentType']) {
    filter['documentType'] = req.query['documentType'];
  }
  if (req.query['search']) {
    filter['title'] = { $regex: req.query['search'], $options: 'i' };
  }

  const [documents, total] = await Promise.all([
    Document.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Document.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(total / limit);

  return ApiResponse.ok(res, {
    documents,
    meta: {
      total,
      page,
      limit,
      totalPages,
      hasPrevPage: page > 1,
      hasNextPage: page < totalPages,
    },
  });
});

/**
 * POST /api/documents
 *
 * Multipart form upload. Multer (`documentUpload`) must run before this handler
 * so that `req.file` is populated.
 */
export const uploadDocument: RequestHandler = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'UPLOAD_ERROR', 'No file uploaded');
  }

  const parsed = createDocumentSchema.safeParse(req.body);
  if (!parsed.success) {
    // Remove the uploaded file since we're rejecting the request
    fs.unlink(req.file.path, () => {});
    throw new ApiError(
      422,
      'VALIDATION_ERROR',
      parsed.error.errors[0]?.message ?? 'Validation failed',
    );
  }

  const data = parsed.data;

  if (data.propertyId) validateObjectId(data.propertyId, 'propertyId');
  if (data.tenantId) validateObjectId(data.tenantId, 'tenantId');

  // Relative path from project root (e.g. uploads/documents/123-abc.pdf)
  const relativePath = path
    .join(env.UPLOAD_DEST, 'documents', req.file.filename)
    .replace(/\\/g, '/');

  const document = await Document.create({
    userId: new mongoose.Types.ObjectId(req.user!.id),
    propertyId: data.propertyId ? new mongoose.Types.ObjectId(data.propertyId) : undefined,
    tenantId: data.tenantId ? new mongoose.Types.ObjectId(data.tenantId) : undefined,
    documentType: data.documentType,
    title: data.title,
    filePath: relativePath,
    fileName: req.file.filename,
    originalName: req.file.originalname,
    fileSize: req.file.size,
    mimeType: req.file.mimetype,
  });

  return ApiResponse.created(res, { document });
});

/**
 * GET /api/documents/:id
 */
export const getDocument: RequestHandler = asyncHandler(async (_req, res) => {
  return ApiResponse.ok(res, { document: _req.documentDoc });
});

/**
 * GET /api/documents/:id/download
 *
 * Streams the file to the client with the original filename as the
 * Content-Disposition header.
 */
export const downloadDocument: RequestHandler = asyncHandler(async (req, res) => {
  const doc = req.documentDoc!;
  const absolutePath = path.resolve(doc.filePath);

  if (!fs.existsSync(absolutePath)) {
    throw ApiError.notFound('File not found on server');
  }

  res.download(absolutePath, doc.originalName);
});

/**
 * DELETE /api/documents/:id
 *
 * Deletes the DB record and the physical file from disk.
 */
export const deleteDocument: RequestHandler = asyncHandler(async (req, res) => {
  const doc = req.documentDoc!;

  // Delete physical file (best-effort — don't fail if file is missing)
  const absolutePath = path.resolve(doc.filePath);
  fs.unlink(absolutePath, () => {});

  await Document.findByIdAndDelete(doc._id);
  return ApiResponse.noContent(res);
});
