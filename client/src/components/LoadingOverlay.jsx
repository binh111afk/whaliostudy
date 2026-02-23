import React from "react";

/**
 * LoadingOverlay - Hiển thị animation cá voi khi đang thực hiện thao tác
 * @param {boolean} isVisible - Hiển thị hay không
 * @param {string} message - Thông báo hiển thị (VD: "Đang thêm lớp học...")
 */
const LoadingOverlay = ({ isVisible, message = "Đang xử lý..." }) => {
  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center transition-all duration-300"
      aria-live="polite"
      aria-label={message}
    >
      {/* Backdrop mờ */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      
      {/* Content */}
      <div className="relative z-10 mx-auto flex w-full max-w-sm flex-col items-center text-center px-6">
        <img
          src="/logo.png"
          alt="Whalio Loading"
          className="h-24 w-24 animate-whale-float object-contain drop-shadow-2xl sm:h-28 sm:w-28"
        />
        <p className="mt-6 text-base font-bold leading-relaxed text-white drop-shadow-lg sm:text-lg">
          {message}
        </p>
        {/* Loading dots animation */}
        <div className="flex justify-center gap-1.5 mt-4">
          <span className="w-2.5 h-2.5 bg-white rounded-full animate-bounce drop-shadow-md" style={{ animationDelay: '0ms' }} />
          <span className="w-2.5 h-2.5 bg-white rounded-full animate-bounce drop-shadow-md" style={{ animationDelay: '150ms' }} />
          <span className="w-2.5 h-2.5 bg-white rounded-full animate-bounce drop-shadow-md" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
};

export default LoadingOverlay;
