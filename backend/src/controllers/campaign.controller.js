import * as campaignService from '../services/campaign.service.js';

export async function createCampaign(req, res) {
  try {
    const campaign = await campaignService.createCampaign(req.body);
    return res.status(201).json(campaign);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}

export async function updateCampaign(req, res) {
  try {
    const campaign = await campaignService.updateCampaign(req.params.id, req.body);
    return res.status(200).json(campaign);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}

export async function listCampaigns(req, res) {
  try {
    const campaigns = await campaignService.getCampaigns();
    return res.status(200).json({ campaigns });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

export async function getCampaign(req, res) {
  try {
    const campaign = await campaignService.getCampaignById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    return res.status(200).json(campaign);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

export async function previewCampaignMessages(req, res) {
  try {
    const result = await campaignService.previewCampaignMessages(req.params.id);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}

export async function launchCampaign(req, res) {
  try {
    const result = await campaignService.launchCampaign(req.params.id);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}
