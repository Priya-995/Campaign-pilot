/**
 * analytics.routes.js
 * Routes for campaign analytics and dashboard overview.
 */

import express from 'express';
import { getOverviewStats } from '../controllers/analytics.controller.js';

const router = express.Router();

// GET /api/analytics/overview — dashboard summary stats
router.get('/overview', getOverviewStats);

export default router;
