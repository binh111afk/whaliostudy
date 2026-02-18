import React from "react";

const WhalioBrand = ({ compact = false }) => {
  // Lưu ý: Tailwind mặc định không có h-15, w-15. 
  // Mình đổi thành h-14 (56px) hoặc bạn có thể dùng h-[60px] nếu muốn chính xác cỡ cũ.
  const iconSizeClass = compact ? "h-10 w-10" : "h-14 w-14"; 

  return (
    <div
      // Thêm 'group' để xử lý hiệu ứng hover cho cả khối
      className={`group flex items-center transition-all duration-300 cursor-pointer ${
        compact ? "justify-center py-2" : "gap-3 py-2 pl-4"
      }`}
    >
      {/* --- ICON LOGO --- */}
      <div className="relative">
        {/* Hiệu ứng Glow nhẹ sau logo khi hover (tùy chọn, làm logo nổi hơn) */}
        <div className={`absolute inset-0 bg-blue-400 rounded-full blur opacity-0 group-hover:opacity-20 transition-opacity duration-500 ${compact ? 'scale-75' : 'scale-90'}`}></div>
        
        <img
          src="/img/logo.png"
          alt="Whalio Study"
          className={`relative ${iconSizeClass} shrink-0 object-contain drop-shadow-md transition-transform duration-300 group-hover:scale-105`}
          style={{ minWidth: compact ? '2.5rem' : '3.5rem' }}
          loading="eager"
        />
      </div>

      {/* --- TEXT BLOCK --- */}
      {!compact && (
        <div className="flex flex-col justify-center items-start">
          
          {/* WHALIO: Gradient Text + Drop Shadow nhẹ */}
          <span className="text-[26px] font-black leading-none font-['Manrope',sans-serif] tracking-tight
            text-transparent bg-clip-text bg-gradient-to-r from-[#0F4C81] via-blue-600 to-cyan-500
            dark:from-blue-300 dark:via-blue-400 dark:to-cyan-300
            drop-shadow-sm select-none"
          >
            Whalio
          </span>

          {/* STUDY: Styling hiện đại + Animation giãn chữ khi hover */}
          <div className="flex items-center gap-1 mt-0.5">
             {/* Dòng kẻ trang trí nhỏ bên cạnh chữ STUDY để tạo điểm nhấn */}
             <div className="h-[2px] w-3 bg-cyan-500 rounded-full transition-all duration-300 group-hover:w-5"></div>
             
             <span className="text-[11px] font-bold tracking-[0.15em] text-slate-500 dark:text-slate-400 font-['Manrope',sans-serif] uppercase leading-none transition-all duration-300 group-hover:tracking-[0.25em] group-hover:text-blue-600 dark:group-hover:text-blue-300">
              Study
             </span>
          </div>
          
        </div>
      )}
    </div>
  );
};

export default WhalioBrand;