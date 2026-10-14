import apiClient from './client.js';

export async function getCustomers(params = {}) {
  const response = await apiClient.get('/customers', { params });
  return response.data;
}

export async function getCustomerById(id) {
  const response = await apiClient.get(`/customers/${id}`);
  return response.data;
}

export async function getCustomerOrders(id) {
  const response = await apiClient.get(`/customers/${id}/orders`);
  return response.data;
}
