import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  BookOpen,
  Clock,
  GraduationCap,
  Pencil,
  TrendingUp,
  ArrowDown,
  Trash2,
  Target,
  CheckCircle,
  AlertCircle,
  ArrowUpRight,
  Check,
  ChevronDown,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from "recharts";

// --- HELPER FUNCTIONS ---
const isMobileViewport = () =>
  typeof window !== "undefined" && window.innerWidth < 640;

const getConfirmToastOptions = () => ({
  position: isMobileViewport() ? "bottom-center" : "top-center",
  duration: Infinity,
});

const getDeadlineDateLine = (dateString) => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "--/-- • --:--";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const time = date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return `${day}-${month}-${year} • ${time}`;
};

const getDeadlineTagLabel = (task) => {
  const raw = String(task?.deadlineTag || "").trim();
  return raw || "Công việc";
};

const getDeadlineMeta = (task) => {
  const deadlineDate = new Date(task?.date);

  if (Number.isNaN(deadlineDate.getTime())) {
    return {
      urgency: "normal",
      hoursLeft: Infinity,
      isOverdue: false,
      timeLeftLabel: "Chưa có thời hạn",
      dateLine: "--/-- • --:--",
      showWarning: false,
    };
  }

  const now = Date.now();
  const diffMs = deadlineDate.getTime() - now;
  const hoursLeft = diffMs / (1000 * 60 * 60);
  const isDone = Boolean(task?.isDone);
  const isOverdue = !isDone && diffMs < 0;

  let timeLeftLabel = "Còn nhiều ngày";
  if (isDone) {
    timeLeftLabel = "Đã hoàn thành";
  } else if (isOverdue) {
    timeLeftLabel = "Đã quá hạn";
  } else if (hoursLeft <= 24) {
    timeLeftLabel = `Còn ${Math.max(1, Math.ceil(hoursLeft))} giờ`;
  } else {
    const today = new Date();
    const startOfToday = Date.UTC(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const startOfDeadline = Date.UTC(
      deadlineDate.getFullYear(),
      deadlineDate.getMonth(),
      deadlineDate.getDate()
    );
    const daysLeft = Math.max(
      1,
      Math.round((startOfDeadline - startOfToday) / (1000 * 60 * 60 * 24))
    );
    timeLeftLabel = `Còn ${daysLeft} ngày`;
  }

  let urgency = "normal";
  if (!isDone) {
    if (isOverdue || hoursLeft <= 24) urgency = "critical";
    else if (hoursLeft <= 72) urgency = "soon";
  }

  return {
    urgency,
    hoursLeft,
    isOverdue,
    timeLeftLabel,
    dateLine: getDeadlineDateLine(task?.date),
    showWarning: !isDone && hoursLeft <= 48 && hoursLeft >= 0,
  };
};

const formatStudyDuration = (totalMinutes) => {
  const safeMinutes = Math.max(0, Math.round(Number(totalMinutes) || 0));
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;

  if (hours === 0) return `${mins} phút`;
  if (mins === 0) return `${hours} giờ`;
  return `${hours} giờ ${mins} phút`;
};

// --- COMPONENT: TAB TỔNG QUAN ---
const DashboardOverviewTab = ({
  darkMode = false,
  // GPA Data
  gpaMetrics,
  targetCredits,
  isIncrease,
  // Study Data
  chartData,
  totalStudyMinutes,
  // Deadlines
  deadlines,
  togglingTasks,
  // Handlers
  onToggleDeadline,
  onEditDeadline,
  onDeleteDeadline,
  // Modal triggers
  onOpenTargetModal,
  onOpenDeadlineExpanded,
}) => {
  const [chartMode, setChartMode] = useState("credit");
  const [showAllDeadlinesMobile, setShowAllDeadlinesMobile] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const isDarkMode = Boolean(darkMode);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => setIsLoaded(true));
    return () => window.cancelAnimationFrame(frameId);
  }, []);

  // Computed values
  const prioritizedDeadlines = useMemo(() => {
    return [...deadlines].sort((a, b) => {
      if (Boolean(a.isDone) !== Boolean(b.isDone)) return a.isDone ? 1 : -1;
      return new Date(a.date) - new Date(b.date);
    });
  }, [deadlines]);

  const pendingDeadlineCount = useMemo(
    () => prioritizedDeadlines.filter((task) => !task.isDone).length,
    [prioritizedDeadlines]
  );

  const completedTasksCount = useMemo(
    () => deadlines.filter((task) => Boolean(task.isDone)).length,
    [deadlines]
  );

  const dashboardDeadlines = prioritizedDeadlines.slice(0, 3);
  const primaryDeadline = dashboardDeadlines[0] || null;
  const secondaryDeadlines = primaryDeadline ? dashboardDeadlines.slice(1) : [];
  const primaryDeadlineMeta = primaryDeadline ? getDeadlineMeta(primaryDeadline) : null;

  const mobileSecondaryDeadlines = showAllDeadlinesMobile
    ? secondaryDeadlines
    : secondaryDeadlines.slice(0, 2);

  const safeTargetCredits = Math.max(1, Math.round(Number(targetCredits) || 0));
  const completedCredits = Math.max(0, Number(gpaMetrics.totalCredits) || 0);
  const boundedCompletedCredits = Math.min(completedCredits, safeTargetCredits);
  const creditPercent = Math.min(
    100,
    Math.round((completedCredits / safeTargetCredits) * 100)
  );
  const remainingCredits = Math.max(0, safeTargetCredits - completedCredits);

  const handleDeleteDeadline = (id) => {
    toast.custom(
      (t) => (
        <div className="w-[calc(100vw-1rem)] sm:w-full sm:max-w-[360px] bg-white dark:bg-gray-800 p-4 sm:p-5 rounded-t-2xl sm:rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 flex flex-col items-center text-center animate-in fade-in zoom-in duration-300">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Xác nhận xóa?
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4 leading-relaxed">
            Công việc này sẽ bị xóa vĩnh viễn khỏi lịch.
          </p>

          <div className="flex w-full flex-col-reverse sm:flex-row gap-2 sm:gap-3">
            <button
              onClick={() => toast.dismiss(t)}
              className="w-full flex-1 py-3 sm:py-2 px-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-semibold rounded-lg transition-colors"
            >
              Hủy
            </button>

            <button
              onClick={() => {
                toast.dismiss(t);
                onDeleteDeadline(id);
              }}
              className="w-full flex-1 py-3 sm:py-2 px-3 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg shadow-sm transition-all"
            >
              Xóa
            </button>
          </div>
        </div>
      ),
      getConfirmToastOptions()
    );
  };

  return (
    <div className="space-y-6">
      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 min-[1025px]:grid-cols-4 gap-3 sm:gap-4">
        {/* CARD 1: GPA */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4 relative overflow-hidden">
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center font-bold z-10">
            {gpaMetrics.current}
          </div>
          <div className="z-10">
            <p className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase">
              GPA kỳ gần nhất
            </p>
            <div
              className={`flex items-center text-sm font-bold ${
                isIncrease
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-500 dark:text-red-400"
              }`}
            >
              {isIncrease ? (
                <TrendingUp size={14} className="mr-1" />
              ) : (
                <ArrowDown size={14} className="mr-1" />
              )}
              {isIncrease ? "Tăng" : "Giảm"} {Math.abs(gpaMetrics.diff)}
            </div>
          </div>
          <div
            className={`absolute right-0 bottom-0 w-16 h-16 rounded-tl-full opacity-10 ${
              isIncrease ? "bg-green-500" : "bg-red-500"
            }`}
          ></div>
        </div>

        {/* CARD 2: Tín chỉ */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center font-bold">
            {gpaMetrics.totalCredits}
          </div>
          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase">
              Tín chỉ
            </p>
            <p className="text-gray-700 dark:text-gray-200 font-bold">
              Đã hoàn thành
            </p>
          </div>
        </div>

        {/* CARD 3: Nhiệm vụ đã hoàn thành */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center font-bold">
            {completedTasksCount}
          </div>
          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase">
              Nhiệm vụ
            </p>
            <p className="text-gray-700 dark:text-gray-200 font-bold">
              Đã hoàn thành
            </p>
          </div>
        </div>

        {/* CARD 4: Giờ học */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full flex items-center justify-center font-bold">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase">
              Tổng giờ học
            </p>
            <p className="text-gray-700 dark:text-gray-200 font-bold">
              {formatStudyDuration(totalStudyMinutes)}
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Chart & Schedule */}
      <div className="grid grid-cols-1 min-[1025px]:grid-cols-3 gap-6">
        {/* CỘT TRÁI: BIỂU ĐỒ ĐA NĂNG */}
        <div className="min-[1025px]:col-span-2 bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-6">
            <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
              {chartMode === "credit" ? (
                <GraduationCap className="text-green-600" size={20} />
              ) : (
                <Clock className="text-blue-600" size={20} />
              )}
              {chartMode === "credit"
                ? "Tiến độ tốt nghiệp"
                : "Hoạt động học tập"}
            </h3>

            {/* NÚT CHUYỂN ĐỔI CHART */}
            <div className="w-full sm:w-auto max-w-[280px] bg-gray-100 dark:bg-gray-700 p-1 rounded-lg grid grid-cols-2 text-xs font-bold">
              <button
                onClick={() => setChartMode("credit")}
                className={`px-3 py-2 rounded-md text-center transition-all ${
                  chartMode === "credit"
                    ? "bg-white dark:bg-gray-600 text-green-600 dark:text-green-400 shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
              >
                Tiến độ
              </button>
              <button
                onClick={() => setChartMode("study")}
                className={`px-3 py-2 rounded-md text-center transition-all ${
                  chartMode === "study"
                    ? "bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
              >
                Giờ học
              </button>
            </div>
          </div>

          <div className={chartMode === "credit" ? "w-full" : "h-64 w-full"}>
            {!isLoaded ? (
              <div className="h-64 w-full rounded-xl bg-gray-100 dark:bg-gray-700/60 animate-pulse" />
            ) : null}

            {chartMode === "credit" ? (
              // --- BIỂU ĐỒ TIẾN ĐỘ ---
              <div className="flex flex-col items-center justify-center min-[1025px]:flex-row gap-5 sm:gap-6 min-[1025px]:gap-10 p-2">
                {/* PHẦN 1: BIỂU ĐỒ TRÒN */}
                <div className="relative h-44 w-44 sm:h-52 sm:w-52 min-[1025px]:h-56 min-[1025px]:w-56 flex-shrink-0 group">
                  {isLoaded ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart
                      innerRadius="75%"
                      outerRadius="100%"
                      barSize={24}
                      data={[
                        {
                          value: boundedCompletedCredits,
                          fill: "url(#progressGradient)",
                        },
                      ]}
                      startAngle={180}
                      endAngle={0}
                    >
                      <defs>
                        <linearGradient
                          id="progressGradient"
                          x1="0"
                          y1="0"
                          x2="1"
                          y2="0"
                        >
                          <stop offset="0%" stopColor="#3B82F6" />
                          <stop offset="100%" stopColor="#10B981" />
                        </linearGradient>
                      </defs>

                      <PolarAngleAxis
                        type="number"
                        domain={[0, safeTargetCredits]}
                        angleAxisId={0}
                        tick={false}
                      />
                      <RadialBar
                        background={{
                          fill: isDarkMode ? "rgba(51,65,85,0.85)" : "#E5E7EB",
                        }}
                        clockWise={true}
                        dataKey="value"
                        cornerRadius={12}
                      />
                      <Tooltip
                        cursor={false}
                        labelFormatter={() => ""}
                        formatter={(value) => [`${value} tín chỉ`, "Đã tích lũy"]}
                        contentStyle={{
                          borderRadius: "10px",
                          border: isDarkMode
                            ? "1px solid rgba(71,85,105,0.9)"
                            : "1px solid #E5E7EB",
                          backgroundColor: isDarkMode ? "#0F172A" : "#FFFFFF",
                          color: isDarkMode ? "#E2E8F0" : "#0F172A",
                          boxShadow: isDarkMode
                            ? "0 12px 24px rgba(2,6,23,0.5)"
                            : "0 8px 20px rgba(15,23,42,0.12)",
                        }}
                        itemStyle={{ color: isDarkMode ? "#E2E8F0" : "#0F172A" }}
                        labelStyle={{ color: isDarkMode ? "#94A3B8" : "#64748B" }}
                        wrapperStyle={{ zIndex: 40, pointerEvents: "none" }}
                      />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  ) : null}

                  {/* Text ở giữa biểu đồ */}
                  <div className="pointer-events-none absolute inset-0 z-[1] flex flex-col items-center justify-center pt-8">
                    <span className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-600 dark:from-blue-400 dark:to-emerald-400 drop-shadow-sm">
                      {creditPercent}%
                    </span>
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-1">
                      Hoàn thành
                    </span>
                  </div>
                </div>

                {/* PHẦN 2: CÁC THÔNG SỐ CHI TIẾT */}
                <div className="flex-1 grid grid-cols-1 min-[1025px]:grid-cols-2 gap-4 w-full max-w-sm">
                  {/* Box 1: Mục tiêu */}
                  <div
                    className="flex flex-col p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 transition-transform min-[1025px]:hover:scale-105 cursor-pointer"
                    onClick={onOpenTargetModal}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Target className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-xs font-semibold text-blue-600 dark:text-blue-300 uppercase">
                        Mục tiêu
                      </span>
                    </div>
                    <span className="text-xl font-bold text-gray-800 dark:text-white">
                      {safeTargetCredits}{" "}
                      <span className="text-xs font-medium text-gray-500">
                        TC
                      </span>
                    </span>
                  </div>

                  {/* Box 2: Đã tích lũy */}
                  <div className="flex flex-col p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 transition-transform min-[1025px]:hover:scale-105">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-300 uppercase">
                        Tích lũy
                      </span>
                    </div>
                    <span className="text-xl font-bold text-gray-800 dark:text-white">
                      {gpaMetrics.totalCredits}{" "}
                      <span className="text-xs font-medium text-gray-500">
                        TC
                      </span>
                    </span>
                  </div>

                  {/* Box 3: Còn lại */}
                  <div className="flex flex-col p-4 rounded-2xl bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 transition-transform min-[1025px]:hover:scale-105">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertCircle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                      <span className="text-xs font-semibold text-orange-600 dark:text-orange-300 uppercase">
                        Còn lại
                      </span>
                    </div>
                    <span className="text-xl font-bold text-gray-800 dark:text-white">
                      {remainingCredits}{" "}
                      <span className="text-xs font-medium text-gray-500">
                        TC
                      </span>
                    </span>
                  </div>

                  {/* Box 4: Môn đã qua */}
                  <div className="flex flex-col p-4 rounded-2xl bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 transition-transform min-[1025px]:hover:scale-105">
                    <div className="flex items-center gap-2 mb-1">
                      <BookOpen className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <span className="text-xs font-semibold text-purple-600 dark:text-purple-300 uppercase">
                        Môn đã qua
                      </span>
                    </div>
                    <span className="text-xl font-bold text-gray-800 dark:text-white">
                      {gpaMetrics.passedSubjects}{" "}
                      <span className="text-xs font-medium text-gray-500">
                        Môn
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              // --- BIỂU ĐỒ GIỜ HỌC ---
              isLoaded ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient
                      id="colorHours"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="#134691"
                        stopOpacity={0.2}
                      />
                      <stop
                        offset="95%"
                        stopColor="#134691"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke={isDarkMode ? "#334155" : "#f3f4f6"}
                  />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#9ca3af" }}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: isDarkMode
                        ? "1px solid rgba(71,85,105,0.9)"
                        : "1px solid #E5E7EB",
                      backgroundColor: isDarkMode ? "#0F172A" : "#FFFFFF",
                      color: isDarkMode ? "#E2E8F0" : "#0F172A",
                      boxShadow: isDarkMode
                        ? "0 12px 24px rgba(2,6,23,0.5)"
                        : "0 4px 12px rgba(0,0,0,0.1)",
                    }}
                    itemStyle={{ color: isDarkMode ? "#E2E8F0" : "#0F172A" }}
                    labelStyle={{ color: isDarkMode ? "#94A3B8" : "#64748B" }}
                    wrapperStyle={{ zIndex: 40, pointerEvents: "none" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="hours"
                    stroke="#134691"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorHours)"
                  />
                </AreaChart>
              </ResponsiveContainer>
              ) : null
            )}
          </div>
        </div>

        {/* Cột phải: To-Do List */}
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col h-full transition-shadow duration-300 hover:shadow-md">
          <div className="mb-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-blue-600 dark:text-blue-400" />
                <h3 className="whitespace-nowrap text-lg font-extrabold text-gray-900 dark:text-white sm:text-xl">
                  Deadline sắp tới
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex min-w-[76px] shrink-0 items-center justify-center whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-bold leading-none ${
                    primaryDeadlineMeta
                      ? primaryDeadlineMeta.urgency === "critical"
                        ? "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-700/60 dark:bg-orange-900/30 dark:text-orange-300"
                        : primaryDeadlineMeta.urgency === "soon"
                        ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700/60 dark:bg-blue-900/30 dark:text-blue-300"
                        : "border-blue-100 bg-blue-600/10 text-blue-700 dark:border-blue-700/60 dark:bg-blue-900/30 dark:text-blue-300"
                      : "border-gray-200 bg-gray-50 text-gray-500 dark:border-gray-700 dark:bg-gray-700/60 dark:text-gray-300"
                  }`}
                >
                  {pendingDeadlineCount} task
                </span>
                <button
                  type="button"
                  onClick={onOpenDeadlineExpanded}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-700/60 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/40"
                  aria-label="Mở rộng"
                >
                  <ArrowUpRight size={14} />
                </button>
              </div>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              {pendingDeadlineCount} công việc cần xử lý
            </p>
          </div>
          <div className="space-y-3 flex-1 overflow-y-auto pr-1 sm:pr-2 max-h-[350px]">
            {prioritizedDeadlines.length === 0 ? (
              <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                <p>Không có deadline nào.</p>
                <p className="text-xs">Thư giãn đi! 🎉</p>
              </div>
            ) : (
              <>
                {primaryDeadline && (
                  <div
                    className={`relative rounded-2xl border p-4 transition-all duration-300 hover:shadow-md ${
                      primaryDeadline.isDone
                        ? "border-gray-200 bg-gray-50/80 dark:border-gray-700 dark:bg-gray-700/40 opacity-60"
                        : primaryDeadlineMeta?.urgency === "critical"
                        ? "border-orange-200 bg-orange-50/80 dark:border-orange-700/50 dark:bg-orange-900/20"
                        : primaryDeadlineMeta?.urgency === "soon"
                        ? "border-blue-200 bg-blue-50/80 dark:border-blue-700/60 dark:bg-blue-900/20"
                        : "border-blue-100 bg-blue-50/40 dark:border-blue-700/40 dark:bg-blue-900/10"
                    } group`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onToggleDeadline(primaryDeadline);
                        }}
                        disabled={togglingTasks.has(primaryDeadline._id)}
                        className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border transition-all duration-300 ${
                          primaryDeadline.isDone
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-blue-300 bg-white text-white hover:-translate-y-0.5 hover:border-blue-500 dark:border-blue-600 dark:bg-gray-800"
                        } ${togglingTasks.has(primaryDeadline._id) ? "opacity-50 cursor-wait" : ""}`}
                        aria-label={`Đánh dấu hoàn thành ${primaryDeadline.title}`}
                      >
                        <Check
                          size={13}
                          className={`transition-all duration-300 ${
                            primaryDeadline.isDone
                              ? "scale-100 opacity-100"
                              : "scale-75 opacity-0"
                          }`}
                        />
                      </button>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p
                            className={`text-sm sm:text-base font-bold transition-all ${
                              primaryDeadline.isDone
                                ? "line-through text-gray-400 dark:text-gray-500 decoration-gray-400"
                                : "text-gray-800 dark:text-gray-100"
                            }`}
                          >
                            {primaryDeadline.title}
                          </p>
                          {primaryDeadlineMeta?.showWarning && (
                            <AlertCircle
                              size={14}
                              className="text-orange-500 dark:text-orange-300"
                            />
                          )}
                          <span className="inline-flex shrink-0 whitespace-nowrap rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                            {getDeadlineTagLabel(primaryDeadline)}
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <span
                              className={`shrink-0 text-xs sm:text-sm font-semibold ${
                                primaryDeadlineMeta?.urgency === "critical"
                                  ? "text-orange-700 dark:text-orange-300"
                                  : "text-blue-700 dark:text-blue-300"
                              }`}
                            >
                              ⏳ {primaryDeadlineMeta?.timeLeftLabel}
                            </span>
                            <span className="truncate text-xs text-gray-500 dark:text-gray-400">
                              {primaryDeadlineMeta?.dateLine}
                            </span>
                          </div>
                          <div className="ml-auto hidden items-center gap-1 sm:flex">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditDeadline(primaryDeadline);
                              }}
                              className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-300"
                              aria-label="Sửa deadline"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteDeadline(primaryDeadline._id);
                              }}
                              className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-orange-500 dark:hover:text-orange-300"
                              aria-label="Xóa deadline"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center gap-2 border-t border-gray-200/70 pt-2 dark:border-gray-700 sm:hidden">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditDeadline(primaryDeadline);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700"
                          >
                            <Pencil size={12} />
                            Sửa
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDeadline(primaryDeadline._id);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700"
                          >
                            <Trash2 size={12} />
                            Xóa
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="divide-y divide-gray-100 dark:divide-gray-700/80">
                  <div className="hidden sm:block">
                    {secondaryDeadlines.map((task) => {
                      const meta = getDeadlineMeta(task);
                      return (
                        <div
                          key={task._id}
                          className={`group relative flex items-start gap-3 py-3 px-1.5 rounded-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm hover:bg-blue-50/40 dark:hover:bg-blue-900/15 ${
                            task.isDone ? "opacity-60" : ""
                          }`}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onToggleDeadline(task);
                            }}
                            disabled={togglingTasks.has(task._id)}
                            className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border transition-all duration-300 ${
                              task.isDone
                                ? "border-blue-600 bg-blue-600 text-white"
                                : "border-blue-300 bg-white text-white hover:border-blue-500 dark:border-blue-600 dark:bg-gray-800"
                            } ${togglingTasks.has(task._id) ? "opacity-50 cursor-wait" : ""}`}
                            aria-label={`Đánh dấu hoàn thành ${task.title}`}
                          >
                            <Check
                              size={13}
                              className={`transition-all duration-300 ${
                                task.isDone
                                  ? "scale-100 opacity-100"
                                  : "scale-75 opacity-0"
                              }`}
                            />
                          </button>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p
                                className={`text-sm font-semibold ${
                                  task.isDone
                                    ? "line-through text-gray-400 dark:text-gray-500 decoration-gray-400"
                                    : "text-gray-700 dark:text-gray-200"
                                }`}
                              >
                                {task.title}
                              </p>
                              <span className="inline-flex shrink-0 whitespace-nowrap rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                                {getDeadlineTagLabel(task)}
                              </span>
                            </div>
                            <div className="mt-0.5 flex items-center justify-between gap-2">
                              <p
                                className={`min-w-0 truncate text-xs font-medium ${
                                  meta.urgency === "critical"
                                    ? "text-orange-600 dark:text-orange-300"
                                    : meta.urgency === "soon"
                                    ? "text-blue-600 dark:text-blue-300"
                                    : "text-gray-500 dark:text-gray-400"
                                }`}
                              >
                                {meta.timeLeftLabel} • {meta.dateLine}
                              </p>
                              <div className="ml-auto hidden items-center gap-1 sm:flex">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEditDeadline(task);
                                  }}
                                  className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-300"
                                  aria-label="Sửa deadline"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteDeadline(task._id);
                                  }}
                                  className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-orange-500 dark:hover:text-orange-300"
                                  aria-label="Xóa deadline"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                            <div className="mt-2 flex items-center gap-2 border-t border-gray-200/70 pt-2 dark:border-gray-700 sm:hidden">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditDeadline(task);
                                }}
                                className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700"
                              >
                                <Pencil size={12} />
                                Sửa
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteDeadline(task._id);
                                }}
                                className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700"
                              >
                                <Trash2 size={12} />
                                Xóa
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="sm:hidden">
                    {mobileSecondaryDeadlines.map((task) => {
                      const meta = getDeadlineMeta(task);
                      return (
                        <div
                          key={task._id}
                          className={`group relative flex items-start gap-3 py-3 px-1 rounded-xl transition-all duration-200 hover:bg-blue-50/40 dark:hover:bg-blue-900/15 ${
                            task.isDone ? "opacity-60" : ""
                          }`}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onToggleDeadline(task);
                            }}
                            disabled={togglingTasks.has(task._id)}
                            className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border transition-all duration-300 ${
                              task.isDone
                                ? "border-blue-600 bg-blue-600 text-white"
                                : "border-blue-300 bg-white text-white dark:border-blue-600 dark:bg-gray-800"
                            } ${togglingTasks.has(task._id) ? "opacity-50 cursor-wait" : ""}`}
                            aria-label={`Đánh dấu hoàn thành ${task.title}`}
                          >
                            <Check
                              size={13}
                              className={`transition-all duration-300 ${
                                task.isDone
                                  ? "scale-100 opacity-100"
                                  : "scale-75 opacity-0"
                              }`}
                            />
                          </button>
                          <div className="flex-1">
                            <p
                              className={`text-sm font-semibold ${
                                task.isDone
                                  ? "line-through text-gray-400 dark:text-gray-500 decoration-gray-400"
                                  : "text-gray-700 dark:text-gray-200"
                              }`}
                            >
                              {task.title}
                            </p>
                            <span className="mt-1 inline-flex shrink-0 whitespace-nowrap rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                              {getDeadlineTagLabel(task)}
                            </span>
                            <p
                              className={`mt-0.5 text-xs font-medium ${
                                meta.urgency === "critical"
                                  ? "text-orange-600 dark:text-orange-300"
                                  : meta.urgency === "soon"
                                  ? "text-blue-600 dark:text-blue-300"
                                  : "text-gray-500 dark:text-gray-400"
                              }`}
                            >
                              {meta.timeLeftLabel} • {meta.dateLine}
                            </p>
                            <div className="mt-2 flex items-center gap-2 border-t border-gray-200/70 pt-2 dark:border-gray-700">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditDeadline(task);
                                }}
                                className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700"
                              >
                                <Pencil size={12} />
                                Sửa
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteDeadline(task._id);
                                }}
                                className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700"
                              >
                                <Trash2 size={12} />
                                Xóa
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {secondaryDeadlines.length > 2 && (
                      <button
                        onClick={() =>
                          setShowAllDeadlinesMobile((prev) => !prev)
                        }
                        className="mt-2 inline-flex items-center gap-1 rounded-lg border border-blue-100 bg-blue-50/70 px-2.5 py-1.5 text-xs font-semibold text-blue-700 dark:border-blue-700/60 dark:bg-blue-900/25 dark:text-blue-300"
                      >
                        {showAllDeadlinesMobile ? "Thu gọn" : "Xem thêm"}
                        <ChevronDown
                          size={14}
                          className={`transition-transform ${
                            showAllDeadlinesMobile ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverviewTab;
