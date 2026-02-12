import React, { useState } from 'react';
import { toast } from "sonner";
import { authService } from '../services/authService';

const AuthModal = ({ isOpen, onClose, onLoginSuccess }) => {
  const [isLoginView, setIsLoginView] = useState(true); // true = Login, false = Register
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // State lưu dữ liệu nhập vào
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    fullName: '',
    confirmPassword: ''
  });

  if (!isOpen) return null;

  // Xử lý khi nhập liệu
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Xử lý Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
        // 1. Validate phía Client trước
        if (!isLoginView && formData.password !== formData.confirmPassword) {
            throw new Error('⚠️ Mật khẩu nhập lại không khớp!');
        }

        let data;

        // 2. Gọi API thông qua Service
        if (isLoginView) {
            data = await authService.login(formData.username, formData.password);
        } else {
            // Gom dữ liệu đăng ký cho gọn
            const registerPayload = {
                username: formData.username,
                password: formData.password,
                fullName: formData.fullName,
                email: formData.email
            };
            data = await authService.register(registerPayload);
        }

        // 3. Xử lý kết quả
        if (data.success) {
          if (isLoginView) {
            // --- 1. ĐĂNG NHẬP THÀNH CÔNG ---
            localStorage.setItem('user', JSON.stringify(data.user));
            onLoginSuccess(data.user);
            onClose();
          
            // Gọi Toast Modal (Responsive Version)
            toast.custom((t) => (
              <div className="relative w-[90vw] sm:w-full sm:max-w-[400px] bg-white dark:bg-gray-900 p-6 sm:p-8 rounded-[24px] sm:rounded-[32px] flex flex-col items-center text-center 
                animate-in zoom-in-95 duration-300
                shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] z-[99999]"> 
                {/* 👆 Shadow hack vẫn giữ nguyên để làm tối nền */}
                
                {/* Icon Ăn mừng - Tự co nhỏ trên mobile */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-4 sm:mb-6 shadow-inner">
                  <span className="text-3xl sm:text-4xl animate-bounce">🎉</span>
                </div>
          
                {/* Tiêu đề */}
                <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white mb-2">
                  Chào mừng trở lại!
                </h2>
                <p className="text-sm sm:text-base text-gray-500 dark:text-gray-300 mb-6 sm:mb-8 leading-relaxed">
                  Xin chào <span className="text-blue-600 dark:text-blue-400 font-bold">{data.user.fullName}</span>, chúc bạn một ngày học tập thật năng suất nhé!
                </p>
          
                {/* Nút bấm */}
                <button
                  onClick={() => toast.dismiss(t)}
                  className="w-full py-3 sm:py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-base sm:text-lg rounded-2xl shadow-lg shadow-blue-500/40 transform active:scale-95 hover:scale-[1.02] transition-all"
                >
                  Vào học ngay 🚀
                </button>
          
                {/* Nút tắt nhỏ góc trên */}
                <button 
                  onClick={() => toast.dismiss(t)}
                  className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>
            ), { 
              duration: Infinity, 
              position: 'top-center', 
            });
          
          } else {
            // --- 2. ĐĂNG KÝ THÀNH CÔNG ---
            setIsLoginView(true);
            setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
          
            toast.custom((t) => (
              <div className="relative w-[90vw] sm:w-full sm:max-w-[400px] bg-white dark:bg-gray-900 p-6 sm:p-8 rounded-[24px] sm:rounded-[32px] flex flex-col items-center text-center 
                animate-in zoom-in-95 duration-300
                shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] z-[99999]">
                
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4 sm:mb-6 shadow-inner">
                  <span className="text-3xl sm:text-4xl">✅</span>
                </div>
          
                <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white mb-2">
                  Đăng ký thành công!
                </h2>
                <p className="text-sm sm:text-base text-gray-500 dark:text-gray-300 mb-6 sm:mb-8">
                  Tài khoản đã sẵn sàng. Đăng nhập ngay để bắt đầu hành trình nhé.
                </p>
          
                <button
                  onClick={() => toast.dismiss(t)}
                  className="w-full py-3 sm:py-3.5 bg-green-600 hover:bg-green-700 text-white font-bold text-base sm:text-lg rounded-2xl shadow-lg shadow-green-500/40 transform active:scale-95 hover:scale-[1.02] transition-all"
                >
                  Đăng nhập ngay
                </button>
          
                <button 
                  onClick={() => toast.dismiss(t)}
                  className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>
            ), { duration: 5000, position: 'top-center' });
          }
        } else {
            // Server trả về lỗi (sai pass, user tồn tại...)
            throw new Error(data.message || 'Có lỗi xảy ra!');
        }

    } catch (err) {
        // Bắt tất cả lỗi (Validation, Network, Server) tại đây
        console.error("Auth Error:", err);
        setError(err.message || '🔌 Lỗi kết nối Server!');
    } finally {
        setIsLoading(false);
    }
};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
        
        {/* Header */}
        <div className="relative p-6 pb-2">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors">
            ✕
          </button>
          <h2 className="text-2xl font-bold text-gray-800">
            {isLoginView ? 'Chào mừng trở lại! 👋' : 'Tạo tài khoản mới 🚀'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {isLoginView ? 'Đăng nhập để tiếp tục học tập' : 'Tham gia cộng đồng Whalio ngay'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 pt-4 space-y-4">
          
          {/* Các trường đăng ký */}
          {!isLoginView && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
                <input 
                  type="text" name="fullName" required
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="Nguyễn Văn A"
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input 
                  type="email" name="email" required
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="email@example.com"
                  onChange={handleChange}
                />
              </div>
            </>
          )}

          {/* Trường chung */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên đăng nhập</label>
            <input 
              type="text" name="username" required
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="admin"
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
            <input 
              type="password" name="password" required
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="••••••"
              onChange={handleChange}
            />
          </div>

          {!isLoginView && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nhập lại mật khẩu</label>
              <input 
                type="password" name="confirmPassword" required
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="••••••"
                onChange={handleChange}
              />
            </div>
          )}

          {/* Error Message */}
          {error && <div className="text-red-500 text-sm bg-red-50 p-2 rounded-lg text-center">{error}</div>}

          {/* Submit Button */}
          <button 
            type="submit" disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg hover:shadow-blue-500/30 disabled:opacity-50"
          >
            {isLoading ? 'Đang xử lý...' : (isLoginView ? 'Đăng nhập' : 'Đăng ký ngay')}
          </button>
        </form>

        {/* Footer chuyển đổi */}
        <div className="p-4 bg-gray-50 text-center text-sm text-gray-600 border-t border-gray-100">
          {isLoginView ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}
          <button 
            onClick={() => { setIsLoginView(!isLoginView); setError(''); }}
            className="text-blue-600 font-bold hover:underline"
          >
            {isLoginView ? 'Đăng ký ngay' : 'Đăng nhập'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;