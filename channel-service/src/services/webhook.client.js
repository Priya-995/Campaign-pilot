/**
 * webhook.client.js
 * Resilient HTTP client for posting events back to the CRM webhook endpoint.
 * Retries once on failure with a short delay; never crashes the simulator.
 */

import axios from 'axios';

const RETRY_DELAY_MS = 2000;

function getWebhookUrl() {
  const base = process.env.CRM_WEBHOOK_URL || 'http://localhost:5000/api/webhooks';
  return `${base}/channel-events`;
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Post a channel event payload to the CRM webhook.
 * Retries once on failure.
 *
 * @param {Object} payload - The event payload to send.
 */
export async function postEvent(payload) {
  const url = getWebhookUrl();

  try {
    await axios.post(url, payload, {
      timeout: 5000,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    const errMsg = err.response?.data || err.message;
    console.warn(`[CHANNEL] Webhook delivery failed (${payload.type}), retrying in ${RETRY_DELAY_MS}ms... Error: ${errMsg}`);

    await sleep(RETRY_DELAY_MS);

    try {
      await axios.post(url, payload, {
        timeout: 5000,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (retryErr) {
      const retryErrMsg = retryErr.response?.data || retryErr.message;
      console.error(`[CHANNEL] Webhook retry also failed for event ${payload.eventId} (${payload.type}). Giving up. Error: ${retryErrMsg}`);
    }
  }
}
