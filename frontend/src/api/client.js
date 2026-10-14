import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 15000
});

// Response interceptor for clear errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.error || error.message || 'API request failed';
    console.error(`[API ERROR] ${error.config?.method?.toUpperCase()} ${error.config?.url}:`, message);
    return Promise.reject(new Error(message));
  }
);

export default apiClient;
