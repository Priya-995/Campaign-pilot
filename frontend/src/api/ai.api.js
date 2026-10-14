import apiClient from './client.js';

export async function interpretIntent(text) {
  const response = await apiClient.post('/ai/interpret-intent', { text });
  return response.data;
}

export async function recommendCampaign(payload) {
  const response = await apiClient.post('/ai/recommend-campaign', payload);
  return response.data;
}

export async function generateMessage(payload) {
  const response = await apiClient.post('/ai/generate-message', payload);
  return response.data;
}

export async function analyzeCampaign(stats) {
  const response = await apiClient.post('/ai/analyze-campaign', stats);
  return response.data;
}
