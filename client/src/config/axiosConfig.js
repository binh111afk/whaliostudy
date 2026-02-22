import axios from 'axios';
import { API_BASE_URL } from './apiConfig';

axios.defaults.withCredentials = true;
if (API_BASE_URL) {
  axios.defaults.baseURL = API_BASE_URL;
}

axios.interceptors.request.use((config) => {
  const nextConfig = { ...config };
  nextConfig.withCredentials = true;

  const token =
    localStorage.getItem('token') ||
    localStorage.getItem('adminToken') ||
    localStorage.getItem('accessToken');

  if (token) {
    nextConfig.headers = nextConfig.headers || {};
    if (!nextConfig.headers.Authorization) {
      nextConfig.headers.Authorization = `Bearer ${token}`;
    }
  }

  return nextConfig;
});

export default axios;
