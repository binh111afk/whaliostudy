import React from "react";

const WhalioBrand = ({ compact = false }) => {
  const iconSizeClass = compact ? "h-10 w-10" : "h-12 w-12";
  const titleSizeClass = compact ? "text-[1.28rem]" : "text-[1.38rem]";
  const subtitleSizeClass = compact ? "text-[0.76rem]" : "text-[0.8rem]";

  return (
    <div className="flex items-center gap-3">
      <img
        src="/img/logo.png"
        alt="Whalio logo"
        className={`${iconSizeClass} shrink-0 rounded-2xl object-contain`}
        loading="lazy"
      />

      <div className="min-w-0 leading-none">
        <div
          className={`${titleSizeClass} font-semibold tracking-[-0.02em] text-[#1e4f9f] dark:text-blue-300 font-['Inter','Manrope','Segoe_UI',sans-serif]`}
        >
          Whalio
        </div>
        <div
          className={`${subtitleSizeClass} mt-1 font-medium tracking-[-0.01em] text-[#5f7db0] dark:text-blue-200/80 font-['Inter','Manrope','Segoe_UI',sans-serif]`}
        >
          Study
        </div>
      </div>
    </div>
  );
};

export default WhalioBrand;
