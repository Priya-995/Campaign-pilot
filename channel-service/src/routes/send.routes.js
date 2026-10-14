/**
 * send.routes.js
 * POST /api/send — accepts a message send request and immediately returns 202.
 * Asynchronously simulates the full channel event lifecycle.
 */

import express from 'express';
import { simulateMessageLifecycle } from '../services/simulation.service.js';

const router = express.Router();

router.post('/', (req, res) => {
  const { communicationId, campaignId, channel, recipient, message } = req.body;

  // Validate required fields
  if (!communicationId || !campaignId || !channel || !recipient || !message) {
    return res.status(400).json({
      error: 'Missing required fields: communicationId, campaignId, channel, recipient, message'
    });
  }

  // Immediately acknowledge
  res.status(202).json({ accepted: true, communicationId });

  // Fire-and-forget: simulate the lifecycle asynchronously
  setImmediate(() => {
    simulateMessageLifecycle({ communicationId, campaignId, channel, recipient, message })
      .catch(err => {
        console.error(`[CHANNEL] Unexpected simulation error for commId=${communicationId}:`, err.message);
      });
  });
});

export default router;
