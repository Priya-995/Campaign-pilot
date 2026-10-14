/**
 * eventProcessor.service.js
 * Houses the idempotent event processing logic for incoming channel events.
 *
 * State machine (valid forward transitions only):
 *   CREATED → ACCEPTED → DELIVERED → OPENED/READ → CLICKED
 *                      → FAILED (from ACCEPTED)
 */

import { CommunicationEvent } from '../models/CommunicationEvent.js';
import { Communication } from '../models/Communication.js';
import { Campaign } from '../models/Campaign.js';

// ─── Valid state transitions ──────────────────────────────────────────────────
// Maps event type → new Communication status + timestamp field to set
const STATE_TRANSITIONS = {
  ACCEPTED:  { status: 'SENT',      tsField: 'sentAt' },
  DELIVERED: { status: 'DELIVERED', tsField: 'deliveredAt' },
  READ:      { status: 'READ',      tsField: 'readAt' },
  OPENED:    { status: 'READ',      tsField: 'readAt' },      // Email "opened" maps to READ
  CLICKED:   { status: 'CLICKED',   tsField: 'clickedAt' },
  FAILED:    { status: 'FAILED',    tsField: null }
};

// Order of statuses for forward-only enforcement
const STATUS_ORDER = ['CREATED', 'QUEUED', 'SENT', 'DELIVERED', 'READ', 'CLICKED', 'CONVERTED', 'FAILED'];

function statusRank(status) {
  const rank = STATUS_ORDER.indexOf(status);
  return rank === -1 ? 99 : rank;
}

// ─── Campaign stats increment map ─────────────────────────────────────────────
const STATS_INCREMENT = {
  ACCEPTED:  { sent: 1 },
  DELIVERED: { delivered: 1 },
  READ:      { read: 1 },
  OPENED:    { read: 1 },
  CLICKED:   { clicked: 1 },
  FAILED:    { failed: 1 }
};

// ─── Check if all communications are terminal ─────────────────────────────────
async function checkCampaignCompletion(campaignId) {
  const nonTerminalCount = await Communication.countDocuments({
    campaignId,
    status: { $nin: ['CLICKED', 'CONVERTED', 'FAILED'] }
  });

  if (nonTerminalCount === 0) {
    // All communications are in a terminal state — mark campaign COMPLETED
    await Campaign.findByIdAndUpdate(campaignId, {
      status: 'COMPLETED',
      completedAt: new Date()
    });
    console.log(`[WEBHOOK] Campaign ${campaignId} marked COMPLETED — all communications resolved.`);
  }
}

// ─── Main idempotent processor ────────────────────────────────────────────────

/**
 * Process a single channel event.
 *
 * @returns {Object} { processed: boolean, reason?: string }
 */
export async function processChannelEvent({ eventId, communicationId, campaignId, type, timestamp, metadata }) {
  // 1. Attempt to insert the CommunicationEvent (idempotency via unique index)
  try {
    await CommunicationEvent.create({
      eventId,
      communicationId,
      campaignId,
      type,
      timestamp: new Date(timestamp),
      metadata: metadata || {}
    });
  } catch (err) {
    if (err.code === 11000) {
      // Duplicate key — already processed; return early without side effects
      console.log(`[WEBHOOK] Duplicate event ignored: ${eventId} (${type})`);
      return { processed: false, reason: 'duplicate', duplicate: true };
    }
    throw err; // unexpected DB error — bubble up
  }

  // 2. Load current Communication state
  const communication = await Communication.findById(communicationId);
  if (!communication) {
    console.warn(`[WEBHOOK] Communication ${communicationId} not found for event ${eventId}`);
    return { processed: false, reason: 'communication_not_found' };
  }

  // 3. Validate state machine — reject backwards transitions
  const transition = STATE_TRANSITIONS[type];
  if (!transition) {
    console.warn(`[WEBHOOK] Unknown event type: ${type}`);
    return { processed: false, reason: 'unknown_event_type' };
  }

  const currentRank = statusRank(communication.status);
  const newRank = statusRank(transition.status);

  // FAILED is always allowed from ACCEPTED/DELIVERED (but not from later terminal states)
  if (type !== 'FAILED' && newRank <= currentRank) {
    console.log(`[WEBHOOK] Skipped out-of-order event ${type} for commId=${communicationId} (current: ${communication.status})`);
    return { processed: false, reason: 'invalid_transition' };
  }

  // 4. Update Communication status + timestamp
  const updateFields = { status: transition.status };
  if (transition.tsField) {
    updateFields[transition.tsField] = new Date(timestamp);
  }
  await Communication.findByIdAndUpdate(communicationId, updateFields);

  // 5. Increment Campaign stats (incremental, not full-recompute)
  const statsIncrement = STATS_INCREMENT[type];
  if (statsIncrement) {
    const statsDelta = {};
    for (const [field, inc] of Object.entries(statsIncrement)) {
      statsDelta[`stats.${field}`] = inc;
    }
    await Campaign.findByIdAndUpdate(campaignId, { $inc: statsDelta });
  }

  console.log(`[WEBHOOK] Event processed: ${type} for commId=${communicationId}`);

  // 6. Check if campaign is fully complete (async, non-blocking for response)
  setImmediate(() => {
    checkCampaignCompletion(campaignId).catch(err =>
      console.error(`[WEBHOOK] Campaign completion check failed for ${campaignId}:`, err.message)
    );
  });

  return { processed: true };
}
