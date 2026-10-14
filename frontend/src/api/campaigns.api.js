import apiClient from './client.js';

export async function getCampaigns() {
  const response = await apiClient.get('/campaigns');
  return response.data;
}

export async function getCampaignById(id) {
  const response = await apiClient.get(`/campaigns/${id}`);
  return response.data;
}

export async function createCampaign(data) {
  const response = await apiClient.post('/campaigns', data);
  return response.data;
}

export async function updateCampaign(id, patch) {
  const response = await apiClient.patch(`/campaigns/${id}`, patch);
  return response.data;
}

export async function previewMessages(id) {
  const response = await apiClient.get(`/campaigns/${id}/preview-messages`);
  return response.data;
}

export async function launchCampaign(id) {
  const response = await apiClient.post(`/campaigns/${id}/launch`);
  return response.data;
}

export async function getCampaignAnalytics(id) {
  const response = await apiClient.get(`/campaigns/${id}/analytics`);
  return response.data;
}
