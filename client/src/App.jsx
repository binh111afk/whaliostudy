import React, { useEffect, useRef, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Menu, X, Home, FileText, Users, LayoutGrid, Moon, Sun, Settings, LogOut, Save } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Header from './components/Header'; 
import AuthModal from './components/AuthModal'; // Import Modal
import BackupRestoreModal from './components/BackupRestoreModal';
import { MusicProvider } from './context/MusicContext';
import FloatingPlayer from './components/FloatingPlayer';

// Import các trang
import GpaCalc from './pages/GpaCalc';
import AiChat from './pages/AiChat';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Community from './pages/Community';
import StudyTimer from './pages/StudyTimer';
import Timetable from './pages/Timetable';
import Documents from './pages/Documents';
import Exams from './pages/Exams';
import DocumentViewer from './pages/DocumentViewer';
import Portal from './pages/Portal';
import Announcements from './pages/Announcements';

const MOBILE_NAV_ITEMS = [
  { to: '/', label: 'Trang chủ', icon: Home },
  { to: '/portal', label: 'Tiện ích', icon: LayoutGrid },
  { to: '/documents', label: 'Tài liệu', icon: FileText },
  { to: '/community', label: 'Cộng đồng', icon: Users },
];

const MobileBottomNav = ({ user, onLoginClick, onLogoutClick }) => {
  const navigate = useNavigate();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const profileMenuRef = useRef(null);

  useEffect(() => {
    const onClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', onClickOutside);
    return () => document.removeEventListener('pointerdown', onClickOutside);
  }, []);

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 px-2 py-2 backdrop-blur-lg dark:border-gray-700 dark:bg-gray-900/95 lg:hidden">
        <div className="mx-auto grid max-w-xl grid-cols-5 gap-1">
          {MOBILE_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center gap-1 rounded-xl py-2 text-[11px] font-semibold transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300'
                      : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                  }`
                }
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}

          <div ref={profileMenuRef} className="relative flex items-center justify-center">
            <button
              onClick={() => setIsProfileMenuOpen((prev) => !prev)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-transparent bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              aria-label="Mở menu người dùng"
            >
              {user?.avatar && user.avatar.includes('/') ? (
                <img
                  src={user.avatar}
                  alt="Avatar"
                  className="h-9 w-9 rounded-full border border-gray-200 object-cover dark:border-gray-600"
                />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
                  {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                </span>
              )}
            </button>

            {isProfileMenuOpen && (
              <div className="absolute bottom-12 right-0 w-56 rounded-2xl border border-gray-200 bg-white p-2 shadow-2xl dark:border-gray-700 dark:bg-gray-800">
                <button
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    navigate('/profile');
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  <Settings size={16} />
                  Cài đặt
                </button>

                {user ? (
                  <>
                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        setIsBackupModalOpen(true);
                      }}
                      className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                    >
                      <Save size={16} />
                      Sao lưu & Khôi phục
                    </button>

                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        onLogoutClick();
                      }}
                      className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      <LogOut size={16} />
                      Đăng xuất
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      onLoginClick();
                    }}
                    className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                  >
                    Đăng nhập
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>

      {user && (
        <BackupRestoreModal
          isOpen={isBackupModalOpen}
          onClose={() => setIsBackupModalOpen(false)}
          user={user}
        />
      )}
    </>
  );
};

function App() {
  // 1. Khai báo State quản lý User và Modal
  const [user, setUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 2. Dark Mode State (Mặc định Light Mode)
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark'; // Chỉ true nếu đã lưu là 'dark'
  });

  // 3. Áp dụng Dark Mode vào HTML
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // 4. Giữ đăng nhập khi F5 (Load lại trang)
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  // 3. Hàm xử lý Đăng xuất
  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    // Có thể thêm reload nếu muốn reset sạch mọi thứ
    // window.location.reload(); 
  };

  const handleUpdateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <Router>
      <MusicProvider>
      <div className="flex h-screen w-full max-w-full overflow-hidden bg-gray-50 dark:bg-gray-900">
        <div className="hidden lg:block">
          <Sidebar />
        </div>

        {isMobileSidebarOpen && (
          <div className="fixed inset-0 z-[90] flex lg:hidden">
            <div
              className="flex-1 bg-black/45 backdrop-blur-[1px]"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
            <div className="relative h-full w-[86vw] max-w-xs">
              <button
                onClick={() => setIsMobileSidebarOpen(false)}
                className="absolute right-3 top-3 z-10 rounded-lg border border-gray-200 bg-white/90 p-1.5 text-gray-600 shadow-sm dark:border-gray-700 dark:bg-gray-900/90 dark:text-gray-300"
                aria-label="Đóng menu"
              >
                <X size={16} />
              </button>
              <Sidebar
                isMobile
                onNavigate={() => setIsMobileSidebarOpen(false)}
              />
            </div>
          </div>
        )}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:ml-64">
          <div className="fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between border-b border-gray-200 bg-white/95 px-3 backdrop-blur-md dark:border-gray-700 dark:bg-gray-900/95 lg:hidden">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              aria-label="Mở menu"
            >
              <Menu size={20} />
            </button>
            <div className="text-sm font-extrabold tracking-tight text-gray-800 dark:text-white">
              Whalio 2.0
            </div>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              aria-label="Đổi giao diện"
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>

          <div className="hidden lg:block">
          {/* HEADER: Truyền props xuống để Header biết:
             - user: Có ai đang đăng nhập không?
             - onLoginClick: Khi bấm nút "Đăng nhập" thì làm gì? (Mở modal)
             - onLogoutClick: Khi bấm nút "Thoát" thì làm gì? (Logout)
          */}
          <Header 
            user={user} 
            onLoginClick={() => setIsModalOpen(true)} 
            onLogoutClick={handleLogout}
            darkMode={darkMode}
            onToggleDarkMode={() => setDarkMode(!darkMode)}
          /> 
          </div>

          {/* Main content */}
          <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-3 pb-24 pt-16 scroll-smooth sm:p-4 sm:pt-16 md:p-5 md:pt-16 lg:p-6 lg:pb-6 lg:pt-20">
            <Routes>
            <Route path="/" element={<Dashboard user={user} darkMode={darkMode} setDarkMode={setDarkMode} />} />
              <Route path="/gpa" element={<GpaCalc />} />
              <Route path="/ai-assistant" element={<AiChat />} />
              <Route path="/profile" element={
                <Profile user={user} onUpdateUser={handleUpdateUser} />
              } />
              <Route path="/community" element={<Community />} />
              <Route path="/timer" element={<StudyTimer />} />
              <Route path="/timetable" element={<Timetable />} />
              <Route path="/documents" element={<Documents />} />
              <Route path="/exams" element={<Exams />} />
              <Route path="/documents/:id" element={<DocumentViewer />} />
              <Route path="/portal" element={<Portal user={user} />} />
              <Route path="/announcements" element={<Announcements user={user} />} />
            </Routes>
          </main>

          <MobileBottomNav
            user={user}
            onLoginClick={() => setIsModalOpen(true)}
            onLogoutClick={handleLogout}
          />
        </div>

        {/* Floating Music Player - controlled by MusicContext */}
        <FloatingPlayer />

        <AuthModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onLoginSuccess={(userData) => setUser(userData)} 
        />
        
        {/* Toaster cho notifications */}
        <Toaster 
          richColors 
          closeButton 
          position="top-right" 
          duration={3000}
          theme={darkMode ? 'dark' : 'light'}
        />
      </div>
      </MusicProvider>
    </Router>
  );
}

export default App;
