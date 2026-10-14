/**
 * analytics.service.js
 * Computes campaign funnel metrics and category breakdowns.
 * Uses live Communication status counts for accuracy.
 */

import { Communication } from '../models/Communication.js';
import { Customer } from '../models/Customer.js';

/**
 * Get campaign funnel stats from live Communication status counts.
 * Each metric is cumulative (delivered includes everyone who was delivered,
 * regardless of whether they later clicked or failed at a later stage).
 *
 * Funnel: sent >= delivered >= read >= clicked
 *         failed = communications that reached FAILED at any stage
 *
 * @param {string} campaignId
 * @returns {Promise<Object>} funnel stats object
 */
export async function getCampaignFunnel(campaignId) {
  const [
    totalComms,
    failedCount,
    sentCount,
    deliveredCount,
    readCount,
    clickedCount
  ] = await Promise.all([
    Communication.countDocuments({ campaignId }),
    Communication.countDocuments({ campaignId, status: 'FAILED' }),
    // "Sent" = reached at minimum SENT status (i.e., accepted by channel)
    Communication.countDocuments({ campaignId, status: { $in: ['SENT', 'DELIVERED', 'READ', 'CLICKED', 'CONVERTED', 'FAILED'] } }),
    // "Delivered" = reached at minimum DELIVERED status
    Communication.countDocuments({ campaignId, status: { $in: ['DELIVERED', 'READ', 'CLICKED', 'CONVERTED'] } }),
    // "Read" = reached READ or beyond
    Communication.countDocuments({ campaignId, status: { $in: ['READ', 'CLICKED', 'CONVERTED'] } }),
    // "Clicked" = reached CLICKED
    Communication.countDocuments({ campaignId, status: { $in: ['CLICKED', 'CONVERTED'] } })
  ]);

  return {
    total:     totalComms,
    sent:      sentCount,      // accepted by channel (includes those that later failed after delivery)
    delivered: deliveredCount, // confirmed delivered
    failed:    failedCount,    // failed at any stage
    read:      readCount,      // opened/read
    clicked:   clickedCount,   // clicked CTA
    // Derived rates
    deliveryRate:      sentCount > 0 ? ((deliveredCount / sentCount) * 100).toFixed(1) : '0.0',
    readRate:          deliveredCount > 0 ? ((readCount / deliveredCount) * 100).toFixed(1) : '0.0',
    clickRate:         readCount > 0 ? ((clickedCount / readCount) * 100).toFixed(1) : '0.0',
    overallClickRate:  totalComms > 0 ? ((clickedCount / totalComms) * 100).toFixed(1) : '0.0',
    failureRate:       sentCount > 0 ? ((failedCount / sentCount) * 100).toFixed(1) : '0.0'
  };
}

/**
 * Get per-category click breakdown.
 * Joins Communications with their Customer's categories via customerId.
 *
 * @param {string} campaignId
 * @returns {Promise<Array<{category, sent, clicked, clickRate}>>}
 */
export async function getCategoryBreakdown(campaignId) {
  const [allComms, clickedComms] = await Promise.all([
    Communication.find({ campaignId }).select('customerId status').lean(),
    Communication.find({ campaignId, status: { $in: ['CLICKED', 'CONVERTED'] } })
      .select('customerId')
      .lean()
  ]);

  const allCustomerIds = [...new Set(allComms.map(c => String(c.customerId)))];
  const clickedCustomerIds = new Set(clickedComms.map(c => String(c.customerId)));

  // Fetch customers with their categories
  const customers = await Customer.find({ _id: { $in: allCustomerIds } })
    .select('categories')
    .lean();

  const customerCategoryMap = {};
  for (const c of customers) {
    customerCategoryMap[String(c._id)] = c.categories || [];
  }

  // Aggregate by category
  const categoryStats = {};

  for (const comm of allComms) {
    const custId = String(comm.customerId);
    const categories = customerCategoryMap[custId] || ['unknown'];
    const isClicked = clickedCustomerIds.has(custId);

    for (const cat of categories) {
      if (!categoryStats[cat]) categoryStats[cat] = { sent: 0, clicked: 0 };
      categoryStats[cat].sent += 1;
      if (isClicked) categoryStats[cat].clicked += 1;
    }
  }

  return Object.entries(categoryStats).map(([category, stats]) => ({
    category,
    sent: stats.sent,
    clicked: stats.clicked,
    clickRate: stats.sent > 0 ? ((stats.clicked / stats.sent) * 100).toFixed(1) : '0.0'
  })).sort((a, b) => b.clicked - a.clicked);
}
