import React, { useState, useRef, useEffect } from "react";
import { NavLink } from "react-router-dom";
import {
  Search,
  Bell,
  Moon,
  Sun,
  LogIn,
  User,
  Settings,
  Save,
  LogOut,
  ChevronDown,
  LayoutGrid,
  Home,
  FileText,
  Users,
} from "lucide-react";
import BackupRestoreModal from './BackupRestoreModal';

const Header = ({
  user,
  onLoginClick,
  onLogoutClick,
  darkMode,
  onToggleDarkMode,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
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

  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === "Escape") {
        setIsLogoutConfirmOpen(false);
      }
    };

    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, []);

  const navLinkClass = ({ isActive }) =>
    `text-sm font-bold transition-colors ${
      isActive
        ? "text-blue-600 dark:text-blue-400"
        : "text-gray-500 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400"
    }`;

  return (
    // Thêm z-50 vào Header để nó luôn nổi lên trên cùng
    <div className="fixed left-64 right-0 top-0 z-50 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 dark:border-gray-700 dark:bg-gray-800">
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
          <div className="flex items-center gap-2">
            <Home size={18} />
            <span>Trang chủ</span>
          </div>
        </NavLink>

        <NavLink to="/portal" className={navLinkClass}>
          <div className="flex items-center gap-2">
            <LayoutGrid size={18} />
            <span>Tiện ích</span>
          </div>
        </NavLink>

        <NavLink to="/documents" className={navLinkClass}>
          <div className="flex items-center gap-2">
            <FileText size={18} />
            <span>Tài liệu</span>
          </div>
        </NavLink>

        <NavLink to="/community" className={navLinkClass}>
          <div className="flex items-center gap-2">
            <Users size={18} />
            <span>Cộng đồng</span>
          </div>
        </NavLink>
      </nav>

      {/* 3. KHU VỰC CÁ NHÂN */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onToggleDarkMode}
          className="p-2 text-gray-400 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-all"
          title={darkMode ? "Chế độ sáng" : "Chế độ tối"}
        >
          {darkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <div className="h-6 w-[1px] bg-gray-200 dark:bg-gray-700 mx-1"></div>

        {user ? (
          // ✅ CÓ USER -> HIỆN AVATAR VÀ DROPDOWN
          <div className="flex items-center gap-2 relative" ref={dropdownRef}>
            <button className="p-2 text-gray-400 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-all relative mr-2">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            </button>

            {/* Nút bấm Avatar */}
            <button
              onClick={() => {
                console.log("Đã bấm vào avatar!");
                setIsDropdownOpen(!isDropdownOpen);
              }}
              className="flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 p-1 pr-2 rounded-full transition-all border border-transparent hover:border-gray-200 dark:hover:border-gray-600 select-none"
            >
              {/* 1. Ưu tiên hiển thị ảnh (nếu user có đường dẫn ảnh chứa dấu /) */}
              {user.avatar && user.avatar.includes("/") && (
                <img
                  src={user.avatar}
                  alt="Avatar"
                  className="w-9 h-9 rounded-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 object-cover"
                  onError={(e) => {
                    // MAGIC: Nếu ảnh lỗi (404), ẩn ảnh đi và hiện chữ cái bên dưới lên
                    e.target.style.display = "none";
                    e.target.nextSibling.style.display = "flex";
                  }}
                />
              )}

              {/* 2. Fallback: Chữ cái đầu tên (Mặc định ẩn nếu đang có ảnh, chỉ hiện khi không có ảnh hoặc ảnh lỗi) */}
              <div
                className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700 flex items-center justify-center font-bold"
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
                className={`text-gray-400 dark:text-gray-500 transition-transform duration-200 ${
                  isDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* 👇 MENU DROPDOWN ĐÂY 👇 */}
            {isDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 py-2 z-[100] origin-top-right transform transition-all">
                {/* Header Menu */}
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/50">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider mb-1">
                    Đang đăng nhập
                  </p>
                  <p className="font-bold text-gray-800 dark:text-white text-base truncate">
                    {user.fullName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    @{user.username}
                  </p>
                </div>

                {/* List Menu */}
                <ul className="py-2">
                  <li>
                    <NavLink
                      to="/profile"
                      onClick={() => setIsDropdownOpen(false)}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-3 transition-colors"
                    >
                      <User size={18} /> Hồ sơ cá nhân
                    </NavLink>
                  </li>
                  <li>
                    <button className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-3 transition-colors">
                      <Settings size={18} /> Cài đặt
                    </button>
                  </li>
                  <li>
                    <button 
                      onClick={() => {
                        setIsDropdownOpen(false);
                        setIsBackupModalOpen(true);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-3 transition-colors"
                    >
                      <Save size={18} /> Sao lưu & Khôi phục
                    </button>
                  </li>

                  <li className="my-1 border-t border-gray-100 dark:border-gray-700"></li>

                  <li>
                    <button
                      onClick={() => {
                        setIsDropdownOpen(false);
                        setIsLogoutConfirmOpen(true);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3 transition-colors font-medium"
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

      {/* Backup & Restore Modal */}
      {user && (
        <BackupRestoreModal 
          isOpen={isBackupModalOpen} 
          onClose={() => setIsBackupModalOpen(false)} 
          user={user} 
        />
      )}

      {user && isLogoutConfirmOpen && (
        <div
          className="fixed inset-0 z-[120] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsLogoutConfirmOpen(false)}
        >
          <div
            className="w-[95vw] max-w-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 sm:p-7 self-end sm:self-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 mx-auto rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50 flex items-center justify-center text-4xl mb-4">
              🥺
            </div>

            <h3 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white text-center mb-3">
              Bạn muốn rời đi sao?
            </h3>
            <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 text-center leading-relaxed mb-6 sm:mb-7">
              Nếu đăng xuất, bạn sẽ không thể tải tài liệu hay bình luận được nữa đâu.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => setIsLogoutConfirmOpen(false)}
                className="py-3.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-bold bg-gray-50 dark:bg-gray-700/60 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Ở lại
              </button>
              <button
                onClick={() => {
                  setIsLogoutConfirmOpen(false);
                  onLogoutClick();
                }}
                className="py-3.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold shadow-lg shadow-red-500/20 transition-colors"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Header;
