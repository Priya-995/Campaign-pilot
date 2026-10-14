import apiClient from './client.js';

export async function getOverviewStats() {
  const response = await apiClient.get('/analytics/overview');
  return response.data;
}
