import React, { useState, useEffect } from "react";
import AddEventModal from "../AddEventModal";
import { PERIOD_TIMES, getMonday, isClassInWeek } from "../../utils/timetableHelpers";
import { getFullApiUrl } from '../../config/apiConfig';

// --- HELPER: Lấy tên thứ hiện tại ---
const getCurrentDayString = () => {
  const days = ["CN", "2", "3", "4", "5", "6", "7"];
  return days[new Date().getDay()];
};

const getLocalDateKey = (dateInput = new Date()) => {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const isScheduleOnlyEvent = (event) => {
  const eventType = String(event?.type || "").trim().toLowerCase();
  const eventTag = String(event?.deadlineTag || "").trim().toLowerCase();
  const description = String(event?.description || "");

  if (eventTag === "lịch trình") return true;
  if (eventType === "other" && /⏰/.test(description)) return true;
  return false;
};

// --- ICONS ---
const ScheduleCalendarIcon = ({ className = "h-6 w-6" }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <rect x="3" y="4.5" width="18" height="16" rx="3" fill="#EFF6FF" stroke="#1D4ED8" strokeWidth="1.5" />
    <path d="M3 9h18" stroke="#3B82F6" strokeWidth="1.5" />
    <rect x="7" y="2.5" width="2" height="4" rx="1" fill="#2563EB" />
    <rect x="15" y="2.5" width="2" height="4" rx="1" fill="#2563EB" />
    <circle cx="8.5" cy="13" r="1" fill="#60A5FA" />
    <circle cx="12" cy="13" r="1" fill="#60A5FA" />
    <circle cx="15.5" cy="13" r="1" fill="#60A5FA" />
  </svg>
);

const ScheduleTimeIcon = ({ className = "h-4 w-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="9" fill="#EEF2FF" stroke="#4F46E5" strokeWidth="1.5" />
    <path d="M12 7.5V12l3 2" stroke="#2563EB" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="12" r="1.2" fill="#60A5FA" />
  </svg>
);

const ScheduleLocationIcon = ({ className = "h-4 w-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path
      d="M12 21c3.2-3.3 6-6.7 6-10a6 6 0 1 0-12 0c0 3.3 2.8 6.7 6 10Z"
      fill="#DBEAFE"
      stroke="#2563EB"
      strokeWidth="1.5"
    />
    <circle cx="12" cy="11" r="2.3" fill="#60A5FA" stroke="#1D4ED8" strokeWidth="1.2" />
  </svg>
);

const formatScheduleRemaining = (minsLeft) => {
  const total = Math.max(0, Math.ceil(minsLeft));
  const hours = Math.floor(total / 60);
  const mins = total % 60;

  if (hours <= 0) return `Còn ${mins} phút`;
  if (mins === 0) return `Còn ${hours} giờ`;
  return `Còn ${hours} giờ ${mins} phút`;
};

const parseTimeToParts = (timeText) => {
  const raw = String(timeText || "").trim();
  const match = raw.match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return { hours, minutes };
};

// --- COMPONENT: TAB LỊCH TRÌNH HÔM NAY ---
const DashboardScheduleTab = ({ user }) => {
  const [schedule, setSchedule] = useState([]);
  const [now, setNow] = useState(new Date());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Cập nhật đồng hồ mỗi phút để tính countdown lại
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const [tkbRes, eventRes] = await Promise.all([
        fetch(getFullApiUrl(`/api/timetable?username=${user.username}`)),
        fetch(getFullApiUrl(`/api/events?username=${user.username}`)),
      ]);

      const tkbData = await tkbRes.json();
      const eventData = await eventRes.json();
      const todayStr = getCurrentDayString();
      const todayDateStr = getLocalDateKey(new Date());
      const currentWeekStart = getMonday(new Date());

      let items = [];

      // Xử lý TKB (Lọc theo thứ hôm nay)
      if (tkbData.success) {
        tkbData.timetable.forEach((cls) => {
          if (String(cls.day) === todayStr && isClassInWeek(cls, currentWeekStart)) {
            const startPeriod = Number(cls.startPeriod) || 1;
            const numPeriods = Number(cls.numPeriods) || 1;
            const endPeriod = startPeriod + numPeriods - 1;

            const periodStart = PERIOD_TIMES[startPeriod]?.start;
            const periodEnd = PERIOD_TIMES[endPeriod]?.end;

            let startParts = parseTimeToParts(periodStart);
            let endParts = parseTimeToParts(periodEnd);

            if ((!startParts || !endParts) && cls.timeRange) {
              const [rawStart, rawEnd] = String(cls.timeRange).split("-");
              startParts = startParts || parseTimeToParts(rawStart);
              endParts = endParts || parseTimeToParts(rawEnd);
            }

            const startDate = new Date();
            const endTime = new Date();

            if (startParts) {
              startDate.setHours(startParts.hours, startParts.minutes, 0, 0);
            } else {
              startDate.setHours(0, 0, 0, 0);
            }

            if (endParts) {
              endTime.setHours(endParts.hours, endParts.minutes, 0, 0);
            } else {
              endTime.setTime(startDate.getTime() + numPeriods * 50 * 60000);
            }

            if (endTime <= startDate) {
              endTime.setTime(startDate.getTime() + numPeriods * 50 * 60000);
            }

            items.push({
              type: "class",
              id: cls._id,
              title: cls.subject,
              room: cls.room || "",
              location: cls.campus || "",
              startTime: startDate,
              endTime: endTime,
              note: `Tiết ${startPeriod} - ${endPeriod}`,
            });
          }
        });
      }

      // Xử lý Sự kiện thủ công (Lọc theo ngày hôm nay)
      if (eventData.success) {
        eventData.events.forEach((ev) => {
          if (!isScheduleOnlyEvent(ev)) return;
          const evDate = new Date(ev.date);
          if (getLocalDateKey(evDate) === todayDateStr) {
            const roomMatch = ev.description?.match(/🚪\s*(.+?)(?:\n|$)/);
            const locationMatch = ev.description?.match(/📍\s*(.+?)(?:\n|$)/);
            const timeMatch = ev.description?.match(/⏰\s*(.+?)(?:\n|$)/);
            
            let endTime = new Date(evDate.getTime() + 60 * 60000);
            if (timeMatch && timeMatch[1].includes('-')) {
              const endTimeStr = timeMatch[1].split('-')[1]?.trim();
              if (endTimeStr) {
                const [h, m] = endTimeStr.split(':').map(Number);
                if (!isNaN(h) && !isNaN(m)) {
                  endTime = new Date(evDate);
                  endTime.setHours(h, m, 0, 0);
                }
              }
            }
            
            items.push({
              type: "event",
              id: ev._id,
              title: ev.title,
              room: roomMatch ? roomMatch[1].trim() : "",
              location: locationMatch ? locationMatch[1].trim() : (ev.deadlineTag || "Sự kiện cá nhân"),
              startTime: evDate,
              endTime: endTime,
              note: ev.deadlineTag || (ev.type === "deadline" ? "Deadline" : "Cá nhân"),
            });
          }
        });
      }

      // Sắp xếp theo mức độ ưu tiên
      items.sort((a, b) => {
        const nowTime = Date.now();
        
        const aIsOngoing = nowTime >= a.startTime && nowTime <= a.endTime;
        const aIsFinished = nowTime > a.endTime;
        const aIsUrgent = !aIsOngoing && !aIsFinished && 
          (a.startTime.getTime() - nowTime) <= 15 * 60 * 1000;
        
        const bIsOngoing = nowTime >= b.startTime && nowTime <= b.endTime;
        const bIsFinished = nowTime > b.endTime;
        const bIsUrgent = !bIsOngoing && !bIsFinished && 
          (b.startTime.getTime() - nowTime) <= 15 * 60 * 1000;
        
        const getPriority = (isUrgent, isOngoing, isFinished) => {
          if (isUrgent) return 1;
          if (isOngoing) return 2;
          if (isFinished) return 4;
          return 3;
        };
        
        const aPriority = getPriority(aIsUrgent, aIsOngoing, aIsFinished);
        const bPriority = getPriority(bIsUrgent, bIsOngoing, bIsFinished);
        
        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }
        return a.startTime - b.startTime;
      });
      setSchedule(items);
    } catch (e) {
      console.error("Lỗi tải lịch trình:", e);
    }
  };

  // Hàm render thẻ lịch trình
  const renderItem = (item) => {
    const isOngoing = now >= item.startTime && now <= item.endTime;
    const isFinished = now > item.endTime;
    const isUpcoming = now < item.startTime;

    const remainingToEndMins = Math.max(
      0,
      Math.ceil((item.endTime.getTime() - now.getTime()) / 60000)
    );
    const remainingToStartMins = Math.max(
      0,
      Math.ceil((item.startTime.getTime() - now.getTime()) / 60000)
    );
    
    const isUrgent = isUpcoming && remainingToStartMins <= 15;

    const totalDuration = item.endTime.getTime() - item.startTime.getTime();
    const elapsed = now.getTime() - item.startTime.getTime();
    const progressPercent = isOngoing ? Math.min(100, Math.max(0, (elapsed / totalDuration) * 100)) : 0;

    const isOnline = item.room?.toLowerCase().includes('online') || 
                     item.room?.toLowerCase().includes('trực tuyến') ||
                     item.room?.toLowerCase().includes('zoom') ||
                     item.room?.toLowerCase().includes('meet') ||
                     item.location?.toLowerCase().includes('online') || 
                     item.location?.toLowerCase().includes('trực tuyến') ||
                     item.location?.toLowerCase().includes('zoom') ||
                     item.location?.toLowerCase().includes('meet');

    const LocationBadge = () => {
      return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
          isOnline 
            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
        }`}>
          {isOnline ? (
            <>
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm3.293 1.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L7.586 10 5.293 7.707a1 1 0 010-1.414zM11 12a1 1 0 100 2h3a1 1 0 100-2h-3z" />
              </svg>
              Trực tuyến
            </>
          ) : (
            <>
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              Tại phòng
            </>
          )}
        </span>
      );
    };

    const StatusBadge = () => {
      if (isFinished) {
        return (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
            Đã kết thúc
          </span>
        );
      }
      
      if (isUrgent) {
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 dark:text-red-400">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
            🚨 KHẨN CẤP
          </span>
        );
      }
      
      if (isOngoing) {
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 dark:text-green-400">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
            Đang diễn ra
          </span>
        );
      }

      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
          Sắp tới
        </span>
      );
    };

    return (
      <div
        key={item.id}
        className={`mb-4 rounded-xl border transition-all duration-200 ${
          isUrgent
            ? 'bg-red-50/80 dark:bg-red-950/20 border-red-300 dark:border-red-800 shadow-lg shadow-red-200/50 dark:shadow-red-900/30 ring-2 ring-red-200 dark:ring-red-800'
            : isOngoing 
            ? 'bg-green-50/60 dark:bg-green-950/20 border-green-200 dark:border-green-800 shadow-md shadow-green-100/50 dark:shadow-green-900/20' 
            : isFinished
            ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-85'
            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-700'
        }`}
        style={{ opacity: isFinished ? 0.85 : 1 }}
      >
        <div className="p-4 sm:p-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <h4 className={`text-lg sm:text-xl font-bold leading-tight mb-2 ${
                isFinished 
                  ? 'text-gray-600 dark:text-gray-400 line-through' 
                  : isUrgent
                  ? 'text-red-700 dark:text-red-400'
                  : isOngoing
                  ? 'text-green-700 dark:text-green-300'
                  : 'text-gray-900 dark:text-white'
              }`}>
                {item.title}
              </h4>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge />
                <LocationBadge />
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="space-y-2 mb-3">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <ScheduleTimeIcon className="h-4 w-4 shrink-0 text-gray-400" />
              <span>
                {item.startTime.toLocaleTimeString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {" – "}
                {item.endTime.toLocaleTimeString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>

            {item.room && (
              <div className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300">
                <svg className="h-4 w-4 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                </svg>
                <span>{item.room}</span>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <ScheduleLocationIcon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.location}</span>
            </div>
          </div>

          {/* Footer */}
          {isUrgent && (
            <div className="mt-4 pt-4 border-t border-red-200 dark:border-red-800">
              <div className="bg-red-100 dark:bg-red-900/30 rounded-lg p-3">
                <p className="text-sm font-bold text-red-700 dark:text-red-300 flex items-center gap-2">
                  <span className="text-lg animate-pulse">⚠️</span>
                  <span>SẮP BẮT ĐẦU SAU {formatScheduleRemaining(remainingToStartMins).replace('Còn ', '')}</span>
                </p>
              </div>
            </div>
          )}
          
          {isOngoing && (
            <div className="mt-4 pt-4 border-t border-green-200 dark:border-green-700">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-semibold text-green-700 dark:text-green-300">
                  {formatScheduleRemaining(remainingToEndMins)}
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  {Math.round(progressPercent)}%
                </span>
              </div>
              <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-300 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {isUpcoming && !isUrgent && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                📅 Bắt đầu sau {formatScheduleRemaining(remainingToStartMins).replace('Còn ', '')}
              </p>
            </div>
          )}

          {isFinished && item.note && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-400 dark:text-gray-500 italic">
                {item.note}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="animate-fade-in-up overflow-x-hidden">
      {/* Header Section */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 p-5 rounded-2xl border border-blue-100 dark:border-blue-900">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <ScheduleCalendarIcon className="h-7 w-7" />
            <h3 className="font-bold text-gray-900 dark:text-white text-xl sm:text-2xl">
              Lịch trình hôm nay
            </h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
            {now.toLocaleDateString("vi-VN", { 
              weekday: "long", 
              day: "numeric", 
              month: "long", 
              year: "numeric" 
            })}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Cập nhật tự động mỗi phút
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-blue-200/50 dark:shadow-blue-900/30 flex items-center justify-center gap-2 transition-all hover:scale-105"
        >
          <span className="text-lg">+</span>
          Thêm lịch
        </button>
      </div>

      {/* Schedule List */}
      {schedule.length > 0 ? (
        <div className="space-y-3">
          {schedule.map((item) => renderItem(item))}
        </div>
      ) : (
        <div className="text-center py-20 bg-gradient-to-br from-gray-50 to-blue-50/30 dark:from-gray-800 dark:to-blue-950/10 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700">
          <div className="text-6xl mb-4">🎉</div>
          <p className="text-gray-600 dark:text-gray-400 font-semibold text-lg mb-1">
            Hôm nay bạn rảnh rỗi!
          </p>
          <p className="text-gray-500 dark:text-gray-500 text-sm">
            Không có lịch trình nào được ghi nhận
          </p>
        </div>
      )}

      {/* Modal thêm sự kiện thủ công */}
      <AddEventModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          setIsAddModalOpen(false);
          fetchData();
        }}
        username={user?.username}
        defaultDate={new Date().toISOString().split("T")[0]}
      />
    </div>
  );
};

export default DashboardScheduleTab;
