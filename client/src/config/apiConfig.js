// Cấu hình API URL cho toàn bộ ứng dụng
// Sử dụng biến môi trường VITE_API_URL từ file .env

/**
 * Lấy base URL cho API
 * - Production: Sử dụng VITE_API_URL từ .env
 * - Development: Sử dụng relative path để tận dụng Vite proxy
 */
export const getApiUrl = () => {
  // Nếu có biến môi trường VITE_API_URL thì sử dụng (cho production)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Nếu không có (development), trả về chuỗi rỗng để dùng relative path
  return '';
};

export const API_BASE_URL = getApiUrl();

/**
 * Helper function để tạo full API URL
 * @param {string} endpoint - API endpoint (vd: '/api/login')
 * @returns {string} - Full URL
 */
export const getFullApiUrl = (endpoint) => {
  const baseUrl = getApiUrl();
  // Nếu baseUrl rỗng, trả về endpoint gốc (relative path)
  // Nếu có baseUrl, ghép lại nhưng tránh duplicate slash
  if (!baseUrl) return endpoint;
  
  // Loại bỏ trailing slash từ baseUrl và leading slash từ endpoint nếu cần
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  return `${cleanBaseUrl}${cleanEndpoint}`;
};
