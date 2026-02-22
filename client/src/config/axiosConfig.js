import axios from 'axios';
import { API_BASE_URL } from './apiConfig';

const ADMIN_SECURITY_THROTTLE_MS = 800;
const adminSecurityAxiosResponseCache = new Map();

function cloneData(value) {
  if (value === null || value === undefined) return value;
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value);
    } catch {
      // Fallback below
    }
  }
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}

function resolveAxiosUrl(config) {
  try {
    const baseURL = config.baseURL || axios.defaults.baseURL || window.location.origin;
    return new URL(config.url, baseURL);
  } catch {
    return null;
  }
}

function buildAxiosRequestKey(config, method, requestUrl) {
  const paramsPart = config?.params ? JSON.stringify(config.params) : '';
  return `${method.toUpperCase()}:${requestUrl.origin}${requestUrl.pathname}${requestUrl.search}|${paramsPart}`;
}

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

  const requestMethod = String(nextConfig.method || 'get').toLowerCase();
  const requestUrl = resolveAxiosUrl(nextConfig);
  const isAdminSecurityGet =
    requestMethod === 'get' && Boolean(requestUrl?.pathname?.startsWith('/api/admin/security/'));

  if (isAdminSecurityGet && requestUrl) {
    const requestKey = buildAxiosRequestKey(nextConfig, requestMethod, requestUrl);
    const cached = adminSecurityAxiosResponseCache.get(requestKey);
    if (cached && Date.now() - cached.at <= ADMIN_SECURITY_THROTTLE_MS) {
      nextConfig.adapter = async () => ({
        data: cloneData(cached.data),
        status: cached.status,
        statusText: cached.statusText,
        headers: cached.headers,
        config: nextConfig,
        request: { cached: true }
      });
    } else {
      adminSecurityAxiosResponseCache.delete(requestKey);
      nextConfig.__adminSecurityRequestKey = requestKey;
    }
  }

  return nextConfig;
});

axios.interceptors.response.use(
  (response) => {
    const requestKey = response?.config?.__adminSecurityRequestKey;
    if (requestKey && response.status >= 200 && response.status < 300) {
      adminSecurityAxiosResponseCache.set(requestKey, {
        at: Date.now(),
        data: cloneData(response.data),
        status: response.status,
        statusText: response.statusText || 'OK',
        headers: response.headers || {}
      });
    }
    return response;
  },
  (error) => Promise.reject(error)
);

export default axios;
