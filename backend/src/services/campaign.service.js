import { Campaign } from '../models/Campaign.js';
import { Segment } from '../models/Segment.js';
import { Customer } from '../models/Customer.js';
import { Communication } from '../models/Communication.js';
import { buildMongoQuery } from './segmentation.service.js';
import { renderMessage, previewMessages } from './personalization.service.js';
import { sendBatch } from './channel.service.js';

export async function createCampaign(data) {
  const { name, goal, segmentId, channel, messageTemplate, personalizationFields, offer } = data;

  const segment = await Segment.findById(segmentId);
  if (!segment) {
    throw new Error('Associated segment not found');
  }

  const campaign = new Campaign({
    name,
    goal: goal || '',
    segmentId,
    channel,
    messageTemplate,
    personalizationFields: personalizationFields || ['first_name', 'discount', 'coupon_code'],
    offer: offer || { type: 'PERCENTAGE', value: '20% OFF' },
    status: 'DRAFT',
    targetAudienceSize: segment.estimatedSize || 0
  });

  await campaign.save();
  return campaign;
}

export async function updateCampaign(id, patch) {
  const campaign = await Campaign.findById(id);
  if (!campaign) {
    throw new Error('Campaign not found');
  }

  if (campaign.status !== 'DRAFT') {
    throw new Error(`Cannot update campaign in status '${campaign.status}'. Only DRAFT campaigns can be updated.`);
  }

  // Prevent direct state mutations or stats overwrites via patch
  delete patch.status;
  delete patch.stats;
  delete patch.targetAudienceSize;

  Object.assign(campaign, patch);
  await campaign.save();
  return campaign;
}

export async function getCampaigns() {
  return Campaign.find().populate('segmentId', 'name filters estimatedSize').sort({ createdAt: -1 }).lean();
}

export async function getCampaignById(id) {
  return Campaign.findById(id).populate('segmentId').lean();
}

export async function previewCampaignMessages(campaignId, count = 3) {
  const campaign = await Campaign.findById(campaignId).populate('segmentId');
  if (!campaign) {
    throw new Error('Campaign not found');
  }

  const segment = campaign.segmentId;
  const query = buildMongoQuery(segment?.filters || {});
  const sampleCustomers = await Customer.find(query).limit(count).lean();

  return {
    campaignId: campaign._id,
    campaignName: campaign.name,
    channel: campaign.channel,
    previews: previewMessages(campaign.messageTemplate, sampleCustomers, campaign.offer, count)
  };
}

export async function launchCampaign(id) {
  const campaign = await Campaign.findById(id).populate('segmentId');
  if (!campaign) {
    throw new Error('Campaign not found');
  }

  // Strict state machine validation
  if (campaign.status !== 'DRAFT') {
    throw new Error(`Invalid state transition. Cannot launch campaign currently in status '${campaign.status}'.`);
  }

  // 1. Transition DRAFT -> QUEUED
  campaign.status = 'QUEUED';
  await campaign.save();

  // 2. Materialize segment
  const query = buildMongoQuery(campaign.segmentId?.filters || {});
  const matchedCustomers = await Customer.find(query).lean();

  campaign.targetAudienceSize = matchedCustomers.length;
  campaign.launchedAt = new Date();
  campaign.status = 'SENDING';
  await campaign.save();

  // 3. Bulk create Communication records (status: CREATED)
  let insertedCommunications = [];
  if (matchedCustomers.length > 0) {
    const communicationsToInsert = matchedCustomers.map(cust => {
      const recipient = campaign.channel === 'email' ? cust.email : cust.phone;
      const message = renderMessage(campaign.messageTemplate, cust, campaign.offer);

      return {
        campaignId: campaign._id,
        customerId: cust._id,
        channel: campaign.channel,
        recipient,
        message,
        status: 'CREATED'
      };
    });

    const BATCH_SIZE = 1000;
    for (let i = 0; i < communicationsToInsert.length; i += BATCH_SIZE) {
      const chunk = communicationsToInsert.slice(i, i + BATCH_SIZE);
      const inserted = await Communication.insertMany(chunk);
      insertedCommunications = insertedCommunications.concat(inserted);
    }
  }

  console.log(`[CAMPAIGN ENGINE] Launched campaign '${campaign.name}' (${campaign._id}). Created ${matchedCustomers.length} Communication records.`);

  // 4. Fire-and-forget: dispatch all communications to the Channel Simulator
  if (insertedCommunications.length > 0) {
    setImmediate(() => {
      sendBatch(insertedCommunications, campaign._id, campaign.channel)
        .catch(err => console.error(`[CAMPAIGN ENGINE] sendBatch error for campaign ${campaign._id}:`, err.message));
    });
  }

  return {
    campaign,
    materializedAudienceCount: matchedCustomers.length
  };
}
