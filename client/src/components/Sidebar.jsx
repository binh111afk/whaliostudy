import React, { useMemo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  Calculator,
  Calendar,
  MessageSquare,
  Settings,
  Hourglass,
  Bell,
  Code2,
} from "lucide-react";
import WhalioBrand from "./WhalioBrand";

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", to: "/" },
  { icon: Calculator, label: "Tính điểm GPA", to: "/gpa" },
  { icon: MessageSquare, label: "AI Assistant", to: "/ai-assistant" },
  { icon: BookOpen, label: "Thư viện đề", to: "/exams" },
  { icon: Hourglass, label: "StudyTime", to: "/timer" },
  { icon: Calendar, label: "Thời khóa biểu", to: "/timetable" },
  { icon: Bell, label: "Thông báo", to: "/announcements" },
  { icon: Code2, label: "Kho Code", to: "/code-vault" },
];

const Sidebar = ({ isMobile = false, onNavigate }) => {
  const location = useLocation();
  const activePath = useMemo(() => {
    const clean = (p) => (p && p.length > 1 ? p.replace(/\/+$/, "") : p || "/");
    return clean(location.pathname);
  }, [location.pathname]);

  const containerClasses = isMobile
    ? "h-full w-full border-r border-gray-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 flex flex-col"
    : "fixed left-0 top-0 h-screen w-64 border-r border-gray-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 flex flex-col";

  return (
    <div className={containerClasses}>
      <div className="mb-10 px-2">
        <WhalioBrand compact={isMobile} />
      </div>

      <nav className="relative flex-1 space-y-2">
        {NAV_ITEMS.map((item) => {
          const isActive = activePath === item.to || activePath.startsWith(`${item.to}/`);
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className="block w-full"
            >
              <div
                className={`group relative flex w-full items-center space-x-3 overflow-hidden rounded-xl p-3 transition-colors duration-200 ${
                  isActive
                    ? "text-slate-900 dark:text-white"
                    : "text-gray-400 hover:bg-blue-50/60 hover:text-primary dark:text-gray-300 dark:hover:bg-gray-800/60 dark:hover:text-blue-400"
                }`}
              >
                <span className="pointer-events-none absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full bg-blue-500 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                {isActive && (
                  <span className="absolute left-3 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full bg-blue-500/20 blur-md dark:bg-blue-400/20" />
                )}
                <Icon size={20} className="relative z-10 transition-colors duration-200 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                <span className="font-medium">{item.label}</span>
              </div>
            </NavLink>
          );
        })}
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
