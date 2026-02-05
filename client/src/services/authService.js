// Đây là nơi chứa logic gọi API (tách biệt hoàn toàn với giao diện)
export const authService = {
    async login(username, password) {
        try {
            // Gọi qua Proxy (đã cấu hình trong vite.config.js) nên chỉ cần /api/login
            const response = await fetch('/api/login', {
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
            const response = await fetch('/api/register', {
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