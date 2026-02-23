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
        {/* Card container */}
        <div className="bg-[#0a2f73]/95 rounded-2xl p-8 shadow-2xl border border-blue-400/20">
          <img
            src="/logo.png"
            alt="Whalio Loading"
            className="h-20 w-20 animate-whale-float object-contain mx-auto"
          />
          <p className="mt-5 text-sm font-semibold leading-relaxed text-blue-100 sm:text-base">
            {message}
          </p>
          {/* Loading dots animation */}
          <div className="flex justify-center gap-1.5 mt-4">
            <span className="w-2 h-2 bg-blue-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-blue-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-blue-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingOverlay;
