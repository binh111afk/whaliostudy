import React from 'react';
import { NavLink } from 'react-router-dom'; // 1. Import cái này
import { LayoutDashboard, BookOpen, Calculator, Calendar, MessageSquare, Settings, Hourglass, Bell } from 'lucide-react';
import WhalioBrand from './WhalioBrand';

// 2. Sửa Component con: Dùng NavLink thay cho div
const SidebarItem = ({ icon: Icon, label, to, onNavigate }) => (
  <NavLink
    to={to}
    onClick={onNavigate}
    className={({ isActive }) =>
      `flex items-center space-x-3 p-3 rounded-xl cursor-pointer transition-all ${
        isActive 
          ? 'bg-primary dark:bg-blue-600 text-white shadow-md' // Style khi đang ở trang này
          : 'text-gray-400 dark:text-gray-500 hover:bg-blue-50 dark:hover:bg-gray-800 hover:text-primary dark:hover:text-blue-400' // Style khi bình thường
      }`
    }
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </NavLink>
);

const Sidebar = ({ isMobile = false, onNavigate }) => {
  const containerClasses = isMobile
    ? 'h-full w-full bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700 p-4 flex flex-col'
    : 'w-64 h-screen bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700 p-4 flex flex-col fixed left-0 top-0';

  return (
    <div className={containerClasses}> {/* Thêm fixed để Sidebar đứng im */}
      <div className="mb-10 px-2">
        <WhalioBrand compact={isMobile} />
      </div>

      <nav className="flex-1 space-y-2">
        {/* 3. Truyền đường dẫn (to) khớp với App.jsx */}
        <SidebarItem icon={LayoutDashboard} label="Dashboard" to="/" onNavigate={onNavigate} />
        <SidebarItem icon={Calculator} label="Tính điểm GPA" to="/gpa" onNavigate={onNavigate} />
        <SidebarItem icon={MessageSquare} label="AI Assistant" to="/ai-assistant" onNavigate={onNavigate} />
        
        {/* Mấy cái này chưa làm thì để tạm link # hoặc tạo trang sau */}
        <SidebarItem icon={BookOpen} label="Thư viện đề" to="/exams" onNavigate={onNavigate} />
        <SidebarItem icon={Hourglass} label="StudyTime" to="/timer" onNavigate={onNavigate} />
        <SidebarItem icon={Calendar} label="Thời khóa biểu" to="/timetable" onNavigate={onNavigate} />
        <SidebarItem icon={Bell} label="Thông báo" to="/announcements" onNavigate={onNavigate} />
      </nav>

      <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
        {/* Cài đặt thường ít khi active, cứ để tạm */}
        <div className="flex items-center space-x-3 p-3 rounded-xl cursor-pointer text-gray-400 dark:text-gray-500 hover:bg-blue-50 dark:hover:bg-gray-800 hover:text-primary dark:hover:text-blue-400 transition-all">
            <Settings size={20} />
            <span className="font-medium">Cài đặt</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
