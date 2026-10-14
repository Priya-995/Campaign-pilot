/**
 * attribution.service.js
 * Simulated rule-based attribution:
 * If a customer clicked a campaign message and placed a new Order within
 * 7 days of that click, we heuristically attribute that order to this campaign.
 *
 * NOTE: This is SIMULATED attribution — correlation-based, not proven causality.
 */

import { Communication } from '../models/Communication.js';
import { Order } from '../models/Order.js';
import { Campaign } from '../models/Campaign.js';

const ATTRIBUTION_WINDOW_DAYS = 7;

/**
 * Compute simulated attribution for a campaign.
 * Finds all customers who clicked, then finds Orders placed within 7 days of clickedAt.
 *
 * @param {string} campaignId
 * @returns {Promise<{attributedOrders: number, attributedRevenue: number, simulatedAttribution: true}>}
 */
export async function computeAttribution(campaignId) {
  // 1. Find all clicked communications for this campaign
  const clickedComms = await Communication.find({
    campaignId,
    status: { $in: ['CLICKED', 'CONVERTED'] },
    clickedAt: { $exists: true, $ne: null }
  }).select('customerId clickedAt').lean();

  if (clickedComms.length === 0) {
    return { attributedOrders: 0, attributedRevenue: 0, simulatedAttribution: true };
  }

  // 2. For each clicked communication, look for orders within the attribution window
  let attributedOrders = 0;
  let attributedRevenue = 0;

  // Process in a single aggregation for efficiency
  const attributionChecks = clickedComms.map(async (comm) => {
    const windowStart = new Date(comm.clickedAt);
    const windowEnd = new Date(comm.clickedAt);
    windowEnd.setDate(windowEnd.getDate() + ATTRIBUTION_WINDOW_DAYS);

    const orders = await Order.find({
      customerId: comm.customerId,
      orderedAt: { $gte: windowStart, $lte: windowEnd },
      status: { $ne: 'CANCELLED' }
    }).select('amount').lean();

    return orders.reduce((acc, o) => ({ count: acc.count + 1, revenue: acc.revenue + o.amount }), { count: 0, revenue: 0 });
  });

  const results = await Promise.all(attributionChecks);
  for (const r of results) {
    attributedOrders += r.count;
    attributedRevenue += r.revenue;
  }

  const result = {
    attributedOrders,
    attributedRevenue: Math.round(attributedRevenue * 100) / 100,
    simulatedAttribution: true,  // clearly labeled: heuristic, not causal
    attributionWindowDays: ATTRIBUTION_WINDOW_DAYS
  };

  // Cache result on Campaign.stats for fast repeated reads
  try {
    await Campaign.findByIdAndUpdate(campaignId, {
      'stats.attributedOrders': attributedOrders,
      'stats.attributedRevenue': result.attributedRevenue
    });
  } catch (_) {
    // Non-critical — stats may not have these fields yet, ignore
  }

  return result;
}
