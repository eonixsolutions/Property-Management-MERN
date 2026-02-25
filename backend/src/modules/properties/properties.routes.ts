import { Router } from 'express';
import { authMiddleware } from '@middleware/auth.middleware';
import { dataScopeMiddleware } from '@middleware/dataScope.middleware';
import { propertyImageUpload } from '@middleware/upload.middleware';
import {
  propertyOwnerMiddleware,
  listProperties,
  createProperty,
  getProperty,
  updateProperty,
  deleteProperty,
  getPropertiesDropdown,
  uploadImage,
  deleteImage,
  setPrimaryImage,
} from './properties.controller';

const router = Router();

// All property routes require authentication
router.use(authMiddleware);

// ── IMPORTANT: /dropdown MUST be registered before /:id ─────────────────
// Express matches routes top-down. Registering /dropdown after /:id would
// cause "dropdown" to be treated as a property ID.
router.get('/dropdown', dataScopeMiddleware, getPropertiesDropdown);

// ── Collection routes ────────────────────────────────────────────────────
router.get('/', dataScopeMiddleware, listProperties);
router.post('/', createProperty);

// ── Single-resource routes (ownership check via propertyOwnerMiddleware) ─
router.get('/:id', propertyOwnerMiddleware, getProperty);
router.put('/:id', propertyOwnerMiddleware, updateProperty);
router.delete('/:id', propertyOwnerMiddleware, deleteProperty);

// ── Image sub-resource routes ────────────────────────────────────────────
router.post('/:id/images', propertyOwnerMiddleware, propertyImageUpload, uploadImage);
router.delete('/:id/images/:imageId', propertyOwnerMiddleware, deleteImage);
router.patch('/:id/images/:imageId/primary', propertyOwnerMiddleware, setPrimaryImage);

export { router as propertiesRouter };
