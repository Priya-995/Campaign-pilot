/**
 * webhook.routes.js
 * Routes for channel event webhooks from the simulator.
 */

import express from 'express';
import { receiveChannelEvent } from '../controllers/webhook.controller.js';

const router = express.Router();

router.post('/channel-events', receiveChannelEvent);

export default router;
