/**
 * simulation.service.js
 * Asynchronously simulates realistic per-channel event lifecycles.
 *
 * Per-channel event sequences:
 *   WhatsApp / RCS: accepted → delivered → read → clicked
 *   SMS:            accepted → delivered → clicked
 *   Email:          accepted → delivered → opened → clicked
 *
 * Drop-off probabilities (applied at each stage):
 *   accepted  : 98–100% (near certain)
 *   delivered : 92–97%  of accepted
 *   read/opened: 55–75% of delivered
 *   clicked   : 10–25%  of read/opened
 */

import { v4 as uuidv4 } from 'uuid';
import { postEvent } from './webhook.client.js';

// ─── Channel event sequence config ────────────────────────────────────────────
const CHANNEL_SEQUENCES = {
  whatsapp: ['accepted', 'delivered', 'read', 'clicked'],
  rcs:      ['accepted', 'delivered', 'read', 'clicked'],
  sms:      ['accepted', 'delivered', 'clicked'],
  email:    ['accepted', 'delivered', 'opened', 'clicked']
};

// Drop-off probability RANGES per stage [min, max] — probability of proceeding
const STAGE_PROBS = {
  accepted:  [0.98, 1.00],
  delivered: [0.92, 0.97],
  read:      [0.55, 0.75],
  opened:    [0.55, 0.75],
  clicked:   [0.10, 0.25]
};

// Delay between stages in ms [min, max]
const STAGE_DELAYS = {
  accepted:  [500,  1500],   // near-instant acknowledgement
  delivered: [1500, 4000],   // within seconds
  read:      [2000, 6000],   // user opens the message
  opened:    [2000, 6000],   // same for email
  clicked:   [3000, 8000]    // user clicks link
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function randInt(min, max) {
  return Math.floor(rand(min, max + 1));
}

function rollProbability(stage) {
  const [min, max] = STAGE_PROBS[stage] || [0.5, 0.9];
  const threshold = rand(min, max);
  return Math.random() <= threshold; // true = proceed
}

function stageDelay(stage) {
  const [min, max] = STAGE_DELAYS[stage] || [1000, 3000];
  return randInt(min, max);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function buildEventPayload(communicationId, campaignId, type, channel, recipient) {
  return {
    eventId: uuidv4(),
    communicationId,
    campaignId,
    type: type.toUpperCase(),   // ACCEPTED, DELIVERED, READ, OPENED, CLICKED, FAILED
    timestamp: new Date().toISOString(),
    metadata: {
      channel,
      recipient,
      simulatedAt: new Date().toISOString()
    }
  };
}

// ─── Core simulation ─────────────────────────────────────────────────────────

/**
 * Asynchronously run the full event lifecycle for one message send.
 * This fires-and-forgets; the caller gets 202 immediately.
 */
export async function simulateMessageLifecycle({ communicationId, campaignId, channel, recipient, message }) {
  const channelKey = channel?.toLowerCase() || 'sms';
  const sequence = CHANNEL_SEQUENCES[channelKey] || CHANNEL_SEQUENCES.sms;

  for (const stage of sequence) {
    // Wait a realistic interval before this stage fires
    await sleep(stageDelay(stage));

    // Roll whether we actually reach this stage
    const proceeds = rollProbability(stage);

    if (!proceeds) {
      // Message fails at this stage — emit a FAILED event and stop
      const failedPayload = buildEventPayload(communicationId, campaignId, 'FAILED', channelKey, recipient);
      console.log(`[CHANNEL] Message FAILED at stage '${stage}' for commId=${communicationId}`);
      await postEvent(failedPayload);
      return; // stop the lifecycle
    }

    // Emit the stage event
    const payload = buildEventPayload(communicationId, campaignId, stage, channelKey, recipient);
    console.log(`[CHANNEL] Message ${stage.toUpperCase()} | commId=${communicationId} | channel=${channelKey}`);
    await postEvent(payload);
  }
}
