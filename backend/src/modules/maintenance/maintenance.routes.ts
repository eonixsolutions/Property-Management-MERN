import { Router } from 'express';
import { authMiddleware } from '@middleware/auth.middleware';
import {
  maintenanceAccessMiddleware,
  listMaintenanceRequests,
  getMaintenanceRequest,
  createMaintenanceRequest,
  updateMaintenanceRequest,
  deleteMaintenanceRequest,
} from './maintenance.controller';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

router.get('/', listMaintenanceRequests);
router.post('/', createMaintenanceRequest);

router.get('/:id', maintenanceAccessMiddleware, getMaintenanceRequest);
router.put('/:id', maintenanceAccessMiddleware, updateMaintenanceRequest);
router.delete('/:id', maintenanceAccessMiddleware, deleteMaintenanceRequest);

export { router as maintenanceRouter };
