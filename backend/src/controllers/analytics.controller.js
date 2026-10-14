/**
 * analytics.controller.js
 * Handles campaign analytics + overview stats endpoints.
 */

import { getCampaignFunnel, getCategoryBreakdown } from '../services/analytics.service.js';
import { computeAttribution } from '../services/attribution.service.js';
import { analyzeCampaign } from '../services/ai.service.js';
import { getCampaignById } from '../services/campaign.service.js';
import { Customer } from '../models/Customer.js';
import { Campaign } from '../models/Campaign.js';
import { Communication } from '../models/Communication.js';

import { simulateLocalDelivery } from '../services/channel.service.js';

/**
 * GET /api/campaigns/:id/analytics
 * Returns funnel + attribution + (if COMPLETED) AI insight.
 */
export async function getCampaignAnalytics(req, res) {
  try {
    const { id } = req.params;

    const campaign = await getCampaignById(id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Auto-recover: if campaign is SENDING and no events have fired yet, kick off simulation
    if (campaign.status === 'SENDING') {
      const pendingCount = await Communication.countDocuments({ campaignId: id, status: 'CREATED' });
      if (pendingCount > 0) {
        const pendingComms = await Communication.find({ campaignId: id, status: 'CREATED' }).limit(100);
        for (const comm of pendingComms) {
          simulateLocalDelivery(comm, id, campaign.channel);
        }
      }
    }

    // 1. Compute funnel
    const funnel = await getCampaignFunnel(id);

    // 2. Compute attribution (on demand)
    const attribution = await computeAttribution(id);

    // 3. Get category breakdown (for AI input)
    const categoryBreakdown = await getCategoryBreakdown(id);

    // 4. AI insight — only for COMPLETED campaigns
    let aiInsight = null;
    let usedFallback = false;

    if (campaign.status === 'COMPLETED') {
      const aggregatedStats = {
        ...funnel,
        channel: campaign.channel,
        goal: campaign.goal,
        targetAudienceSize: campaign.targetAudienceSize,
        attributedOrders: attribution.attributedOrders,
        attributedRevenue: attribution.attributedRevenue,
        categoryBreakdown: categoryBreakdown.slice(0, 5)  // top 5 categories only
      };

      const aiResult = await analyzeCampaign(aggregatedStats);
      aiInsight = aiResult.data;
      usedFallback = aiResult.usedFallback;
    }

    return res.status(200).json({
      campaignId: id,
      campaignName: campaign.name,
      status: campaign.status,
      channel: campaign.channel,
      targetAudienceSize: campaign.targetAudienceSize,
      funnel,
      attribution,
      categoryBreakdown,
      aiInsight,
      usedFallback,
      inProgress: campaign.status !== 'COMPLETED',
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('[ANALYTICS] getCampaignAnalytics error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/analytics/overview
 * Dashboard summary stats: total customers, active campaigns, messages sent,
 * overall engagement rate, simulated attributed revenue.
 */
export async function getOverviewStats(req, res) {
  try {
    const [
      totalCustomers,
      activeCampaigns,
      totalMessagesSent,
      totalClicked,
      completedCampaigns
    ] = await Promise.all([
      Customer.countDocuments(),
      Campaign.countDocuments({ status: { $in: ['SENDING', 'QUEUED'] } }),
      Communication.countDocuments({ status: { $nin: ['CREATED', 'FAILED'] } }),
      Communication.countDocuments({ status: { $in: ['CLICKED', 'CONVERTED'] } }),
      Campaign.find({ status: 'COMPLETED' }).select('stats').lean()
    ]);

    const engagementRate = totalMessagesSent > 0
      ? ((totalClicked / totalMessagesSent) * 100).toFixed(1)
      : '0.0';

    const attributedRevenue = completedCampaigns.reduce(
      (sum, c) => sum + (c.stats?.attributedRevenue || 0),
      0
    );

    return res.status(200).json({
      totalCustomers,
      activeCampaigns,
      messagesSent: totalMessagesSent,
      engagementRate: parseFloat(engagementRate),
      attributedRevenue: Math.round(attributedRevenue * 100) / 100,
      simulatedAttribution: true
    });
  } catch (err) {
    console.error('[ANALYTICS] getOverviewStats error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
