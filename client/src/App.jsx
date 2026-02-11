import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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

  return (
    <Router>
      <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar />

        <div className="flex-1 ml-64 flex flex-col h-screen">
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

          {/* Main content */}
          <main className="flex-1 overflow-y-auto p-6 scroll-smooth">
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
            </Routes>
          </main>
        </div>

        {/* MODAL: Đặt ở đây để nó phủ lên toàn bộ ứng dụng khi mở */}
        <AuthModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onLoginSuccess={(userData) => setUser(userData)} 
        />
      </div>
    </Router>
  );
}

export default App;