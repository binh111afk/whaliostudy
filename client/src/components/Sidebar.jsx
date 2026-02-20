import React from "react";
import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  BookOpen,
  Calculator,
  Calendar,
  MessageSquare,
  Settings,
  Hourglass,
  Bell,
} from "lucide-react";
import WhalioBrand from "./WhalioBrand";

const SidebarItem = ({ icon: Icon, label, to, onNavigate }) => (
  <NavLink to={to} onClick={onNavigate} className="block">
    {({ isActive }) => (
      <div
        className={`relative flex items-center space-x-3 overflow-hidden rounded-xl p-3 transition-all ${
          isActive
            ? "text-white shadow-md"
            : "text-gray-400 hover:bg-blue-50 hover:text-primary dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-blue-400"
        }`}
      >
        {isActive && (
          <motion.span
            layoutId="sidebar-liquid-active"
            className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500"
            transition={{ type: "spring", stiffness: 360, damping: 30, mass: 0.7 }}
          />
        )}
        <span className="relative z-10">
          <Icon size={20} />
        </span>
        <span className="relative z-10 font-medium">{label}</span>
      </div>
    )}
  </NavLink>
);

const Sidebar = ({ isMobile = false, onNavigate }) => {
  const containerClasses = isMobile
    ? "h-full w-full border-r border-gray-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 flex flex-col"
    : "fixed left-0 top-0 h-screen w-64 border-r border-gray-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 flex flex-col";

  return (
    <div className={containerClasses}>
      <div className="mb-10 px-2">
        <WhalioBrand compact={isMobile} />
      </div>

      <nav className="flex-1 space-y-2">
        <SidebarItem icon={LayoutDashboard} label="Dashboard" to="/" onNavigate={onNavigate} />
        <SidebarItem icon={Calculator} label="Tính điểm GPA" to="/gpa" onNavigate={onNavigate} />
        <SidebarItem icon={MessageSquare} label="AI Assistant" to="/ai-assistant" onNavigate={onNavigate} />
        <SidebarItem icon={BookOpen} label="Thư viện đề" to="/exams" onNavigate={onNavigate} />
        <SidebarItem icon={Hourglass} label="StudyTime" to="/timer" onNavigate={onNavigate} />
        <SidebarItem icon={Calendar} label="Thời khóa biểu" to="/timetable" onNavigate={onNavigate} />
        <SidebarItem icon={Bell} label="Thông báo" to="/announcements" onNavigate={onNavigate} />
      </nav>

      <div className="border-t border-gray-100 pt-4 dark:border-gray-700">
        <div className="flex items-center space-x-3 p-3 rounded-xl cursor-pointer text-gray-400 dark:text-gray-500 hover:bg-blue-50 dark:hover:bg-gray-800 hover:text-primary dark:hover:text-blue-400 transition-all">
          <Settings size={20} />
          <span className="font-medium">Cài đặt</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
