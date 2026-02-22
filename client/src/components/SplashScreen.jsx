import React from "react";

const SplashScreen = ({ isVisible, isFadingOut = false }) => {
  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center bg-[#0a2f73] px-6 transition-opacity duration-500 ${
        isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      aria-live="polite"
      aria-label="Whalio đang tải dữ liệu"
    >
      <div className="mx-auto flex w-full max-w-md flex-col items-center text-center">
        <img
          src="/logo.png"
          alt="Whalio Logo"
          className="h-24 w-24 animate-whale-float object-contain sm:h-32 sm:w-32"
          loading="eager"
          fetchPriority="high"
        />
        <p className="mt-7 text-sm font-semibold leading-relaxed text-blue-100 sm:text-base">
          Whalio đang chuẩn bị dữ liệu cho bạn, hãy đợi một chút nhé
        </p>
      </div>
    </div>
  );
};

export default SplashScreen;
