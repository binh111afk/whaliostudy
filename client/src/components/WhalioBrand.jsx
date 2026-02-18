import React from "react";

const WhalioBrand = ({ compact = false }) => {
  const iconSizeClass = compact ? "h-9 w-9" : "h-12 w-12";
  const titleSizeClass = compact ? "text-[1.05rem]" : "text-[1.22rem]";
  const subtitleSizeClass = compact ? "text-[0.66rem]" : "text-[0.72rem]";

  return (
    <div className="flex items-center gap-3">
      <div
        className={`${iconSizeClass} shrink-0 rounded-[18px] bg-gradient-to-br from-[#1f63d6] to-[#123f97] p-[3px] shadow-sm shadow-blue-200/70 dark:shadow-blue-950/40`}
        aria-hidden="true"
      >
        <div className="flex h-full w-full items-center justify-center rounded-[15px] bg-white dark:bg-slate-900">
          <svg viewBox="0 0 24 24" className="h-[78%] w-[78%]" fill="none">
            <path
              d="M4.9 13.5c0-3.56 3.12-6.45 6.98-6.45 1.92 0 3.66.7 4.92 1.84l1.1-1.16a.7.7 0 0 1 1.17.33c.16.58-.3 1.2-.63 1.58-.09.1-.18.2-.27.29.6.96.94 2.08.94 3.27 0 3.56-3.12 6.45-6.98 6.45-1.85 0-3.54-.66-4.79-1.76l-1.43 1.12a.7.7 0 0 1-.97-.12.7.7 0 0 1 .12-.97l1.2-.95c-.87-1.02-1.36-2.26-1.36-3.42Z"
              fill="url(#whalio-brand-body)"
            />
            <path
              d="M9.95 10.48c.33 0 .6.27.6.6s-.27.6-.6.6-.6-.27-.6-.6.27-.6.6-.6Z"
              fill="#DCEAFE"
            />
            <path
              d="M15.24 13.85c-.68 1-1.89 1.66-3.26 1.66-1.35 0-2.54-.64-3.23-1.61"
              stroke="#DBEAFE"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
            <defs>
              <linearGradient
                id="whalio-brand-body"
                x1="5"
                y1="7"
                x2="18.8"
                y2="18.8"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#2F7CF3" />
                <stop offset="1" stopColor="#1C4DB0" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      <div className="min-w-0 leading-none">
        <div
          className={`${titleSizeClass} font-semibold tracking-[-0.015em] text-[#173f88] dark:text-blue-300 font-['Inter','Manrope','Segoe_UI',sans-serif]`}
        >
          Whalio
        </div>
        <div
          className={`${subtitleSizeClass} mt-1 font-medium tracking-[-0.01em] text-[#5e7fb8] dark:text-blue-200/80 font-['Inter','Manrope','Segoe_UI',sans-serif]`}
        >
          Study
        </div>
      </div>
    </div>
  );
};

export default WhalioBrand;
