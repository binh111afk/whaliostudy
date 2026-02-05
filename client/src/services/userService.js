// client/src/services/userService.js
export const userService = {
    // Cập nhật thông tin text
    async updateProfile(userData) {
      const response = await fetch('/api/update-profile', {
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
  
      const response = await fetch('/api/upload-avatar', {
        method: 'POST',
        body: formData // Không cần set Content-Type, trình duyệt tự làm
      });
      return await response.json();
    },
  
    // Đổi mật khẩu
    async changePassword(username, oldPass, newPass) {
      const response = await fetch('/api/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, oldPass, newPass })
      });
      return await response.json();
    }
  };