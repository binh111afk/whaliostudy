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

/**
 * Xóa sạch localStorage và cookies liên quan đến authentication
 */
const clearAuthData = () => {
  // Xóa tất cả token và user data từ localStorage
  localStorage.removeItem('user');
  localStorage.removeItem('token');
  localStorage.removeItem('adminToken');
  localStorage.removeItem('accessToken');
  
  // Xóa cookies (nếu có)
  document.cookie.split(';').forEach((cookie) => {
    const name = cookie.split('=')[0].trim();
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  });
};

/**
 * Chuyển hướng về trang login
 */
const redirectToLogin = () => {
  // Tránh redirect loop nếu đang ở trang login
  if (!window.location.pathname.includes('/login')) {
    window.location.href = '/login';
  }
};

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
  (error) => {
    // Xử lý lỗi 401 Unauthorized
    if (error?.response?.status === 401) {
      console.warn('401 Unauthorized - Session expired or invalid token');
      
      // Xóa sạch auth data
      clearAuthData();
      
      // Chuyển hướng về login
      redirectToLogin();
    }
    
    return Promise.reject(error);
  }
);

export default axios;
