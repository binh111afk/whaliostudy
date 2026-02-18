import React from "react";

const WhalioBrand = ({ compact = false }) => {
  // Khi mở rộng: Icon tăng lên h-20 (80px) - To gấp đôi bản cũ
  // Khi thu gọn: Giữ h-12 để vẫn nhìn rõ
  const iconSizeClass = compact ? "h-12 w-12" : "h-20 w-20";

  return (
    <div 
      className={`flex items-center transition-all duration-300 ${
        // Tăng gap lên 5 để icon và chữ không bị dính
        compact ? "justify-center py-6" : "gap-5 py-8 pl-3"
      }`}
    >
      {/* ICON: Phóng to hết cỡ */}
      <img
        src="/img/logo.png"
        alt="Whalio Study"
        className={`${iconSizeClass} shrink-0 object-contain drop-shadow-lg`}
        // Thêm style này để đảm bảo ảnh không bị méo nếu file gốc có tỉ lệ lạ
        style={{ minWidth: compact ? '3rem' : '5rem' }}
        loading="eager"
      />

      {/* TEXT BLOCK */}
      {!compact && (
        <div className="flex flex-col justify-center">
          {/* WHALIO: Tăng lên text-3xl (30px) và dùng font Black (siêu đậm) */}
          <span className="text-3xl font-black tracking-tighter leading-none text-[#0F4C81] dark:text-blue-400 font-['Manrope',sans-serif]">
            Whalio
          </span>
          
          {/* STUDY: Tăng size và giãn chữ ra để đỡ bị chữ trên đè bẹp */}
          <span className="text-sm font-bold tracking-[0.2em] text-[#0F4C81]/80 dark:text-blue-300/80 font-['Manrope',sans-serif] uppercase mt-1">
            Study
          </span>
        </div>
      )}
    </div>
  );
};

export default WhalioBrand;