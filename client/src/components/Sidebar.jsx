import React from 'react';
import { NavLink } from 'react-router-dom'; // 1. Import cái này
import { LayoutDashboard, BookOpen, Calculator, Calendar, MessageSquare, Settings, Hourglass } from 'lucide-react';

// 2. Sửa Component con: Dùng NavLink thay cho div
const SidebarItem = ({ icon: Icon, label, to }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex items-center space-x-3 p-3 rounded-xl cursor-pointer transition-all ${
        isActive 
          ? 'bg-primary text-white shadow-md' // Style khi đang ở trang này
          : 'text-gray-400 hover:bg-blue-50 hover:text-primary' // Style khi bình thường
      }`
    }
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </NavLink>
);

const Sidebar = () => {
  return (
    <div className="w-64 h-screen bg-white border-r border-gray-100 p-4 flex flex-col fixed left-0 top-0"> {/* Thêm fixed để Sidebar đứng im */}
      <div className="flex items-center space-x-2 px-2 mb-10">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold">W</div>
        <span className="text-xl font-bold text-gray-800 tracking-tight">Whalio <span className="text-primary">2.0</span></span>
      </div>

      <nav className="flex-1 space-y-2">
        {/* 3. Truyền đường dẫn (to) khớp với App.jsx */}
        <SidebarItem icon={LayoutDashboard} label="Dashboard" to="/" />
        <SidebarItem icon={Calculator} label="Tính điểm GPA" to="/gpa" />
        <SidebarItem icon={MessageSquare} label="AI Assistant" to="/ai-assistant" />
        
        {/* Mấy cái này chưa làm thì để tạm link # hoặc tạo trang sau */}
        <SidebarItem icon={BookOpen} label="Thư viện đề" to="/exams" />
        <SidebarItem icon={Hourglass} label="StudyTime" to="/timer" />
        <SidebarItem icon={Calendar} label="Thời khóa biểu" to="/timetable" />
      </nav>

      <div className="pt-4 border-t border-gray-100">
        {/* Cài đặt thường ít khi active, cứ để tạm */}
        <div className="flex items-center space-x-3 p-3 rounded-xl cursor-pointer text-gray-400 hover:bg-blue-50 hover:text-primary transition-all">
            <Settings size={20} />
            <span className="font-medium">Cài đặt</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;