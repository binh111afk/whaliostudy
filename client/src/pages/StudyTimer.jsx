import React, { useEffect, useMemo, useState } from "react";
import * as FramerMotion from "framer-motion";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CloudRain,
  Disc3,
  Flame,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Volume2,
  Waves,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { studyService } from "../services/studyService";

const TIMER_MODES = {
  focus: { label: "Tập trung", minutes: 25, accent: "from-cyan-400 to-blue-500" },
  shortBreak: { label: "Nghỉ ngắn", minutes: 5, accent: "from-emerald-400 to-teal-500" },
  longBreak: { label: "Nghỉ dài", minutes: 15, accent: "from-violet-400 to-indigo-500" },
};

const SMART_TIPS = [
  "Uống nước đi bạn ơi.",
  "Deadline Triết học: Còn 2 tiếng.",
  "Đứng dậy vươn vai 30 giây trước phiên tiếp theo.",
  "Tắt tab mạng xã hội để giữ nhịp tập trung.",
];

const MOCK_EVENTS = [
  { title: "Review đề cương CTDL", time: "14:30 - 15:00" },
  { title: "Họp nhóm Web", time: "16:15 - 17:00" },
];

const INITIAL_TASKS = [
  { id: 1, title: "Hoàn thành 2 bài tập Triết học", done: false },
  { id: 2, title: "Đọc chương 3 Cấu trúc dữ liệu", done: false },
];

const pad = (num) => String(num).padStart(2, "0");
const formatTime = (seconds) => `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`;

const ModePill = ({ active, disabled, label, onClick }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`px-4 py-2.5 rounded-full text-sm font-bold transition-all border ${
      active
        ? "bg-white text-slate-900 border-white shadow-lg"
        : "bg-white/10 text-slate-200 border-white/15 hover:bg-white/15"
    } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
  >
    {label}
  </button>
);

const SoundButton = ({ active, icon, label, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-colors ${
      active
        ? "bg-cyan-400/20 border-cyan-300/40 text-cyan-100"
        : "bg-white/5 border-white/10 text-slate-200 hover:bg-white/10"
    }`}
  >
    {React.createElement(icon, { size: 16 })}
    {label}
  </button>
);

const StudyTimer = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  const [mode, setMode] = useState("focus");
  const [timeLeft, setTimeLeft] = useState(TIMER_MODES.focus.minutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [newTask, setNewTask] = useState("");
  const [activeSound, setActiveSound] = useState(null);
  const [todayStudyHours, setTodayStudyHours] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);

  const modeConfig = TIMER_MODES[mode];
  const progress = ((modeConfig.minutes * 60 - timeLeft) / (modeConfig.minutes * 60)) * 100;
  const activeTask = tasks.find((t) => !t.done) || tasks[0];
  const isZenMode = isRunning;

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
    const id = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % SMART_TIPS.length);
    }, 10000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    document.title = isRunning ? `${formatTime(timeLeft)} | Focus Room` : "Whalio Study";
    return () => {
      document.title = "Whalio Study";
    };
  }, [isRunning, timeLeft]);

  useEffect(() => {
    if (timeLeft !== 0 || !isRunning) return;
    const completeSession = async () => {
      setIsRunning(false);
      const minutes = modeConfig.minutes;

      if (user?.username && mode === "focus") {
        const res = await studyService.saveSession(user.username, minutes);
        if (res?.success) {
          const newHours = Number((todayStudyHours + minutes / 60).toFixed(1));
          setTodayStudyHours(newHours);
        }
      }

      toast.success("Phiên học hoàn thành", {
        description: `Bạn đã hoàn thành ${minutes} phút ${modeConfig.label.toLowerCase()}.`,
      });

      setTimeLeft(modeConfig.minutes * 60);
    };

    completeSession();
  }, [isRunning, mode, modeConfig, timeLeft, todayStudyHours, user]);

  useEffect(() => {
    const loadTodayHours = async () => {
      if (!user?.username) return;
      const res = await studyService.getStats(user.username);
      if (!res?.success || !Array.isArray(res.data) || res.data.length === 0) return;
      const today = res.data[res.data.length - 1];
      setTodayStudyHours(Number(((today.minutes || 0) / 60).toFixed(1)));
    };
    loadTodayHours();
  }, [user]);

  useEffect(() => {
    if (isZenMode) {
      document.body.classList.add("whalio-zen-active");
    } else {
      document.body.classList.remove("whalio-zen-active");
    }

    return () => {
      document.body.classList.remove("whalio-zen-active");
    };
  }, [isZenMode]);

  const circle = useMemo(() => {
    const radius = 132;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress / 100) * circumference;
    return { radius, circumference, offset };
  }, [progress]);

  const switchMode = (nextMode) => {
    if (isRunning) return;
    setMode(nextMode);
    setTimeLeft(TIMER_MODES[nextMode].minutes * 60);
  };

  const toggleTimer = () => setIsRunning((prev) => !prev);

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(modeConfig.minutes * 60);
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
    <div className="relative min-h-[calc(100vh-6rem)] -m-6 overflow-hidden text-slate-100">
      <style>{`
        .whalio-zen-active .w-64.h-screen.fixed.left-0.top-0,
        .whalio-zen-active .h-16.sticky.top-0 {
          opacity: 0.08;
          filter: blur(2px);
          pointer-events: none;
          transition: opacity 280ms ease, filter 280ms ease;
        }
      `}</style>

      <div className="absolute inset-0 bg-[#060c19]" />
      <FramerMotion.motion.div
        className="absolute -top-28 -left-24 h-[28rem] w-[28rem] rounded-full bg-blue-500/30 blur-[90px]"
        animate={{ x: [0, 36, -8, 0], y: [0, 18, -12, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      <FramerMotion.motion.div
        className="absolute top-1/3 -right-28 h-[26rem] w-[26rem] rounded-full bg-violet-500/30 blur-[100px]"
        animate={{ x: [0, -22, 10, 0], y: [0, 20, -10, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <FramerMotion.motion.div
        className="absolute -bottom-24 left-1/3 h-[24rem] w-[24rem] rounded-full bg-teal-500/20 blur-[100px]"
        animate={{ x: [0, 15, -20, 0], y: [0, -15, 8, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_45%)]" />

      <div className="relative z-10 flex min-h-[calc(100vh-6rem)]">
        <div className="flex-1 px-5 py-7 md:px-10 md:py-10">
          <div className="mx-auto max-w-4xl">
            <div className="mb-6 flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300/90">Focus Room</p>
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-200/20 bg-orange-400/15 px-3 py-1.5">
                <Flame size={16} className="text-orange-300" />
                <span className="text-sm font-semibold text-orange-100">{todayStudyHours}h hôm nay</span>
              </div>
            </div>

            <FramerMotion.motion.section
              layout
              className="rounded-[2rem] border border-white/15 bg-white/10 p-6 md:p-10 backdrop-blur-2xl shadow-2xl shadow-black/20"
            >
              <div className="mx-auto max-w-xl text-center">
                <div className="relative mx-auto h-[19rem] w-[19rem] md:h-[22rem] md:w-[22rem]">
                  <svg className="h-full w-full -rotate-90" viewBox="0 0 320 320">
                    <circle cx="160" cy="160" r={circle.radius} stroke="rgba(255,255,255,0.14)" strokeWidth="12" fill="none" />
                    <FramerMotion.motion.circle
                      cx="160"
                      cy="160"
                      r={circle.radius}
                      stroke="url(#timer-accent)"
                      strokeWidth="12"
                      strokeLinecap="round"
                      fill="none"
                      strokeDasharray={circle.circumference}
                      animate={{ strokeDashoffset: circle.offset }}
                      transition={{ duration: 0.45, ease: "easeOut" }}
                    />
                    <defs>
                      <linearGradient id="timer-accent" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#67e8f9" />
                        <stop offset="100%" stopColor="#60a5fa" />
                      </linearGradient>
                    </defs>
                  </svg>

                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300/90">{modeConfig.label}</p>
                    <FramerMotion.motion.div
                      key={`${mode}-${timeLeft}`}
                      initial={{ opacity: 0.45, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="font-mono text-6xl md:text-7xl font-light tracking-tight text-white"
                      style={{ fontFamily: "JetBrains Mono, Inter, ui-monospace, SFMono-Regular, Menlo, monospace" }}
                    >
                      {formatTime(timeLeft)}
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

                <div className="mt-7 flex items-center justify-center gap-3">
                  <FramerMotion.motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={toggleTimer}
                    className={`inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r px-7 py-3.5 text-base font-bold text-slate-900 shadow-xl ${
                      modeConfig.accent
                    }`}
                  >
                    {isRunning ? <Pause size={18} /> : <Play size={18} />}
                    {isRunning ? "Pause" : "Start"}
                  </FramerMotion.motion.button>

                  <button
                    onClick={resetTimer}
                    className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-4 py-3.5 text-slate-100 hover:bg-white/15 transition-colors"
                  >
                    <RotateCcw size={18} />
                  </button>
                </div>

                <FramerMotion.motion.div
                  key={tipIndex}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-7 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200"
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
              className="w-full max-w-sm border-l border-white/10 bg-slate-950/35 p-5 backdrop-blur-xl md:p-6"
            >
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-slate-200/90">Tiện ích</h3>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="rounded-lg border border-white/15 bg-white/10 p-1.5 text-slate-200 hover:bg-white/20"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <div className="space-y-4">
                <section className="rounded-2xl border border-white/15 bg-white/10 p-4">
                  <h4 className="mb-3 text-sm font-semibold text-white">Task phiên này</h4>
                  <div className="space-y-2">
                    {tasks.map((task) => (
                      <button
                        key={task.id}
                        onClick={() => toggleTask(task.id)}
                        className="flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-sm hover:bg-white/10"
                      >
                        <CheckCircle2 size={16} className={task.done ? "text-emerald-300" : "text-slate-500"} />
                        <span className={task.done ? "line-through text-slate-400" : "text-slate-100"}>{task.title}</span>
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <input
                      value={newTask}
                      onChange={(e) => setNewTask(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addTask()}
                      placeholder="Thêm task..."
                      className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-slate-400 outline-none focus:border-cyan-300/50"
                    />
                    <button onClick={addTask} className="rounded-xl bg-cyan-400/85 p-2 text-slate-900 hover:bg-cyan-300">
                      <Plus size={16} />
                    </button>
                  </div>
                </section>

                <section className="rounded-2xl border border-white/15 bg-white/10 p-4">
                  <h4 className="mb-3 text-sm font-semibold text-white">Lịch trình sắp tới</h4>
                  <div className="space-y-2">
                    {MOCK_EVENTS.map((event) => (
                      <div key={event.title} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                        <p className="text-sm font-medium text-slate-100">{event.title}</p>
                        <p className="text-xs text-slate-400">{event.time}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-2xl border border-white/15 bg-white/10 p-4">
                  <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                    <Volume2 size={16} /> Soundscapes
                  </h4>
                  <div className="grid grid-cols-1 gap-2">
                    <SoundButton
                      active={activeSound === "rain"}
                      icon={CloudRain}
                      label="Mưa"
                      onClick={() => setActiveSound((prev) => (prev === "rain" ? null : "rain"))}
                    />
                    <SoundButton
                      active={activeSound === "lofi"}
                      icon={Disc3}
                      label="Lo-fi"
                      onClick={() => setActiveSound((prev) => (prev === "lofi" ? null : "lofi"))}
                    />
                    <SoundButton
                      active={activeSound === "white-noise"}
                      icon={Waves}
                      label="White noise"
                      onClick={() => setActiveSound((prev) => (prev === "white-noise" ? null : "white-noise"))}
                    />
                  </div>
                </section>
              </div>
            </FramerMotion.motion.aside>
          )}
        </FramerMotion.AnimatePresence>
      </div>

      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="absolute right-4 top-6 z-20 inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm font-semibold text-slate-100 backdrop-blur-lg hover:bg-white/20 transition-colors"
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
            className="fixed inset-0 z-[110] bg-[#050812]/82 backdrop-blur-xl"
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
                {formatTime(timeLeft)}
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
                  onClick={() => setIsRunning(false)}
                  className="rounded-2xl border border-white/20 bg-white/10 p-3 text-white hover:bg-white/15 transition-colors"
                  aria-label="Thoát Zen Mode"
                >
                  <X size={18} />
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
