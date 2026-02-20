import React, { useState, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { studyService } from "../services/studyService";
import AddDeadlineModal from "../components/AddDeadlineModal";
import DeadlineExpandedSection from "../components/DeadlineExpandedSection";
import DashboardOverviewTab from "../components/dashboard/DashboardOverviewTab";
import DashboardScheduleTab from "../components/dashboard/DashboardScheduleTab";
import DashboardNotesTab from "../components/dashboard/DashboardNotesTab";
import DashboardFlashcardTab from "../components/dashboard/DashboardFlashcardTab";
import {
  Calendar,
  Layers,
  FileText,
  GraduationCap,
  Target,
  StickyNote,
  Edit2,
} from "lucide-react";

// --- HELPER: Lấy ngày giờ Việt Nam chuẩn ---
const getVNDate = () => {
  const date = new Date();
  const options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  return date.toLocaleDateString("vi-VN", options);
};

const isMobileViewport = () =>
  typeof window !== "undefined" && window.innerWidth < 640;

const getConfirmToastOptions = () => ({
  position: isMobileViewport() ? "bottom-center" : "top-center",
  duration: Infinity,
});

const isScheduleOnlyEvent = (event) => {
  const eventType = String(event?.type || "").trim().toLowerCase();
  const eventTag = String(event?.deadlineTag || "").trim().toLowerCase();
  const description = String(event?.description || "");

  if (eventTag === "lịch trình") return true;
  if (eventType === "other" && /⏰/.test(description)) return true;
  return false;
};

// --- HELPER: Tính điểm hệ 4 từ hệ 10 ---
const convertToGPA4 = (score10) => {
  if (score10 >= 8.5) return 4.0;
  if (score10 >= 7.8) return 3.5;
  if (score10 >= 7.0) return 3.0;
  if (score10 >= 6.3) return 2.5;
  if (score10 >= 5.5) return 2.0;
  if (score10 >= 4.8) return 1.5;
  if (score10 >= 4.0) return 1.0;
  if (score10 >= 3.0) return 0.5;
  return 0;
};

// --- COMPONENT: MODAL NHẬP MỤC TIÊU TÍN CHỈ ---
const EditTargetModal = ({
  isOpen,
  onClose,
  currentTarget,
  username,
  onSuccess,
}) => {
  const [val, setVal] = useState(currentTarget);
  useEffect(() => {
    setVal(currentTarget);
  }, [currentTarget]);
  const handleSave = async () => {
    try {
      const res = await fetch("/api/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, totalTargetCredits: val }),
      });
      const data = await res.json();
      if (data.success) {
        const user = JSON.parse(localStorage.getItem("user"));
        user.totalTargetCredits = val;
        localStorage.setItem("user", JSON.stringify(user));
        onSuccess(val);
        onClose();
      }
    } catch (e) {
      console.error(e);
      alert("Lỗi cập nhật");
    }
  };
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <Target size={20} className="text-blue-600 dark:text-blue-400" /> Mục
          tiêu tín chỉ
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Nhập tổng số tín chỉ chương trình đào tạo của bạn.
        </p>
        <div className="relative mb-6">
          <input
            type="number"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            className="w-full p-3 pl-4 pr-12 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-xl"
          />
          <span className="absolute right-4 top-3.5 text-gray-400 dark:text-gray-500 font-medium text-sm">
            TC
          </span>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 font-bold"
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 font-bold shadow-lg"
          >
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
};

// --- MAIN DASHBOARD ---
const Dashboard = ({ user, darkMode, setDarkMode }) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [chartData, setChartData] = useState([]);
  const [totalStudyMinutes, setTotalStudyMinutes] = useState(0);

  // State Deadline
  const [deadlines, setDeadlines] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDeadline, setEditingDeadline] = useState(null);
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [isDeadlineExpanded, setIsDeadlineExpanded] = useState(false);
  const deadlineToggleLocksRef = useRef(new Set());
  const [togglingTasks, setTogglingTasks] = useState(new Set());

  // State GPA & Credits
  const [gpaMetrics, setGpaMetrics] = useState({
    current: 0.0,
    last: 0.0,
    diff: 0.0,
    totalCredits: 0,
    passedSubjects: 0,
  });

  const [targetCredits, setTargetCredits] = useState(
    user?.totalTargetCredits || 150
  );

  // --- 1. LOAD DỮ LIỆU ---
  useEffect(() => {
    if (user) {
      loadStats();
      loadDeadlines();
      loadGpaData();
      setTargetCredits(user.totalTargetCredits || 150);
    }
  }, [user]);

  const resolveActiveUsername = (task = null) => {
    const fromTask = String(task?.username || "").trim();
    if (fromTask) return fromTask;

    const fromUserProp = String(user?.username || "").trim();
    if (fromUserProp) return fromUserProp;

    if (typeof window !== "undefined") {
      try {
        const storedUser = JSON.parse(localStorage.getItem("user") || "null");
        const fromStorage = String(storedUser?.username || "").trim();
        if (fromStorage) return fromStorage;
      } catch (error) {
        console.warn("Không thể đọc username từ localStorage:", error);
      }
    }

    return "";
  };

  const loadStats = () => {
    studyService.getStats(user.username).then((res) => {
      if (res.success) {
        let totalMinutes = 0;
        const formattedData = res.data.map((item) => {
          totalMinutes += item.minutes;
          return {
            name: item.name,
            hours: parseFloat((item.minutes / 60).toFixed(1)),
          };
        });
        setChartData(formattedData);
        setTotalStudyMinutes(totalMinutes);
      }
    });
  };

  const loadDeadlines = async () => {
    try {
      const res = await fetch(`/api/events?username=${user.username}`);
      const data = await res.json();
      if (data.success) {
        const sorted = data.events
          .filter((event) => !isScheduleOnlyEvent(event))
          .sort((a, b) => new Date(a.date) - new Date(b.date));
        setDeadlines(sorted);
      }
    } catch (error) {
      console.error("Lỗi tải deadline:", error);
    }
  };

  const loadGpaData = async () => {
    try {
      const res = await fetch(`/api/gpa?username=${user.username}`);
      const data = await res.json();
      if (data.success && data.semesters && data.semesters.length > 0) {
        calculateGpaMetrics(data.semesters);
      }
    } catch (error) {
      console.error("Lỗi tải GPA:", error);
    }
  };

  const calculateGpaMetrics = (semesters) => {
    let totalCreditsAccumulated = 0;
    let totalSubjectsPassed = 0;
    const roundScore10 = (score) =>
      Math.round((score + Number.EPSILON) * 10) / 10;
    const semesterGPAs = [];

    semesters.forEach((sem) => {
      let semTotalScore = 0;
      let semTotalCredits = 0;
      if (sem.subjects) {
        sem.subjects.forEach((sub) => {
          let weightedScore10 = 0;
          let totalWeight = 0;
          if (sub.components && sub.components.length > 0) {
            sub.components.forEach((comp) => {
              if (
                comp.score === "" ||
                comp.score === null ||
                comp.score === undefined
              ) {
                return;
              }

              const score = parseFloat(comp.score);
              const weight = parseFloat(comp.weight);
              if (!isNaN(score) && !isNaN(weight)) {
                weightedScore10 += score * (weight / 100);
                totalWeight += weight;
              }
            });
          }
          if (totalWeight >= 99.9) {
            const finalScore10 = roundScore10(weightedScore10);
            const subScore4 = convertToGPA4(finalScore10);
            const credits = parseFloat(sub.credits) || 0;

            semTotalScore += subScore4 * credits;
            semTotalCredits += credits;

            totalCreditsAccumulated += credits;

            const isPassed =
              sub.type === "major" ? finalScore10 >= 5.5 : finalScore10 >= 4.0;
            if (isPassed) {
              totalSubjectsPassed += 1;
            }
          }
        });
      }
      const semGpa = semTotalCredits > 0 ? semTotalScore / semTotalCredits : 0;
      semesterGPAs.push({ gpa: semGpa, credits: semTotalCredits });
    });

    const gradedSemesterGPAs = semesterGPAs
      .filter((semester) => semester.credits > 0)
      .map((semester) => semester.gpa);

    const currentSemesterGpa =
      gradedSemesterGPAs.length > 0
        ? gradedSemesterGPAs[gradedSemesterGPAs.length - 1]
        : 0;

    const previousSemesterGpa =
      gradedSemesterGPAs.length > 1
        ? gradedSemesterGPAs[gradedSemesterGPAs.length - 2]
        : 0;

    const diff = currentSemesterGpa - previousSemesterGpa;

    setGpaMetrics({
      current: currentSemesterGpa.toFixed(2),
      last: previousSemesterGpa.toFixed(2),
      diff: diff.toFixed(2),
      totalCredits: totalCreditsAccumulated,
      passedSubjects: totalSubjectsPassed,
    });
  };

  const handleDeleteDeadline = async (id) => {
    try {
      const res = await fetch(
        `/api/events/${id}?username=${user.username}`,
        {
          method: "DELETE",
        }
      );
      const data = await res.json();
      if (data.success) {
        loadDeadlines();
        toast.success("Đã xóa xong!", {
          position: isMobileViewport() ? "bottom-center" : "top-center",
        });
      }
    } catch (error) {
      console.error(error);
      toast.error("Lỗi khi xóa!", {
        position: isMobileViewport() ? "bottom-center" : "top-center",
      });
    }
  };

  const handleToggleDeadline = async (task) => {
    const taskId = String(task?._id || "");
    if (!taskId) return;

    const activeUsername = resolveActiveUsername(task);
    if (!activeUsername) {
      toast.error("Thiếu thông tin đăng nhập. Vui lòng đăng nhập lại.", {
        position: isMobileViewport() ? "bottom-center" : "top-center",
      });
      return;
    }

    if (deadlineToggleLocksRef.current.has(taskId)) {
      console.log("Toggle locked for task:", taskId);
      return;
    }

    deadlineToggleLocksRef.current.add(taskId);
    setTogglingTasks((prev) => new Set([...prev, taskId]));
    console.log("Toggling task:", taskId, "Current isDone:", task.isDone);

    const previousIsDone = Boolean(task.isDone);
    const nextIsDone = !previousIsDone;

    setDeadlines((prevDeadlines) =>
      prevDeadlines.map((d) =>
        d._id === task._id ? { ...d, isDone: nextIsDone } : d
      )
    );

    try {
      console.log(
        "Sending toggle request payload:",
        JSON.stringify(
          {
            id: task._id,
            username: activeUsername,
            isDone: nextIsDone,
          },
          null,
          2
        )
      );

      const res = await fetch("/api/events/toggle", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: task._id,
          username: activeUsername,
          isDone: nextIsDone,
        }),
      });

      console.log("Response status:", res.status, res.statusText);
      const data = await res.json();

      console.log("Toggle API response:", JSON.stringify(data, null, 2));

      if (!data?.success) {
        console.log("API failed, rolling back. Message:", data?.message);
        setDeadlines((prevDeadlines) =>
          prevDeadlines.map((d) =>
            d._id === task._id ? { ...d, isDone: previousIsDone } : d
          )
        );
        toast.error(data?.message || "Không thể cập nhật trạng thái", {
          position: isMobileViewport() ? "bottom-center" : "top-center",
        });
      } else {
        console.log("Toggle successful");
      }
    } catch (error) {
      console.error("Error toggling deadline:", error);
      setDeadlines((prevDeadlines) =>
        prevDeadlines.map((d) =>
          d._id === task._id ? { ...d, isDone: previousIsDone } : d
        )
      );
      toast.error("Lỗi kết nối", {
        position: isMobileViewport() ? "bottom-center" : "top-center",
      });
    } finally {
      setTimeout(() => {
        deadlineToggleLocksRef.current.delete(taskId);
        setTogglingTasks((prev) => {
          const newSet = new Set(prev);
          newSet.delete(taskId);
          return newSet;
        });
        console.log("Lock released for task:", taskId);
      }, 500);
    }
  };

  const handleEditDeadline = (task) => {
    setEditingDeadline(task);
    setIsModalOpen(true);
  };

  const isIncrease = parseFloat(gpaMetrics.diff) >= 0;

  const prioritizedDeadlines = useMemo(() => {
    return [...deadlines].sort((a, b) => {
      if (Boolean(a.isDone) !== Boolean(b.isDone)) return a.isDone ? 1 : -1;
      return new Date(a.date) - new Date(b.date);
    });
  }, [deadlines]);

  return (
    <div className="space-y-6 sm:space-y-8 pb-10 overflow-x-hidden">
      {/* 1. WELCOME SECTION */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-800 dark:text-white">
            Xin chào,{" "}
            <span className="text-blue-600 dark:text-blue-400">
              {user?.fullName || "Sinh viên"}
            </span>{" "}
            👋
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium flex items-center gap-2">
            <Calendar size={18} className="text-primary dark:text-blue-400" />
            {getVNDate()}
          </p>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full md:w-auto bg-primary text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-200 dark:shadow-blue-900/30 hover:bg-blue-800 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            + Thêm Deadline
          </button>
        </div>
      </div>

      {/* 2. NAVIGATION TABS */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 sm:gap-3">
          {[
            { id: "overview", label: "Tổng quan", icon: GraduationCap },
            { id: "exams", label: "Lịch trình hôm nay", icon: FileText },
            { id: "documents", label: "Ghi chú nhanh", icon: StickyNote },
            { id: "flashcards", label: "Flashcard", icon: Layers },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-bold transition-all ${
                activeTab === tab.id
                  ? "text-white"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              {activeTab === tab.id && (
                <motion.span
                  layoutId="dashboard-liquid-tab"
                  className="absolute inset-0 rounded-xl bg-primary dark:bg-blue-600"
                  transition={{ type: "spring", stiffness: 360, damping: 30, mass: 0.7 }}
                />
              )}
              <span className="relative z-10">
                <tab.icon size={18} />
              </span>
              <span className="relative z-10">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. CONTENT AREA */}
      {activeTab === "overview" && (
        <DashboardOverviewTab
          gpaMetrics={gpaMetrics}
          targetCredits={targetCredits}
          isIncrease={isIncrease}
          chartData={chartData}
          totalStudyMinutes={totalStudyMinutes}
          deadlines={deadlines}
          togglingTasks={togglingTasks}
          onToggleDeadline={handleToggleDeadline}
          onEditDeadline={handleEditDeadline}
          onDeleteDeadline={handleDeleteDeadline}
          onOpenTargetModal={() => setIsTargetModalOpen(true)}
          onOpenDeadlineExpanded={() => setIsDeadlineExpanded(true)}
        />
      )}

      {activeTab === "documents" && <DashboardNotesTab user={user} />}

      {activeTab === "exams" && <DashboardScheduleTab user={user} />}

      {activeTab === "flashcards" && <DashboardFlashcardTab />}

      <AddDeadlineModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingDeadline(null);
        }}
        onSuccess={loadDeadlines}
        username={user?.username}
        mode={editingDeadline ? "edit" : "create"}
        initialData={editingDeadline}
      />

      <DeadlineExpandedSection
        isOpen={isDeadlineExpanded}
        onClose={() => setIsDeadlineExpanded(false)}
        deadlines={prioritizedDeadlines}
        onCreateClick={() => {
          setEditingDeadline(null);
          setIsModalOpen(true);
        }}
        onDelete={handleDeleteDeadline}
        onToggle={handleToggleDeadline}
        onEdit={handleEditDeadline}
      />

      <EditTargetModal
        isOpen={isTargetModalOpen}
        onClose={() => setIsTargetModalOpen(false)}
        currentTarget={targetCredits}
        username={user?.username}
        onSuccess={setTargetCredits}
      />
    </div>
  );
};

export default Dashboard;
