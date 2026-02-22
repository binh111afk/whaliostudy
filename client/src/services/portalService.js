// Service để gọi API Portal
import { getFullApiUrl } from '../config/apiConfig';

const getStoredAuthToken = () => {
    if (typeof window === 'undefined') return '';
    return (
        localStorage.getItem('token') ||
        localStorage.getItem('adminToken') ||
        localStorage.getItem('accessToken') ||
        ''
    );
};

const buildPortalFetchOptions = (overrides = {}) => {
    const authToken = getStoredAuthToken();
    const impersonating = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('impersonate') === '1';
    const headers = {
        ...(overrides.headers || {})
    };

    if ((impersonating || authToken) && authToken) {
        headers.Authorization = `Bearer ${authToken}`;
    }

    return {
        credentials: 'include',
        ...overrides,
        headers
    };
};

export const portalService = {
    // Lấy dữ liệu portal từ MongoDB
    async getPortalData() {
        try {
            const response = await fetch(getFullApiUrl('/api/portal'), buildPortalFetchOptions());
            const contentType = response.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
                return { success: false, message: `API /api/portal trả về không phải JSON (status ${response.status})` };
            }
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Lỗi khi lấy dữ liệu portal:', error);
            return { success: false, message: 'Lỗi kết nối Server!' };
        }
    },

    // Cập nhật dữ liệu portal (chỉ admin)
    async updatePortalData(categories) {
        try {
            const response = await fetch(getFullApiUrl('/api/portal/update'), buildPortalFetchOptions({
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ categories })
            }));
            const contentType = response.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
                return { success: false, message: `API /api/portal/update trả về không phải JSON (status ${response.status})` };
            }
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Lỗi khi cập nhật portal:', error);
            return { success: false, message: 'Lỗi kết nối Server!' };
        }
    }
};
