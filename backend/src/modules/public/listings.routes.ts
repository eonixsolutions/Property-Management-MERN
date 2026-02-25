import { Router } from 'express';
import { getListings } from './listings.controller';

const router = Router();

// No auth middleware — this is a public endpoint
router.get('/', getListings);

export { router as publicListingsRouter };
