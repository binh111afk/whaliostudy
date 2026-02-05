import React, { useState } from 'react';
import { userService } from '../services/userService';
import { X, Lock } from 'lucide-react';

const ChangePasswordModal = ({ isOpen, onClose, username }) => {
  const [formData, setFormData] = useState({
    oldPass: '',
    newPass: '',
    confirmPass: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(''); // Xóa lỗi khi người dùng gõ lại
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // 1. Validate cơ bản
    if (formData.newPass !== formData.confirmPass) {
      setError('⚠️ Mật khẩu mới nhập lại không khớp!');
      return;
    }

    if (formData.newPass.length < 6) {
      setError('⚠️ Mật khẩu mới phải có ít nhất 6 ký tự!');
      return;
    }

    setIsLoading(true);

    try {
      // 2. Gọi API
      const result = await userService.changePassword(username, formData.oldPass, formData.newPass);

      if (result.success) {
        alert('✅ Đổi mật khẩu thành công! Vui lòng đăng nhập lại.');
        onClose();
        // Tùy chọn: Đăng xuất luôn để user đăng nhập lại cho an toàn
        // window.location.reload(); 
      } else {
        setError('❌ ' + result.message);
      }
    } catch (err) {
      setError('🔌 Lỗi kết nối Server');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fade-in-up overflow-hidden">
        
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Lock size={20} className="text-blue-600"/> Đổi mật khẩu
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu hiện tại</label>
            <input 
              type="password" name="oldPass" required 
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              placeholder="••••••"
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu mới</label>
            <input 
              type="password" name="newPass" required 
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              placeholder="••••••"
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nhập lại mật khẩu mới</label>
            <input 
              type="password" name="confirmPass" required 
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              placeholder="••••••"
              onChange={handleChange}
            />
          </div>

          {/* Hiển thị lỗi nếu có */}
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex items-center gap-2">
              ⚠️ {error}
            </div>
          )}

          <div className="pt-2">
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all disabled:opacity-70"
            >
              {isLoading ? 'Đang xử lý...' : 'Xác nhận đổi'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default ChangePasswordModal;