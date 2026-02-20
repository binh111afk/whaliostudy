import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
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

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", to: "/" },
  { icon: Calculator, label: "Tính điểm GPA", to: "/gpa" },
  { icon: MessageSquare, label: "AI Assistant", to: "/ai-assistant" },
  { icon: BookOpen, label: "Thư viện đề", to: "/exams" },
  { icon: Hourglass, label: "StudyTime", to: "/timer" },
  { icon: Calendar, label: "Thời khóa biểu", to: "/timetable" },
  { icon: Bell, label: "Thông báo", to: "/announcements" },
];

const Sidebar = ({ isMobile = false, onNavigate }) => {
  const location = useLocation();
  const navRef = useRef(null);
  const itemRefs = useRef({});
  const [highlight, setHighlight] = useState(null);

  const activePath = useMemo(() => {
    const clean = (p) => (p && p.length > 1 ? p.replace(/\/+$/, "") : p || "/");
    return clean(location.pathname);
  }, [location.pathname]);

  useLayoutEffect(() => {
    const navEl = navRef.current;
    const activeEl = itemRefs.current[activePath];
    if (!navEl || !activeEl) return;
    setHighlight({
      y: activeEl.offsetTop,
      height: activeEl.offsetHeight,
      width: activeEl.offsetWidth,
    });
  }, [activePath, isMobile]);

  const containerClasses = isMobile
    ? "h-full w-full border-r border-gray-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 flex flex-col"
    : "fixed left-0 top-0 h-screen w-64 border-r border-gray-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 flex flex-col";

  return (
    <div className={containerClasses}>
      <div className="mb-10 px-2">
        <WhalioBrand compact={isMobile} />
      </div>

      <nav ref={navRef} className="relative flex-1 space-y-2">
        {highlight && (
          <motion.div
            layoutId="sidebar-liquid-active"
            className="pointer-events-none absolute left-0 rounded-xl bg-primary dark:bg-blue-600"
            initial={false}
            animate={{ y: highlight.y, height: highlight.height, width: highlight.width, opacity: 1 }}
            transition={{ type: "spring", stiffness: 360, damping: 30, mass: 0.7 }}
          />
        )}
        {NAV_ITEMS.map((item) => {
          const isActive = activePath === item.to;
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className="block w-full"
            >
              <div
                ref={(el) => {
                  itemRefs.current[item.to] = el;
                }}
                className={`relative z-10 flex w-full items-center space-x-3 overflow-hidden rounded-xl p-3 transition-colors duration-200 ${
                  isActive
                    ? "text-white"
                    : "text-gray-400 hover:bg-blue-50 hover:text-primary dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-blue-400"
                }`}
              >
                <Icon size={20} />
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
