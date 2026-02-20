// Đây là nơi chứa logic gọi API (tách biệt hoàn toàn với giao diện)
import { getFullApiUrl } from '../config/apiConfig';

export const authService = {
    async login(username, password) {
        try {
            // Sử dụng getFullApiUrl để hỗ trợ cả development (proxy) và production (full URL)
            const response = await fetch(getFullApiUrl('/api/login'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            return await response.json();
        } catch (error) {
            console.error('Lỗi đăng nhập:', error);
            return { success: false, message: 'Lỗi kết nối Server!' };
        }
    },

    async register(payload) {
        try {
            const response = await fetch(getFullApiUrl('/api/register'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            return await response.json();
        } catch (error) {
            console.error('Lỗi đăng ký:', error);
            return { success: false, message: 'Lỗi kết nối Server!' };
        }
    }
};