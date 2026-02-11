import React, { useState, useRef, useEffect } from "react";
import { NavLink } from "react-router-dom";
import {
  Search,
  Bell,
  Moon,
  LogIn,
  User,
  Settings,
  Save,
  LogOut,
  ChevronDown,
} from "lucide-react";

const Header = ({ user, onLoginClick, onLogoutClick }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Xử lý click ra ngoài để đóng menu
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navLinkClass = ({ isActive }) =>
    `text-sm font-bold transition-colors ${
      isActive ? "text-blue-600" : "text-gray-500 hover:text-blue-600"
    }`;

  return (
    // Thêm z-50 vào Header để nó luôn nổi lên trên cùng
    <div className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6 sticky top-0 z-50">
      {/* 1. TÌM KIẾM */}
      <div className="flex items-center bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-2 w-64 lg:w-80 border border-transparent focus-within:border-blue-500/30 focus-within:bg-white dark:focus-within:bg-gray-600 transition-all">
        <Search size={18} className="text-gray-400 dark:text-gray-500" />
        <input
          type="text"
          placeholder="Tìm kiếm..."
          className="bg-transparent border-none outline-none text-sm ml-3 w-full text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500"
        />
      </div>

      {/* 2. MENU GIỮA */}
      <nav className="hidden md:flex items-center space-x-8">
        <NavLink to="/" className={navLinkClass}>
          Trang chủ
        </NavLink>
        <NavLink to="/gpa" className={navLinkClass}>
          Tính GPA
        </NavLink>
        <NavLink to="/documents" className={navLinkClass}>
          Tài liệu
        </NavLink>
        <NavLink to="/community" className={navLinkClass}>
          Cộng đồng
        </NavLink>
      </nav>

      {/* 3. KHU VỰC CÁ NHÂN */}
      <div className="flex items-center space-x-3">
        <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-all">
          <Moon size={20} />
        </button>

        <div className="h-6 w-[1px] bg-gray-200 mx-1"></div>

        {user ? (
          // ✅ CÓ USER -> HIỆN AVATAR VÀ DROPDOWN
          <div className="flex items-center gap-2 relative" ref={dropdownRef}>
            <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-all relative mr-2">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            </button>

            {/* Nút bấm Avatar */}
            <button
              onClick={() => {
                console.log("Đã bấm vào avatar!");
                setIsDropdownOpen(!isDropdownOpen);
              }}
              className="flex items-center gap-2 hover:bg-gray-50 p-1 pr-2 rounded-full transition-all border border-transparent hover:border-gray-200 select-none"
            >
              {/* 1. Ưu tiên hiển thị ảnh (nếu user có đường dẫn ảnh chứa dấu /) */}
              {user.avatar && user.avatar.includes("/") && (
                <img
                  src={user.avatar}
                  alt="Avatar"
                  className="w-9 h-9 rounded-full border border-gray-200 bg-white object-cover"
                  onError={(e) => {
                    // MAGIC: Nếu ảnh lỗi (404), ẩn ảnh đi và hiện chữ cái bên dưới lên
                    e.target.style.display = "none";
                    e.target.nextSibling.style.display = "flex";
                  }}
                />
              )}

              {/* 2. Fallback: Chữ cái đầu tên (Mặc định ẩn nếu đang có ảnh, chỉ hiện khi không có ảnh hoặc ảnh lỗi) */}
              <div
                className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 border border-blue-200 flex items-center justify-center font-bold"
                // Logic: Nếu có link ảnh thì ẩn cái này đi trước, chờ ảnh load lỗi mới hiện lại
                style={{
                  display:
                    user.avatar && user.avatar.includes("/") ? "none" : "flex",
                }}
              >
                {user.fullName ? user.fullName.charAt(0).toUpperCase() : "U"}
              </div>

              {/* Icon mũi tên */}
              <ChevronDown
                size={16}
                className={`text-gray-400 transition-transform duration-200 ${
                  isDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* 👇 MENU DROPDOWN ĐÂY 👇 */}
            {isDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 z-[100] origin-top-right transform transition-all">
                {/* Header Menu */}
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">
                    Đang đăng nhập
                  </p>
                  <p className="font-bold text-gray-800 text-base truncate">
                    {user.fullName}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    @{user.username}
                  </p>
                </div>

                {/* List Menu */}
                <ul className="py-2">
                  <li>
                    <NavLink
                      to="/profile"
                      onClick={() => setIsDropdownOpen(false)}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 flex items-center gap-3 transition-colors"
                    >
                      <User size={18} /> Hồ sơ cá nhân
                    </NavLink>
                  </li>
                  <li>
                    <button className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 flex items-center gap-3 transition-colors">
                      <Settings size={18} /> Cài đặt
                    </button>
                  </li>
                  <li>
                    <button className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 flex items-center gap-3 transition-colors">
                      <Save size={18} /> Sao lưu & Khôi phục
                    </button>
                  </li>

                  <li className="my-1 border-t border-gray-100"></li>

                  <li>
                    <button
                      onClick={() => {
                        setIsDropdownOpen(false);
                        onLogoutClick();
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors font-medium"
                    >
                      <LogOut size={18} /> Đăng xuất
                    </button>
                  </li>
                </ul>
              </div>
            )}
          </div>
        ) : (
          // KHÁCH -> HIỆN NÚT ĐĂNG NHẬP
          <button
            onClick={onLoginClick}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all"
          >
            <LogIn size={18} />
            Đăng nhập
          </button>
        )}
      </div>
    </div>
  );
};

export default Header;
