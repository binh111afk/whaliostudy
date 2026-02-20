// client/src/services/userService.js
import { getFullApiUrl } from '../config/apiConfig';

export const userService = {
    // Cập nhật thông tin text
    async updateProfile(userData) {
      const response = await fetch(getFullApiUrl('/api/update-profile'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      return await response.json();
    },
  
    // Upload Avatar (Gửi dạng Form Data)
    async uploadAvatar(username, file) {
      const formData = new FormData();
      formData.append('username', username);
      formData.append('avatar', file);
  
      const response = await fetch(getFullApiUrl('/api/upload-avatar'), {
        method: 'POST',
        body: formData // Không cần set Content-Type, trình duyệt tự làm
      });
      return await response.json();
    },
  
    // Đổi mật khẩu
    async changePassword(username, oldPass, newPass) {
      const response = await fetch(getFullApiUrl('/api/change-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, oldPass, newPass })
      });
      return await response.json();
    },

    // Cập nhật cấu hình học tập
    async updateSettings(username, settings) {
      const response = await fetch(getFullApiUrl('/api/update-settings'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, ...settings })
      });
      return await response.json();
    },

    // Lấy thống kê tổng hợp cho Profile
    async getProfileStats(username) {
      try {
        const response = await fetch(getFullApiUrl(`/api/profile/stats?username=${username}`));
        return await response.json();
      } catch (error) {
        console.error('Error getting profile stats:', error);
        return { success: false, data: null };
      }
    }
  };