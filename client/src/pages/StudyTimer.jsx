import React, { useEffect, useMemo, useRef, useState } from "react";
import * as FramerMotion from "framer-motion";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Flame,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Plus,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { studyService } from "../services/studyService";
import LocalMusicPlayer from "../components/LocalMusicPlayer";

const TIMER_MODES = {
  focus: { label: "Tập trung", minutes: 25, accent: "from-blue-500 to-indigo-500" },
  shortBreak: { label: "Nghỉ ngắn", minutes: 5, accent: "from-emerald-500 to-teal-500" },
  longBreak: { label: "Nghỉ dài", minutes: 15, accent: "from-purple-500 to-indigo-500" },
};

const SMART_TIPS = [
  "Uống nước đi bạn ơi.",
  "Đặt mục tiêu nhỏ cho 25 phút này.",
  "Tắt thông báo điện thoại để giữ nhịp tập trung.",
  "Học xong phiên này nhớ đứng dậy đi lại 1 phút.",
];

const INITIAL_TASKS = [
  { id: 1, title: "Hoàn thành 2 bài tập Triết học", done: false },
  { id: 2, title: "Đọc chương 3 Cấu trúc dữ liệu", done: false },
];

const pad = (num) => String(num).padStart(2, "0");
const formatDisplayTime = (seconds, forceHours = false) => {
  const safe = Math.max(0, seconds);
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;

  if (forceHours) {
    return `${h}:${pad(m)}:${pad(s)}`;
  }

  return `${pad(Math.floor(safe / 60))}:${pad(safe % 60)}`;
};

const formatVNDate = (value) => {
  if (!value) return "Không có hạn";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Không có hạn";
  return d.toLocaleString("vi-VN", { hour12: false, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
};

const ModePill = ({ active, disabled, label, onClick }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`px-4 py-2.5 rounded-full text-sm font-bold transition-all border ${
      active
        ? "bg-blue-600 text-white border-blue-600 shadow-md"
        : "bg-white/70 dark:bg-white/10 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-white/15 hover:bg-white dark:hover:bg-white/15"
    } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
  >
    {label}
  </button>
);

const StudyTimer = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  const nextBreakReminderRef = useRef(25 * 60);

  const [mode, setMode] = useState("focus");
  const [focusDurationMinutes, setFocusDurationMinutes] = useState(25);
  const [timeLeft, setTimeLeft] = useState(TIMER_MODES.focus.minutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isManualFullscreen, setIsManualFullscreen] = useState(false);
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [newTask, setNewTask] = useState("");
  const [todayStudyHours, setTodayStudyHours] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);

  const [upcomingDeadlines, setUpcomingDeadlines] = useState([]);
  const [subjectReminders, setSubjectReminders] = useState([]);


  const modeConfig = TIMER_MODES[mode];
  const currentModeMinutes = mode === "focus" ? focusDurationMinutes : modeConfig.minutes;
  const totalSeconds = currentModeMinutes * 60;
  const useHourFormat = currentModeMinutes > 60;
  const progress = ((totalSeconds - timeLeft) / totalSeconds) * 100;
  const activeTask = tasks.find((task) => !task.done) || tasks[0];
  const isZenMode = isManualFullscreen;

  useEffect(() => {
    let interval;
    if (isRunning) {
      interval = setInterval(() => {
        setTimeLeft((prev) => Math.max(prev - 1, 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  useEffect(() => {
    document.title = isRunning ? `${formatDisplayTime(timeLeft, useHourFormat)} | StudyTime` : "Whalio Study";
    return () => {
      document.title = "Whalio Study";
    };
  }, [isRunning, timeLeft, useHourFormat]);

  useEffect(() => {
    if (timeLeft !== 0 || !isRunning) return;

    const completeSession = async () => {
      setIsRunning(false);
      const minutes = currentModeMinutes;

      if (user?.username && mode === "focus") {
        const res = await studyService.saveSession(user.username, minutes);
        if (res?.success) {
          setTodayStudyHours((prev) => Number((prev + minutes / 60).toFixed(1)));
        }
      }

      toast.success("Hoàn thành phiên học", {
        description: `Bạn đã hoàn thành ${minutes} phút ${modeConfig.label.toLowerCase()}.`,
      });

      setTimeLeft(totalSeconds);
    };

    completeSession();
  }, [isRunning, mode, currentModeMinutes, modeConfig.label, timeLeft, totalSeconds, user]);

  useEffect(() => {
    if (mode !== "focus" || !isRunning) return;

    const elapsed = totalSeconds - timeLeft;
    if (nextBreakReminderRef.current <= totalSeconds && elapsed >= nextBreakReminderRef.current) {
      const minuteMark = Math.floor(nextBreakReminderRef.current / 60);
      toast.message("Nhắc nghỉ ngắn", {
        description: `Bạn đã học ${minuteMark} phút. Nghỉ 1-2 phút rồi tiếp tục nhé.`,
      });
      nextBreakReminderRef.current += 25 * 60;
    }
  }, [mode, isRunning, timeLeft, totalSeconds]);

  useEffect(() => {
    const id = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % SMART_TIPS.length);
    }, 12000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (isZenMode) {
      document.body.classList.add("whalio-zen-active");
    } else {
      document.body.classList.remove("whalio-zen-active");
    }
    return () => document.body.classList.remove("whalio-zen-active");
  }, [isZenMode]);

  useEffect(() => {
    const loadAllData = async () => {
      if (!user?.username) return;

      try {
        const [studyRes, eventsRes, timetableRes] = await Promise.all([
          studyService.getStats(user.username),
          fetch(`/api/events?username=${user.username}`).then((r) => r.json()),
          fetch(`/api/timetable?username=${user.username}`).then((r) => r.json()),
        ]);

        if (studyRes?.success && Array.isArray(studyRes.data) && studyRes.data.length > 0) {
          const today = studyRes.data[studyRes.data.length - 1];
          setTodayStudyHours(Number(((today.minutes || 0) / 60).toFixed(1)));
        }

        if (eventsRes?.success && Array.isArray(eventsRes.events)) {
          const now = new Date();
          const deadlines = eventsRes.events
            .filter((event) => new Date(event.date) >= now)
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(0, 3)
            .map((event) => ({
              id: event._id,
              title: event.title,
              date: event.date,
            }));
          setUpcomingDeadlines(deadlines);
        }

        if (timetableRes?.success && Array.isArray(timetableRes.timetable)) {
          const reminders = timetableRes.timetable
            .flatMap((subject) =>
              (subject.notes || [])
                .filter((note) => !note.isDone)
                .map((note) => ({
                  id: note.id,
                  subject: subject.subject,
                  content: note.content,
                  deadline: note.deadline,
                }))
            )
            .sort((a, b) => {
              const timeA = a.deadline ? new Date(a.deadline).getTime() : Number.MAX_SAFE_INTEGER;
              const timeB = b.deadline ? new Date(b.deadline).getTime() : Number.MAX_SAFE_INTEGER;
              return timeA - timeB;
            })
            .slice(0, 3);

          setSubjectReminders(reminders);
        }
      } catch (err) {
        console.error("Load StudyTime synced data error:", err);
      }
    };

    loadAllData();
  }, [user]);

  const ring = useMemo(() => {
    const radius = 132;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress / 100) * circumference;
    return { radius, circumference, offset };
  }, [progress]);

  const switchMode = (nextMode) => {
    if (isRunning) return;
    setMode(nextMode);
    const nextMinutes = nextMode === "focus" ? focusDurationMinutes : TIMER_MODES[nextMode].minutes;
    setTimeLeft(nextMinutes * 60);
    nextBreakReminderRef.current = 25 * 60;
  };

  const toggleTimer = () => {
    setIsRunning((prev) => !prev);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(totalSeconds);
    nextBreakReminderRef.current = 25 * 60;
  };

  const addTask = () => {
    const value = newTask.trim();
    if (!value) return;
    setTasks((prev) => [...prev, { id: Date.now(), title: value, done: false }]);
    setNewTask("");
  };

  const toggleTask = (id) => {
    setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, done: !task.done } : task)));
  };

  return (
    <div className="relative min-h-[calc(100dvh-4rem)] -m-6 overflow-y-auto text-slate-800 dark:text-slate-100 xl:h-[calc(100dvh-4rem)] xl:overflow-hidden">
      <style>{`
        .whalio-zen-active .w-64.h-screen.fixed.left-0.top-0,
        .whalio-zen-active .h-16.sticky.top-0 {
          opacity: 0.06;
          filter: blur(2px);
          pointer-events: none;
          transition: opacity 240ms ease, filter 240ms ease;
        }
      `}</style>

      <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800" />
      <FramerMotion.motion.div
        className="absolute -top-28 -left-24 h-[28rem] w-[28rem] rounded-full bg-blue-300/35 dark:bg-blue-500/20 blur-[90px]"
        animate={{ x: [0, 24, -10, 0], y: [0, 12, -8, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      <FramerMotion.motion.div
        className="absolute top-1/3 -right-20 h-[24rem] w-[24rem] rounded-full bg-indigo-300/30 dark:bg-indigo-500/20 blur-[95px]"
        animate={{ x: [0, -18, 10, 0], y: [0, 16, -8, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative z-10 flex min-h-full flex-col xl:h-full xl:min-h-0 xl:flex-row">
        <div className="whalio-scrollbar flex min-h-0 flex-1 items-start justify-center overflow-y-visible px-4 py-5 md:px-8 md:py-6 xl:items-center xl:overflow-y-auto">
          <div className="mx-auto flex w-full max-w-4xl flex-col justify-center">
            <div className="mb-4 flex items-center justify-between md:mb-6">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">Focus Room</p>
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-300/40 dark:border-orange-200/20 bg-orange-100/70 dark:bg-orange-400/10 px-3 py-1.5">
                <Flame size={16} className="text-orange-500 dark:text-orange-300" />
                <span className="text-sm font-semibold text-orange-700 dark:text-orange-100">{todayStudyHours}h hôm nay</span>
              </div>
            </div>

            <FramerMotion.motion.section
              layout
              className="relative rounded-[2rem] border border-white/60 dark:border-white/15 bg-white/65 dark:bg-white/10 p-4 md:p-6 xl:p-8 backdrop-blur-xl shadow-xl shadow-blue-200/40 dark:shadow-black/20"
            >
              <button
                onClick={() => setIsManualFullscreen((prev) => !prev)}
                className="absolute right-5 top-5 inline-flex items-center justify-center rounded-xl border border-slate-200 dark:border-white/15 bg-white/80 dark:bg-white/10 px-3 py-2 text-slate-700 dark:text-slate-100 hover:bg-white dark:hover:bg-white/15 transition-colors"
                title="Phóng to"
              >
                {isManualFullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
              </button>

              <div className="mx-auto max-w-xl text-center">
                <div className="relative mx-auto h-[16rem] w-[16rem] md:h-[19rem] md:w-[19rem] xl:h-[22rem] xl:w-[22rem]">
                  <svg className="h-full w-full -rotate-90" viewBox="0 0 320 320">
                    <circle cx="160" cy="160" r={ring.radius} stroke="rgba(148,163,184,0.32)" strokeWidth="12" fill="none" />
                    <FramerMotion.motion.circle
                      cx="160"
                      cy="160"
                      r={ring.radius}
                      className="hidden dark:block"
                      stroke="#60a5fa"
                      strokeWidth="14"
                      strokeLinecap="round"
                      fill="none"
                      strokeDasharray={ring.circumference}
                      animate={{ strokeDashoffset: ring.offset }}
                      transition={{ duration: 0.45, ease: "easeOut" }}
                      style={{
                        filter:
                          "drop-shadow(0 0 10px rgba(96,165,250,0.95)) drop-shadow(0 0 22px rgba(59,130,246,0.85)) drop-shadow(0 0 36px rgba(37,99,235,0.6))",
                      }}
                    />
                    <FramerMotion.motion.circle
                      cx="160"
                      cy="160"
                      r={ring.radius}
                      stroke="url(#timer-accent)"
                      strokeWidth="12"
                      strokeLinecap="round"
                      fill="none"
                      strokeDasharray={ring.circumference}
                      animate={{ strokeDashoffset: ring.offset }}
                      transition={{ duration: 0.45, ease: "easeOut" }}
                    />
                    <defs>
                      <linearGradient id="timer-accent" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#6366f1" />
                      </linearGradient>
                    </defs>
                  </svg>

                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">{modeConfig.label}</p>
                    <FramerMotion.motion.div
                      key={`${mode}-${timeLeft}`}
                      initial={{ opacity: 0.45, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="font-mono text-6xl md:text-7xl font-light tracking-tight text-slate-800 dark:text-white"
                      style={{ fontFamily: "JetBrains Mono, Inter, ui-monospace, SFMono-Regular, Menlo, monospace" }}
                    >
                      {formatDisplayTime(timeLeft, useHourFormat)}
                    </FramerMotion.motion.div>
                  </div>
                </div>

                <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
                  <ModePill active={mode === "focus"} disabled={isRunning} label="Tập trung" onClick={() => switchMode("focus")} />
                  <ModePill
                    active={mode === "shortBreak"}
                    disabled={isRunning}
                    label="Nghỉ ngắn"
                    onClick={() => switchMode("shortBreak")}
                  />
                  <ModePill
                    active={mode === "longBreak"}
                    disabled={isRunning}
                    label="Nghỉ dài"
                    onClick={() => switchMode("longBreak")}
                  />
                </div>

                {mode === "focus" && (
                  <div className="mt-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/75 dark:bg-white/5 px-4 py-3 text-left">
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">Thời lượng phiên học</span>
                      <span className="font-bold text-blue-600 dark:text-blue-300">{focusDurationMinutes} phút</span>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={300}
                      step={5}
                      disabled={isRunning}
                      value={focusDurationMinutes}
                      onChange={(e) => {
                        const value = Math.min(300, Math.max(5, Number(e.target.value) || 25));
                        setFocusDurationMinutes(value);
                        setTimeLeft(value * 60);
                        nextBreakReminderRef.current = 25 * 60;
                      }}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-200 dark:bg-slate-700 accent-blue-500 disabled:opacity-50"
                    />
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Tối đa 5 tiếng. Bị khóa khi timer đang chạy.</p>
                  </div>
                )}

                <div className="mt-7 flex items-center justify-center gap-3">
                  <FramerMotion.motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={toggleTimer}
                    className={`inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r px-7 py-3.5 text-base font-bold text-white shadow-lg ${
                      modeConfig.accent
                    }`}
                  >
                    {isRunning ? <Pause size={18} /> : <Play size={18} />}
                    {isRunning ? "Pause" : "Start"}
                  </FramerMotion.motion.button>

                  <button
                    onClick={resetTimer}
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-200 dark:border-white/15 bg-white/80 dark:bg-white/10 px-4 py-3.5 text-slate-700 dark:text-slate-100 hover:bg-white dark:hover:bg-white/15 transition-colors"
                    title="Đặt lại"
                  >
                    <RotateCcw size={18} />
                  </button>
                </div>

                <FramerMotion.motion.div
                  key={tipIndex}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-7 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/75 dark:bg-white/5 px-4 py-3 text-sm text-slate-600 dark:text-slate-200"
                >
                  {SMART_TIPS[tipIndex]}
                </FramerMotion.motion.div>
              </div>
            </FramerMotion.motion.section>
          </div>
        </div>

        <FramerMotion.AnimatePresence>
          {isSidebarOpen && (
            <FramerMotion.motion.aside
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="mt-4 flex w-full flex-col border-t border-white/40 dark:border-white/10 bg-white/55 dark:bg-slate-900/45 p-4 backdrop-blur-xl md:p-5 xl:mt-0 xl:h-full xl:min-h-0 xl:max-w-[390px] xl:shrink-0 xl:border-t-0 xl:border-l"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-slate-600 dark:text-slate-200">Tiện ích</h3>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="rounded-lg border border-slate-200 dark:border-white/15 bg-white/80 dark:bg-white/10 p-1.5 text-slate-600 dark:text-slate-200 hover:bg-white dark:hover:bg-white/20"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <div className="space-y-4 pr-1 xl:whalio-scrollbar xl:flex-1 xl:overflow-y-auto">
                <section className="rounded-2xl border border-slate-200/80 dark:border-white/15 bg-white/70 dark:bg-white/10 p-4">
                  <h4 className="mb-3 text-sm font-semibold text-slate-800 dark:text-white">Task phiên này</h4>
                  <div className="whalio-scrollbar max-h-48 space-y-2 overflow-y-auto pr-1">
                    {tasks.map((task) => (
                      <button
                        key={task.id}
                        onClick={() => toggleTask(task.id)}
                        className="flex w-full items-center gap-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5 px-3 py-2 text-left text-sm hover:bg-white dark:hover:bg-white/10"
                      >
                        <CheckCircle2 size={16} className={task.done ? "text-emerald-500 dark:text-emerald-300" : "text-slate-400"} />
                        <span className={task.done ? "line-through text-slate-400" : "text-slate-700 dark:text-slate-100"}>{task.title}</span>
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <input
                      value={newTask}
                      onChange={(e) => setNewTask(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addTask()}
                      placeholder="Thêm task..."
                      className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 px-3 py-2 text-sm text-slate-700 dark:text-white placeholder:text-slate-400 outline-none focus:border-blue-400"
                    />
                    <button onClick={addTask} className="rounded-xl bg-blue-500 p-2 text-white hover:bg-blue-600">
                      <Plus size={16} />
                    </button>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200/80 dark:border-white/15 bg-white/70 dark:bg-white/10 p-4">
                  <h4 className="mb-3 text-sm font-semibold text-slate-800 dark:text-white">Deadline sắp tới</h4>
                  <div className="whalio-scrollbar max-h-44 space-y-2 overflow-y-auto pr-1">
                    {upcomingDeadlines.length > 0 ? (
                      upcomingDeadlines.map((item) => (
                        <div key={item.id} className="rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5 px-3 py-2">
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-100">{item.title}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{formatVNDate(item.date)}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500 dark:text-slate-400">Chưa có deadline nào.</p>
                    )}
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200/80 dark:border-white/15 bg-white/70 dark:bg-white/10 p-4">
                  <h4 className="mb-3 text-sm font-semibold text-slate-800 dark:text-white">Nhắc nhở môn học</h4>
                  <div className="whalio-scrollbar max-h-44 space-y-2 overflow-y-auto pr-1">
                    {subjectReminders.length > 0 ? (
                      subjectReminders.map((item) => (
                        <div key={`${item.subject}-${item.id}`} className="rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5 px-3 py-2">
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-100">{item.subject}</p>
                          <p className="text-xs text-slate-600 dark:text-slate-300">{item.content}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">{formatVNDate(item.deadline)}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500 dark:text-slate-400">Chưa có nhắc nhở môn học.</p>
                    )}
                  </div>
                </section>

                <LocalMusicPlayer />
              </div>
            </FramerMotion.motion.aside>
          )}
        </FramerMotion.AnimatePresence>
      </div>

      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="fixed bottom-4 right-4 z-20 inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-white/15 bg-white/90 dark:bg-slate-900/70 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-100 shadow-lg backdrop-blur-lg hover:bg-white dark:hover:bg-white/20 transition-colors xl:absolute xl:bottom-auto xl:right-4 xl:top-6"
        >
          <ChevronLeft size={16} />
          Tiện ích
        </button>
      )}

      <FramerMotion.AnimatePresence>
        {isZenMode && (
          <FramerMotion.motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-slate-900/70 backdrop-blur-xl"
          >
            <div className="flex h-full flex-col items-center justify-center px-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Zen Mode</p>
              <FramerMotion.motion.div
                key={`zen-${timeLeft}`}
                initial={{ scale: 0.98, opacity: 0.7 }}
                animate={{ scale: 1, opacity: 1 }}
                className="font-mono text-7xl md:text-8xl font-light text-white"
                style={{ fontFamily: "JetBrains Mono, Inter, ui-monospace, SFMono-Regular, Menlo, monospace" }}
              >
                {formatDisplayTime(timeLeft, useHourFormat)}
              </FramerMotion.motion.div>

              {activeTask && (
                <div className="mt-5 rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-center">
                  <p className="text-xs uppercase tracking-[0.15em] text-slate-300 mb-1">Task hiện tại</p>
                  <p className="text-base md:text-lg font-semibold text-white">{activeTask.title}</p>
                </div>
              )}

              <div className="mt-7 flex items-center gap-3">
                <button
                  onClick={toggleTimer}
                  className="rounded-2xl bg-white px-6 py-3 text-base font-bold text-slate-900 hover:bg-slate-100 transition-colors"
                >
                  {isRunning ? "Tạm dừng" : "Tiếp tục"}
                </button>
                <button
                  onClick={resetTimer}
                  className="rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-base font-semibold text-white hover:bg-white/15 transition-colors"
                >
                  Đặt lại
                </button>
                <button
                  onClick={() => {
                    setIsManualFullscreen(false);
                    if (!isRunning) setIsRunning(false);
                  }}
                  className="rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-base font-semibold text-white hover:bg-white/15 transition-colors"
                >
                  Thu nhỏ
                </button>
              </div>
            </div>
          </FramerMotion.motion.div>
        )}
      </FramerMotion.AnimatePresence>
    </div>
  );
};

export default StudyTimer;
