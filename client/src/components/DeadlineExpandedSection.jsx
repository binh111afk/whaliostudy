import React, { useMemo } from "react";
import {
  Bell,
  CalendarDays,
  Clock3,
  Plus,
  Tag,
  Trash2,
  CheckCircle2,
} from "lucide-react";

const formatDate = (dateInput) => {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return "--/--/----";
  return date.toLocaleDateString("vi-VN");
};

const getDaysLeft = (dateInput) => {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return Number.POSITIVE_INFINITY;
  const diffMs = date.getTime() - Date.now();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
};

const getTagLabel = (task) => {
  const value = String(task?.deadlineTag || "").trim();
  return value || "Công việc";
};

const getCardTone = (daysLeft) => {
  if (daysLeft <= 1) {
    return "border-red-200 bg-red-50/70 text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300";
  }
  if (daysLeft <= 3) {
    return "border-orange-200 bg-orange-50/70 text-orange-700 dark:border-orange-700/40 dark:bg-orange-900/20 dark:text-orange-300";
  }
  return "border-blue-200 bg-blue-50/70 text-blue-700 dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-300";
};

const DeadlineExpandedSection = ({
  deadlines = [],
  onCreateClick,
  onDelete,
  onToggle,
}) => {
  const sortedDeadlines = useMemo(() => {
    return [...deadlines].sort((a, b) => {
      if (Boolean(a.isDone) !== Boolean(b.isDone)) return a.isDone ? 1 : -1;
      return new Date(a.date) - new Date(b.date);
    });
  }, [deadlines]);

  const activeDeadlines = sortedDeadlines.filter((task) => !task.isDone);
  const urgentCount = activeDeadlines.filter(
    (task) => getDaysLeft(task.date) <= 1
  ).length;
  const notificationItems = activeDeadlines.slice(0, 3);

  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6">
      <div className="mb-5">
        <h3 className="text-2xl font-black text-gray-900 dark:text-white">
          Quản Lý Deadline
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Theo dõi và quản lý các deadline quan trọng của bạn
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 p-4 dark:border-gray-700">
          <h4 className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white">
            <Plus size={20} className="text-blue-600 dark:text-blue-400" />
            Thêm Deadline Mới
          </h4>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Tạo deadline mới, đặt tag loại deadline và theo dõi tiến độ chi tiết.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {["Công việc", "Dự án", "Học bài", "Hạn chót"].map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:border-blue-700/50 dark:bg-blue-900/20 dark:text-blue-300"
              >
                {tag}
              </span>
            ))}
          </div>

          <button
            type="button"
            onClick={onCreateClick}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700"
          >
            <Plus size={16} />
            Thêm Deadline
          </button>
        </div>

        <div className="rounded-2xl border border-gray-200 p-4 dark:border-gray-700">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white">
              <Bell size={19} className="text-blue-600 dark:text-blue-400" />
              Thông Báo Deadline
            </h4>
            <span className="rounded-full bg-rose-600 px-3 py-1 text-xs font-bold text-white">
              {urgentCount} khẩn cấp
            </span>
          </div>
          <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
            Các deadline sắp tới cần chú ý
          </p>

          <div className="space-y-3">
            {notificationItems.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-600 dark:text-gray-400">
                Không có deadline nào cần chú ý.
              </div>
            ) : (
              notificationItems.map((task) => {
                const daysLeft = getDaysLeft(task.date);
                return (
                  <div
                    key={task._id}
                    className={`flex items-start justify-between gap-3 rounded-2xl border p-4 ${getCardTone(
                      daysLeft
                    )}`}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-lg font-bold">{task.title}</p>
                        <span className="inline-flex items-center rounded-full border border-current/20 bg-white/80 px-2 py-0.5 text-xs font-semibold">
                          {getTagLabel(task)}
                        </span>
                      </div>
                      {task.description ? (
                        <p className="mt-1 line-clamp-2 text-sm opacity-90">
                          {task.description}
                        </p>
                      ) : null}
                      <p className="mt-2 flex items-center gap-1 text-sm font-semibold">
                        <Clock3 size={14} />
                        {formatDate(task.date)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-4xl font-black leading-none">
                        {Number.isFinite(daysLeft) ? Math.max(0, daysLeft) : "-"}
                      </p>
                      <p className="text-sm font-medium">ngày</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-gray-200 p-4 dark:border-gray-700">
        <h4 className="text-2xl font-bold text-gray-900 dark:text-white">
          Danh Sách Deadline
        </h4>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Tổng cộng: {sortedDeadlines.length} deadline (
          {activeDeadlines.length} đang thực hiện)
        </p>

        <div className="mt-4 space-y-3">
          {sortedDeadlines.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 p-5 text-sm text-gray-500 dark:border-gray-600 dark:text-gray-400">
              Chưa có deadline nào.
            </div>
          ) : (
            sortedDeadlines.map((task) => (
              <div
                key={task._id}
                className={`rounded-2xl border border-gray-200 p-4 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/30 ${
                  task.isDone ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <label className="flex cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        checked={task.isDone || false}
                        onChange={() => onToggle?.(task)}
                        className="h-5 w-5 rounded border-gray-300 accent-blue-600"
                      />
                      <p
                        className={`truncate text-xl font-bold text-gray-900 dark:text-white ${
                          task.isDone ? "line-through decoration-gray-400" : ""
                        }`}
                      >
                        {task.title}
                      </p>
                    </label>

                    {task.description ? (
                      <p className="mt-2 pl-8 text-base text-gray-500 dark:text-gray-400">
                        {task.description}
                      </p>
                    ) : null}

                    <div className="mt-3 flex flex-wrap items-center gap-2 pl-8">
                      <span className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300">
                        <CalendarDays size={15} />
                        {formatDate(task.date)}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200">
                        <Tag size={13} />
                        {getTagLabel(task)}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onDelete?.(task._id)}
                    className="rounded-lg p-2 text-rose-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/20"
                    aria-label="Xóa deadline"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {sortedDeadlines.length > 0 && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
            <CheckCircle2 size={16} />
            Deadline đã hoàn thành sẽ được làm mờ để dễ tập trung vào việc còn lại.
          </div>
        )}
      </div>
    </div>
  );
};

export default DeadlineExpandedSection;
