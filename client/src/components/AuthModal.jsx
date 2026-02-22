import React, { useState } from 'react';
import { toast } from "sonner";
import { authService } from '../services/authService';

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.224 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.84 1.154 7.955 3.045l5.657-5.657C34.053 6.054 29.277 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.84 1.154 7.955 3.045l5.657-5.657C34.053 6.054 29.277 4 24 4c-7.682 0-14.347 4.337-17.694 10.691z" />
    <path fill="#4CAF50" d="M24 44c5.177 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.149 35.091 26.684 36 24 36c-5.204 0-9.62-3.318-11.283-7.946l-6.522 5.025C9.5 39.556 16.227 44 24 44z" />
    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.05 12.05 0 0 1-4.084 5.571l6.19 5.238C36.971 39.215 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
  </svg>
);

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
            if (data.token) {
              localStorage.setItem('token', data.token);
            }
            onLoginSuccess(data.user);
            onClose();
          
            // Gọi Toast Modal (Responsive Version)
            toast.custom((t) => (
              <div className="relative w-[92vw] sm:w-full sm:max-w-[420px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl p-6 sm:p-7 shadow-2xl z-[99999] animate-in zoom-in-95 fade-in duration-200">
                <button
                  onClick={() => toast.dismiss(t)}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  ✕
                </button>

                <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 flex items-center justify-center mb-4">
                  <span className="text-2xl">🎉</span>
                </div>

                <p className="text-[11px] uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400 font-bold mb-1">
                  Đăng nhập thành công
                </p>
                <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-2 leading-tight">
                  Chào mừng trở lại!
                </h2>
                <p className="text-[17px] text-gray-600 dark:text-gray-300 mb-5 leading-relaxed">
                  Xin chào <span className="font-bold text-gray-900 dark:text-white">{data.user.fullName}</span>. Sẵn sàng tiếp tục học tập chưa?
                </p>

                <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 rounded-2xl px-4 py-3 mb-5">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Tên đăng nhập</span>
                  <span className="text-sm font-bold text-gray-800 dark:text-gray-100">@{data.user.username}</span>
                </div>

                <button
                  onClick={() => toast.dismiss(t)}
                  className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg transition-colors"
                >
                  Vào học ngay
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
              <div className="relative w-[92vw] sm:w-full sm:max-w-[420px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl p-6 sm:p-7 shadow-2xl z-[99999] animate-in zoom-in-95 fade-in duration-200">
                <button
                  onClick={() => toast.dismiss(t)}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  ✕
                </button>

                <div className="w-14 h-14 rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/50 flex items-center justify-center mb-4">
                  <span className="text-2xl">✅</span>
                </div>

                <p className="text-[11px] uppercase tracking-[0.16em] text-green-600 dark:text-green-400 font-bold mb-1">
                  Đăng ký thành công
                </p>
                <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-2 leading-tight">
                  Tài khoản đã sẵn sàng
                </h2>
                <p className="text-[17px] text-gray-600 dark:text-gray-300 mb-5 leading-relaxed">
                  Mời bạn đăng nhập để bắt đầu hành trình học tập trên Whalio.
                </p>

                <button
                  onClick={() => toast.dismiss(t)}
                  className="w-full py-3.5 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-bold text-lg transition-colors"
                >
                  Đăng nhập ngay
                </button>
              </div>
            ), { duration: 6000, position: 'top-center' });
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

  const handleGoogleLogin = () => {
    authService.startGoogleLogin();
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

          {isLoginView && (
            <div className="space-y-3 pt-2">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-400">Hoặc</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-left transition-all hover:border-gray-300 hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <GoogleIcon />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Đăng nhập với Google</p>
                    <p className="text-xs text-gray-500">Tiếp tục nhanh bằng tài khoản Google của bạn</p>
                  </div>
                </div>
              </button>
            </div>
          )}
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
