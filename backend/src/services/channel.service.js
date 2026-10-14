/**
 * channel.service.js
 * HTTP client for sending messages to the Channel Simulator service.
 * This is the only place in the backend that knows about the channel-service URL.
 */

import axios from 'axios';

function getChannelServiceUrl() {
  return process.env.CHANNEL_SERVICE_URL || 'http://localhost:5001';
}

/**
 * Send a single message to the Channel Simulator.
 *
 * @param {Object} payload - { communicationId, campaignId, channel, recipient, message }
 * @returns {Promise<Object>} - Channel service response { accepted, communicationId }
 */
export async function sendMessage(payload) {
  const url = `${getChannelServiceUrl()}/api/send`;

  try {
    const response = await axios.post(url, payload, {
      timeout: 5000,
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  } catch (err) {
    const errMsg = err.response?.data?.error || err.message;
    console.error(`[CAMPAIGN ENGINE] Channel service call failed for commId=${payload.communicationId}:`, errMsg);
    throw new Error(`Channel service unavailable: ${errMsg}`);
  }
}

/**
 * Fire-and-forget batch: send all communications to the channel simulator.
 * Does not wait for all sends to complete — returns immediately after dispatching.
 * Uses a concurrency cap to avoid flooding the simulator.
 *
 * @param {Array<Object>} communications - Array of Communication documents
 * @param {string} campaignId
 * @param {string} channel
 */
export async function sendBatch(communications, campaignId, channel) {
  const CONCURRENCY = 50;  // max simultaneous requests

  console.log(`[CAMPAIGN ENGINE] Dispatching ${communications.length} messages to channel simulator...`);

  // Process in chunks of CONCURRENCY
  for (let i = 0; i < communications.length; i += CONCURRENCY) {
    const chunk = communications.slice(i, i + CONCURRENCY);
    await Promise.allSettled(
      chunk.map(comm =>
        sendMessage({
          communicationId: String(comm._id),
          campaignId: String(campaignId),
          channel,
          recipient: comm.recipient,
          message: comm.message
        }).catch(err => {
          console.warn(`[CAMPAIGN ENGINE] Failed to dispatch commId=${comm._id}:`, err.message);
        })
      )
    );
  }

  console.log(`[CAMPAIGN ENGINE] All ${communications.length} messages dispatched.`);
}
