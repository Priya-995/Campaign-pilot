import * as aiService from '../services/ai.service.js';

export async function interpretIntent(req, res) {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text prompt is required' });
    }
    const result = await aiService.interpretIntent(text);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

export async function recommendCampaign(req, res) {
  try {
    const { filters, audienceSample } = req.body;
    const result = await aiService.recommendCampaign({ filters: filters || {}, audienceSample: audienceSample || [] });
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

export async function generateMessage(req, res) {
  try {
    const { goal, offer, tone, channel, personalizationFields } = req.body;
    const result = await aiService.generateMessage({ goal, offer, tone, channel, personalizationFields });
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

export async function analyzeCampaign(req, res) {
  try {
    const { aggregatedStats } = req.body;
    const result = await aiService.analyzeCampaign(aggregatedStats || {});
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
