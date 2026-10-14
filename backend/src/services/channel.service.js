/**
 * channel.service.js
 * HTTP client for sending messages to the Channel Simulator service.
 * Includes an automatic asynchronous fallback simulation when the external
 * simulator is offline, cold-starting, or misconfigured.
 */

import axios from 'axios';
import crypto from 'crypto';
import { processChannelEvent } from './eventProcessor.service.js';

function getChannelServiceUrl() {
  return process.env.CHANNEL_SERVICE_URL || 'http://localhost:5001';
}

const CHANNEL_SEQUENCES = {
  whatsapp: ['ACCEPTED', 'DELIVERED', 'READ', 'CLICKED'],
  rcs:      ['ACCEPTED', 'DELIVERED', 'READ', 'CLICKED'],
  sms:      ['ACCEPTED', 'DELIVERED', 'CLICKED'],
  email:    ['ACCEPTED', 'DELIVERED', 'READ', 'CLICKED']
};

const STAGE_DELAYS = {
  ACCEPTED:  [500,  1200],
  DELIVERED: [1500, 3000],
  READ:      [2000, 4500],
  CLICKED:   [3000, 6000]
};

const STAGE_PROBS = {
  ACCEPTED:  0.99,
  DELIVERED: 0.94,
  READ:      0.68,
  CLICKED:   0.22
};

function randBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Asynchronously simulates delivery progression in-process when the external
 * Channel Simulator is unreachable or fails.
 */
export function simulateLocalDelivery(comm, campaignId, channel) {
  const chKey = (channel || 'whatsapp').toLowerCase();
  const sequence = CHANNEL_SEQUENCES[chKey] || CHANNEL_SEQUENCES.whatsapp;

  (async () => {
    for (const stage of sequence) {
      const [dMin, dMax] = STAGE_DELAYS[stage] || [1000, 3000];
      await new Promise(r => setTimeout(r, randBetween(dMin, dMax)));

      const prob = STAGE_PROBS[stage] ?? 0.8;
      const passed = Math.random() <= prob;

      if (!passed) {
        if (stage === 'DELIVERED') {
          await processChannelEvent({
            eventId: crypto.randomUUID(),
            communicationId: String(comm._id),
            campaignId: String(campaignId),
            type: 'FAILED',
            timestamp: new Date().toISOString(),
            metadata: { channel, recipient: comm.recipient, simulatedDropOff: true }
          }).catch(() => {});
        }
        break; // stop advancing this communication
      }

      await processChannelEvent({
        eventId: crypto.randomUUID(),
        communicationId: String(comm._id),
        campaignId: String(campaignId),
        type: stage,
        timestamp: new Date().toISOString(),
        metadata: { channel, recipient: comm.recipient, simulatedFallback: true }
      }).catch(() => {});
    }
  })().catch(err => {
    console.error('[SIMULATOR FALLBACK] Error in local simulation:', err.message);
  });
}

/**
 * Send a single message to the Channel Simulator.
 */
export async function sendMessage(payload) {
  const url = `${getChannelServiceUrl()}/api/send`;

  try {
    const response = await axios.post(url, payload, {
      timeout: 4000,
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  } catch (err) {
    const errMsg = err.response?.data?.error || err.message;
    throw new Error(`Channel service unavailable: ${errMsg}`);
  }
}

/**
 * Batch dispatch with automatic local fallback simulation if the external simulator is down.
 */
export async function sendBatch(communications, campaignId, channel) {
  const CONCURRENCY = 30;
  console.log(`[CAMPAIGN ENGINE] Dispatching ${communications.length} messages...`);

  let externalServiceWorking = true;

  for (let i = 0; i < communications.length; i += CONCURRENCY) {
    const chunk = communications.slice(i, i + CONCURRENCY);

    if (externalServiceWorking) {
      const results = await Promise.allSettled(
        chunk.map(comm =>
          sendMessage({
            communicationId: String(comm._id),
            campaignId: String(campaignId),
            channel,
            recipient: comm.recipient,
            message: comm.message
          })
        )
      );

      // Check if external service is failing
      const rejectedCount = results.filter(r => r.status === 'rejected').length;
      if (rejectedCount === chunk.length) {
        console.warn('[CAMPAIGN ENGINE] External Channel Simulator unreachable. Switching to automated resilient fallback simulation...');
        externalServiceWorking = false;
        // Run fallback for this chunk
        for (const comm of chunk) {
          simulateLocalDelivery(comm, campaignId, channel);
        }
      }
    } else {
      // External service already known to be down, use fallback directly
      for (const comm of chunk) {
        simulateLocalDelivery(comm, campaignId, channel);
      }
    }
  }

  console.log(`[CAMPAIGN ENGINE] Dispatched all ${communications.length} messages.`);
}
