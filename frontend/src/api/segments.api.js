import apiClient from './client.js';

export async function previewSegment(filters) {
  const response = await apiClient.post('/segments/preview', filters);
  return response.data;
}

export async function createSegment(data) {
  const response = await apiClient.post('/segments', data);
  return response.data;
}

export async function getSegments() {
  const response = await apiClient.get('/segments');
  return response.data;
}

export async function getSegmentById(id) {
  const response = await apiClient.get(`/segments/${id}`);
  return response.data;
}
