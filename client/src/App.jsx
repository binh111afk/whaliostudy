import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Menu, X, Home, Hourglass, CalendarDays, LayoutGrid, Moon, Sun } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Header from './components/Header'; 
import AuthModal from './components/AuthModal'; // Import Modal

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

const MOBILE_NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: Home },
  { to: '/timer', label: 'StudyTime', icon: Hourglass },
  { to: '/timetable', label: 'Lịch', icon: CalendarDays },
  { to: '/portal', label: 'Tiện ích', icon: LayoutGrid },
];

const MobileBottomNav = () => (
  <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 px-2 py-2 backdrop-blur-lg dark:border-gray-700 dark:bg-gray-900/95 lg:hidden">
    <div className="mx-auto grid max-w-xl grid-cols-4 gap-1">
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
    </div>
  </nav>
);

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
      <div className="flex min-h-screen w-full max-w-full overflow-x-hidden bg-gray-50 dark:bg-gray-900">
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

        <div className="flex min-h-screen min-w-0 flex-1 flex-col lg:ml-64">
          <div className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-gray-200 bg-white/95 px-3 backdrop-blur-md dark:border-gray-700 dark:bg-gray-900/95 lg:hidden">
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
          <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-4 md:p-5 lg:p-6 pb-24 lg:pb-6 scroll-smooth">
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
            </Routes>
          </main>

          <MobileBottomNav />
        </div>

        {/* MODAL: Đặt ở đây để nó phủ lên toàn bộ ứng dụng khi mở */}
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
    </Router>
  );
}

export default App;
