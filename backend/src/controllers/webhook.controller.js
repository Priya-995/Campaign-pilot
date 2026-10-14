/**
 * webhook.controller.js
 * Handles incoming webhook events from the Channel Simulator.
 */

import { z } from 'zod';
import { processChannelEvent } from '../services/eventProcessor.service.js';

// ─── Payload validation schema ─────────────────────────────────────────────
const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

const channelEventSchema = z.object({
  eventId:         z.string().min(1),
  communicationId: z.string().regex(OBJECT_ID_RE, 'Must be a valid MongoDB ObjectId'),
  campaignId:      z.string().regex(OBJECT_ID_RE, 'Must be a valid MongoDB ObjectId'),
  type:            z.enum(['ACCEPTED', 'DELIVERED', 'OPENED', 'READ', 'CLICKED', 'FAILED', 'CONVERTED']),
  timestamp:       z.string().datetime({ offset: true }),
  metadata:        z.record(z.unknown()).optional().default({})
});

/**
 * POST /api/webhooks/channel-events
 * Receives a channel event from the simulator, processes it idempotently.
 */
export async function receiveChannelEvent(req, res) {
  // 1. Validate payload shape
  const parsed = channelEventSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid payload',
      details: parsed.error.flatten()
    });
  }

  const payload = parsed.data;

  try {
    const result = await processChannelEvent(payload);

    if (result.reason === 'duplicate') {
      // Idempotency: already processed — still return 200 OK
      return res.status(200).json({ ok: true, idempotent: true });
    }

    return res.status(200).json({ ok: true, processed: result.processed, reason: result.reason });
  } catch (err) {
    console.error('[WEBHOOK] Error processing channel event:', err.message);
    return res.status(500).json({ error: 'Failed to process event' });
  }
}
