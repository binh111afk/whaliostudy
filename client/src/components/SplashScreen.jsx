import React from "react";

const SplashScreen = ({ isVisible, isFadingOut = false, error = null, onRetryLogin = null }) => {
  if (!isVisible) return null;

  const handleBackToLogin = () => {
    // Xóa sạch auth data
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('accessToken');
    
    // Xóa cookies
    document.cookie.split(';').forEach((cookie) => {
      const name = cookie.split('=')[0].trim();
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    });
    
    // Chuyển về trang login
    if (onRetryLogin) {
      onRetryLogin();
    } else {
      window.location.href = '/login';
    }
  };

  return (
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center bg-[#0a2f73] px-6 transition-opacity duration-500 ${
        isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      aria-live="polite"
      aria-label={error ? "Đã xảy ra lỗi" : "Whalio đang tải dữ liệu"}
    >
      <div className="mx-auto flex w-full max-w-md flex-col items-center text-center">
        <img
          src="/logo.png"
          alt="Whalio Logo"
          className={`h-24 w-24 object-contain sm:h-32 sm:w-32 ${error ? '' : 'animate-whale-float'}`}
          loading="eager"
          fetchPriority="high"
        />
        
        {error ? (
          <>
            <p className="mt-7 text-sm font-semibold leading-relaxed text-red-300 sm:text-base">
              {error}
            </p>
            <button
              onClick={handleBackToLogin}
              className="mt-6 rounded-xl bg-white/20 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/30 active:scale-95 sm:text-base"
            >
              🔑 Quay lại đăng nhập
            </button>
          </>
        ) : (
          <p className="mt-7 text-sm font-semibold leading-relaxed text-blue-100 sm:text-base">
            Whalio đang chuẩn bị dữ liệu cho bạn, hãy đợi một chút nhé
          </p>
        )}
      </div>
    </div>
  );
};

export default SplashScreen;
