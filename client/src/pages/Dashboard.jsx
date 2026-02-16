import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { studyService } from "../services/studyService";
import AddDeadlineModal from "../components/AddDeadlineModal";
import {
  BookOpen,
  Clock,
  Calendar,
  Layers,
  FileText,
  Library,
  GraduationCap,
  TrendingUp,
  ArrowDown,
  Trash2,
  Edit2,
  Target,
  CheckCircle,
  AlertCircle,
  Plus,
  StickyNote,
  Bell,
  CheckSquare,
  X,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Smile,
  Save,
  Moon,
  Sun,
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

// --- CẤU HÌNH GIỜ HỌC (Mapping Tiết -> Giờ bắt đầu) ---
const PERIOD_START_TIMES = {
  1: "07:00",
  2: "07:50",
  3: "09:00",
  4: "09:50",
  5: "10:40",
  6: "13:00",
  7: "13:50",
  8: "15:00",
  9: "15:50",
  10: "16:40",
  11: "17:30",
  12: "18:20", // Thêm tiết tối nếu cần
};

// Hàm lấy tên thứ hiện tại (Khớp với format trong Database: "2", "3"... hoặc "CN")
const getCurrentDayString = () => {
  const days = ["CN", "2", "3", "4", "5", "6", "7"];
  return days[new Date().getDay()];
};

// ... (GIỮ NGUYÊN CÁC HELPER CŨ: getVNDate, formatDeadlineTime, convertToGPA4, EditTargetModal, ResourceCard, ChartStatBox) ...
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

// --- HELPER: Format thời gian hiển thị cho deadline ---
const formatDeadlineTime = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = date - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "Đã quá hạn";
  if (diffDays === 0)
    return `Hôm nay, ${date.getHours()}:${String(date.getMinutes()).padStart(
      2,
      "0"
    )}`;
  if (diffDays === 1)
    return `Ngày mai, ${date.getHours()}:${String(date.getMinutes()).padStart(
      2,
      "0"
    )}`;

  return (
    date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }) +
    ` lúc ${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`
  );
};

const isMobileViewport = () =>
  typeof window !== "undefined" && window.innerWidth < 640;

const getConfirmToastOptions = () => ({
  position: isMobileViewport() ? "bottom-center" : "top-center",
  duration: Infinity,
});

// --- HELPER: Tính điểm hệ 4 từ hệ 10 ---
const convertToGPA4 = (score10) => {
  if (score10 >= 8.5) return 4.0;
  if (score10 >= 8.0) return 3.5;
  if (score10 >= 7.0) return 3.0;
  if (score10 >= 6.5) return 2.5;
  if (score10 >= 5.5) return 2.0;
  if (score10 >= 5.0) return 1.5;
  if (score10 >= 4.0) return 1.0;
  return 0;
};

// --- COMPONENT: MODAL NHẬP MỤC TIÊU TÍN CHỈ (GIỮ NGUYÊN) ---
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

// --- HELPER COMPONENT: STAT BOX (GIỮ NGUYÊN) ---
const ChartStatBox = ({
  label,
  value,
  subLabel,
  icon: Icon,
  color,
  onClick,
}) => (
  <div
    onClick={onClick}
    className={`relative p-3 rounded-xl border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center text-center transition-all ${
      onClick
        ? "bg-blue-50/50 dark:bg-blue-900/20 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-200 dark:hover:border-blue-700 group"
        : "bg-gray-50 dark:bg-gray-800 hover:bg-white dark:hover:bg-gray-750 hover:shadow-sm"
    }`}
  >
    {onClick && (
      <div className="absolute top-1.5 right-1.5 text-blue-200 dark:text-blue-700 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
        <Edit2 size={12} />
      </div>
    )}
    <div className={`mb-1 ${color}`}>
      <Icon size={18} />
    </div>
    <span className="text-lg font-bold text-gray-800 dark:text-white leading-none">
      {value}
    </span>
    <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium uppercase mt-1">
      {label}
    </span>
    {subLabel && (
      <span className="text-[10px] text-gray-400 dark:text-gray-500">
        {subLabel}
      </span>
    )}
  </div>
);

// --- NEW COMPONENT: TAB GHI CHÚ NHANH (ĐÃ UPDATE CHECKBOX & DELETE) ---
const QuickNotesTab = ({ user }) => {
  const [myNotes, setMyNotes] = useState([]);
  const [timetableNotes, setTimetableNotes] = useState([]);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");

  useEffect(() => {
    if (user) {
      fetchMyNotes();
      fetchTimetableNotes();
    }
  }, [user]);

  // 1. Fetch Note Cá Nhân
  const fetchMyNotes = async () => {
    try {
      const res = await fetch(`/api/quick-notes?username=${user.username}`);
      if (!res.ok) {
        if (res.status === 404) {
          console.warn("Quick notes API not found (404).");
          return;
        }
        throw new Error(`QUICK_NOTES_${res.status}`);
      }
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("QUICK_NOTES_INVALID_CONTENT");
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.notes)) setMyNotes(data.notes);
    } catch (e) {
      console.error("Fetch quick notes error:", e);
    }
  };

  // 2. Fetch Note Từ Thời Khóa Biểu
  const fetchTimetableNotes = async () => {
    try {
      const res = await fetch(`/api/timetable?username=${user.username}`);
      const data = await res.json();
      if (data.success) {
        const notes = [];
        data.timetable.forEach((cls) => {
          if (cls.notes && cls.notes.length > 0) {
            cls.notes.forEach((note) => {
              notes.push({
                ...note,
                subject: cls.subject,
                room: cls.room,
                classId: cls._id, // Cần ID lớp để update
              });
            });
          }
        });
        // Sắp xếp: Chưa xong lên đầu, deadline gần lên đầu
        notes.sort((a, b) => {
          if (a.isDone === b.isDone) {
            return (
              new Date(a.deadline || "2099-12-31") -
              new Date(b.deadline || "2099-12-31")
            );
          }
          return a.isDone ? 1 : -1;
        });
        setTimetableNotes(notes);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // --- HANDLERS CHO NOTE CÁ NHÂN ---
  const handleAddNote = async () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    try {
      const res = await fetch("/api/quick-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: user.username,
          title: newTitle,
          content: newContent,
          color: "bg-yellow-100",
        }),
      });
      if (!res.ok) throw new Error(`QUICK_NOTES_${res.status}`);
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("QUICK_NOTES_INVALID_CONTENT");
      }
      const data = await res.json();
      if (data.success) {
        setNewTitle("");
        setNewContent("");
        fetchMyNotes();
      }
    } catch (e) {
      console.error("Add quick note error:", e);
    }
  };

  const handleDeleteNote = (id) => {
    toast.custom(
      (t) => (
        <div className="w-[calc(100vw-1rem)] sm:w-full sm:max-w-[360px] bg-white dark:bg-gray-800 p-4 sm:p-5 rounded-t-2xl sm:rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 flex flex-col items-center text-center animate-in fade-in zoom-in duration-300">
          {/* 1. Tiêu đề ngắn gọn */}
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Xóa ghi chú?
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4 leading-relaxed">
            Hành động này không thể hoàn tác.
          </p>

          {/* 2. Nút bấm nhỏ gọn */}
          <div className="flex w-full flex-col-reverse sm:flex-row gap-2 sm:gap-3">
            {/* Nút Hủy */}
            <button
              onClick={() => toast.dismiss(t)}
                className="w-full flex-1 py-3 sm:py-2 px-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-semibold rounded-lg transition-colors"
            >
              Hủy
            </button>

            {/* Nút Xóa */}
            <button
              onClick={async () => {
                toast.dismiss(t); // Đóng hộp thoại
                try {
                  const res = await fetch(
                    `/api/quick-notes/${id}?username=${user.username}`,
                    { method: "DELETE" }
                  );
                  if (!res.ok) throw new Error(`QUICK_NOTES_${res.status}`);
                  const contentType = res.headers.get("content-type") || "";
                  if (!contentType.includes("application/json")) {
                    throw new Error("QUICK_NOTES_INVALID_CONTENT");
                  }
                  const data = await res.json();

                  if (data.success) {
                    fetchMyNotes(); // Load lại danh sách ghi chú
                    toast.success("Đã dọn dẹp ghi chú!", {
                      position: "top-center",
                    });
                  }
                } catch (e) {
                  console.error(e);
                  toast.error("Lỗi hệ thống, thử lại sau!", {
                    position: "top-center",
                  });
                }
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

  // --- [MỚI] HANDLERS CHO NOTE TKB ---
  const handleToggleTimetableNote = async (note) => {
    // Optimistic UI Update (Cập nhật giao diện ngay lập tức cho mượt)
    const newNotes = timetableNotes.map((n) =>
      n.id === note.id && n.classId === note.classId
        ? { ...n, isDone: !n.isDone }
        : n
    );
    // Sort lại sau khi toggle
    newNotes.sort((a, b) => (a.isDone === b.isDone ? 0 : a.isDone ? 1 : -1));
    setTimetableNotes(newNotes);

    try {
      await fetch("/api/timetable/update-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: note.classId,
          username: user.username,
          action: "toggle",
          note: { id: note.id },
        }),
      });
    } catch (e) {
      console.error(e);
      fetchTimetableNotes(); /* Revert nếu lỗi */
    }
  };

  const handleDeleteTimetableNote = (note) => {
    toast.custom(
      (t) => (
        <div className="w-[calc(100vw-1rem)] sm:w-full sm:max-w-[360px] bg-white dark:bg-gray-800 p-4 sm:p-5 rounded-t-2xl sm:rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 flex flex-col items-center text-center animate-in fade-in zoom-in duration-300">
          {/* 1. Tiêu đề ngắn gọn */}
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Xóa nhắc nhở?
          </h3>

          {/* 2. Mô tả chứa tên môn học được in đậm */}
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4 leading-relaxed">
            Nhắc nhở môn{" "}
            <span className="font-bold text-gray-700 dark:text-gray-300">
              {note.subject}
            </span>{" "}
            sẽ bị xóa vĩnh viễn.
          </p>

          {/* 3. Nút bấm nhỏ gọn (Compact) */}
          <div className="flex w-full flex-col-reverse sm:flex-row gap-2 sm:gap-3">
            {/* Nút Hủy */}
            <button
              onClick={() => toast.dismiss(t)}
                className="w-full flex-1 py-3 sm:py-2 px-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-semibold rounded-lg transition-colors"
            >
              Hủy
            </button>

            {/* Nút Xóa */}
            <button
              onClick={async () => {
                toast.dismiss(t);

                // Optimistic UI: Xóa ngay trên giao diện trước
                setTimetableNotes(
                  timetableNotes.filter((n) => n.id !== note.id)
                );

                try {
                  await fetch("/api/timetable/update-note", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      classId: note.classId,
                      username: user.username,
                      action: "delete",
                      note: { id: note.id },
                    }),
                  });
                  toast.success("Đã xóa nhắc nhở thành công!", {
                    position: "top-center",
                  });
                } catch (e) {
                  console.error(e);
                  fetchTimetableNotes(); // Lỗi thì load lại dữ liệu cũ
                  toast.error("Lỗi kết nối, đã khôi phục lại dữ liệu!", {
                    position: "top-center",
                  });
                }
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 animate-fade-in-up overflow-x-hidden">
      {/* CỘT TRÁI: GHI CHÚ CÁ NHÂN (MÀU VÀNG) */}
      <div>
        <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <StickyNote className="text-yellow-500 dark:text-yellow-400" /> Ghi
          chú của tôi
        </h3>

        {/* Form thêm note */}
        <div className="bg-yellow-50/50 dark:bg-yellow-900/20 p-4 rounded-xl border border-yellow-200 dark:border-yellow-700 mb-6 shadow-sm">
          <input
            className="w-full bg-transparent font-bold text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none mb-2"
            placeholder="Tiêu đề (VD: Mua giáo trình)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <textarea
            className="w-full bg-transparent text-sm text-gray-600 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 outline-none resize-none h-36 sm:h-24"
            placeholder="Nội dung ghi chú..."
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={handleAddNote}
              className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 px-4 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
            >
              <Plus size={14} /> Thêm
            </button>
          </div>
        </div>

        {/* Danh sách note */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {myNotes.map((note) => (
            <div
              key={note._id}
              className="group relative bg-yellow-100 dark:bg-yellow-900/30 p-4 rounded-xl shadow-sm border border-yellow-200 dark:border-yellow-700 hover:shadow-md transition-all hover:-translate-y-1"
            >
              <button
                onClick={() => handleDeleteNote(note._id)}
                className="absolute top-2 right-2 text-yellow-600 dark:text-yellow-500 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Xóa"
              >
                <Trash2 size={14} />
              </button>
              <h4 className="font-bold text-gray-800 dark:text-white mb-1">
                {note.title}
              </h4>
              <p
                className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap leading-relaxed font-medium"
                style={{ fontFamily: '"Comic Sans MS", cursive, sans-serif' }}
              >
                {note.content}
              </p>
              <p className="text-[10px] text-yellow-600 dark:text-yellow-500 mt-3 text-right">
                {new Date(note.createdAt).toLocaleDateString("vi-VN")}
              </p>
            </div>
          ))}
          {myNotes.length === 0 && (
            <div className="col-span-full text-center py-10 text-gray-400 dark:text-gray-500 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
              Chưa có ghi chú nào.
            </div>
          )}
        </div>
      </div>

      {/* CỘT PHẢI: GHI CHÚ TỪ THỜI KHÓA BIỂU (MÀU XANH) */}
      <div>
        <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <Bell className="text-blue-500 dark:text-blue-400" /> Nhắc nhở từ Thời
          khóa biểu
        </h3>

        <div className="space-y-4">
          {timetableNotes.length > 0 ? (
            timetableNotes.map((note, idx) => (
              <div
                key={idx}
                className={`group relative bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-l-4 transition-all hover:shadow-md ${
                  note.isDone
                    ? "border-l-green-500 opacity-60 bg-gray-50 dark:bg-gray-750"
                    : "border-l-blue-500 dark:border-l-blue-400"
                }`}
              >
                {/* Nút Xóa (Hiện khi Hover) */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteTimetableNote(note);
                  }}
                  className="absolute top-2 right-2 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all z-10 p-1"
                  title="Xóa nhắc nhở này"
                >
                  <Trash2 size={16} />
                </button>

                <div className="flex gap-4 items-start">
                  {/* Checkbox */}
                  <div className="pt-1">
                    <input
                      type="checkbox"
                      checked={note.isDone || false}
                      onChange={() => handleToggleTimetableNote(note)}
                      className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                    />
                  </div>

                  {/* Nội dung */}
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => handleToggleTimetableNote(note)}
                  >
                    <div className="flex justify-between items-start pr-6">
                      <h4
                        className={`font-bold text-sm ${
                          note.isDone
                            ? "text-gray-500 dark:text-gray-400 line-through"
                            : "text-gray-800 dark:text-white"
                        }`}
                      >
                        {note.subject}
                      </h4>
                    </div>
                    <p
                      className={`text-sm mt-1 ${
                        note.isDone
                          ? "text-gray-400 dark:text-gray-500"
                          : "text-gray-600 dark:text-gray-300"
                      }`}
                    >
                      {note.content}
                    </p>

                    {note.deadline && (
                      <p
                        className={`text-xs mt-2 flex items-center gap-1 font-medium ${
                          !note.isDone && new Date(note.deadline) < new Date()
                            ? "text-red-600 dark:text-red-400"
                            : "text-gray-400 dark:text-gray-500"
                        }`}
                      >
                        <Clock size={12} />
                        {!note.isDone && new Date(note.deadline) < new Date()
                          ? "Đã quá hạn: "
                          : "Hạn: "}
                        {new Date(note.deadline).toLocaleDateString("vi-VN")}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-10 text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
              Không có ghi chú nào trong các môn học.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- NEW COMPONENT: TAB FLASHCARD (HỌC TỪ VỰNG) ---
const FlashcardTab = () => {
  const STORAGE_KEY = "whalio_flashcard_decks";
  const [decks, setDecks] = useState([]);
  const [view, setView] = useState("list"); // 'list' | 'study' | 'create'

  // State cho chế độ học
  const [currentDeck, setCurrentDeck] = useState(null);
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // State cho chế độ tạo
  const [newDeckTitle, setNewDeckTitle] = useState("");
  const [newDeckColor, setNewDeckColor] = useState("blue");
  const [newCards, setNewCards] = useState([
    { term: "", def: "" },
    { term: "", def: "" },
    { term: "", def: "" },
  ]);

  // Load dữ liệu khi vào Tab
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setDecks(JSON.parse(stored));
    } else {
      // Dữ liệu mẫu (Lấy từ flashcard.js cũ)
      const defaultDecks = [
        {
          id: 1,
          title: "Tiếng Anh Cơ Bản",
          icon: "🇬🇧",
          color: "blue",
          cards: [
            { term: "Hello", def: "Xin chào" },
            { term: "Goodbye", def: "Tạm biệt" },
          ],
        },
        {
          id: 2,
          title: "Công Thức Toán",
          icon: "🔢",
          color: "green",
          cards: [
            { term: "Pythagore", def: "a² + b² = c²" },
            { term: "Hình tròn", def: "S = πr²" },
          ],
        },
      ];
      setDecks(defaultDecks);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultDecks));
    }
  }, []);

  // --- LOGIC HỌC ---
  const startStudy = (deck) => {
    if (!deck.cards || deck.cards.length === 0)
      return alert("Bộ này chưa có thẻ nào!");
    setCurrentDeck(deck);
    setCardIndex(0);
    setIsFlipped(false);
    setView("study");
  };

  const nextCard = () => {
    if (cardIndex < currentDeck.cards.length - 1) {
      setIsFlipped(false);
      setTimeout(() => setCardIndex((prev) => prev + 1), 150); // Delay nhẹ cho mượt
    }
  };

  const prevCard = () => {
    if (cardIndex > 0) {
      setIsFlipped(false);
      setTimeout(() => setCardIndex((prev) => prev - 1), 150);
    }
  };

  // --- LOGIC TẠO MỚI ---
  const handleAddCardRow = () =>
    setNewCards([...newCards, { term: "", def: "" }]);
  const handleRemoveCardRow = (idx) =>
    setNewCards(newCards.filter((_, i) => i !== idx));

  const handleCardChange = (idx, field, value) => {
    const updated = [...newCards];
    updated[idx][field] = value;
    setNewCards(updated);
  };

  const saveDeck = () => {
    if (!newDeckTitle.trim()) return alert("Vui lòng nhập tên bộ thẻ!");
    const validCards = newCards.filter((c) => c.term.trim() && c.def.trim());
    if (validCards.length === 0)
      return alert("Cần ít nhất 1 thẻ đầy đủ thông tin!");

    const newDeck = {
      id: Date.now(),
      title: newDeckTitle,
      icon: "📝", // Mặc định icon
      color: newDeckColor,
      cards: validCards,
    };

    const updatedDecks = [...decks, newDeck];
    setDecks(updatedDecks);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedDecks));

    // Reset form
    setNewDeckTitle("");
    setNewCards([
      { term: "", def: "" },
      { term: "", def: "" },
    ]);
    setView("list");
  };

  const deleteDeck = (id) => {
    toast.custom(
      (t) => (
        <div className="w-[calc(100vw-1rem)] sm:w-full sm:max-w-[360px] bg-white dark:bg-gray-800 p-4 sm:p-5 rounded-t-2xl sm:rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 flex flex-col items-center text-center animate-in fade-in zoom-in duration-300">
          {/* 1. Tiêu đề & Nội dung */}
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Xóa bộ thẻ?
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4 leading-relaxed">
            Dữ liệu học tập của bộ này sẽ bị xóa vĩnh viễn.
          </p>

          {/* 2. Hai nút nằm ngang (Compact style) */}
          <div className="flex w-full flex-col-reverse sm:flex-row gap-2 sm:gap-3">
            {/* Nút Hủy */}
            <button
              onClick={() => toast.dismiss(t)}
              className="w-full flex-1 py-3 sm:py-2 px-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-semibold rounded-lg transition-colors"
            >
              Hủy
            </button>

            {/* Nút Xóa */}
            <button
              onClick={() => {
                toast.dismiss(t); // Đóng hộp thoại
                // Logic xóa cũ của ông
                const updated = decks.filter((d) => d.id !== id);
                setDecks(updated);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
                toast.success("Đã xóa bộ thẻ thành công!", {
                  position: isMobileViewport() ? "bottom-center" : "top-center",
                });
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

  // Mapping màu sắc
  const colorMap = {
    blue: "bg-blue-50 text-blue-600 border-blue-200",
    green: "bg-green-50 text-green-600 border-green-200",
    purple: "bg-purple-50 text-purple-600 border-purple-200",
    red: "bg-red-50 text-red-600 border-red-200",
    orange: "bg-orange-50 text-orange-600 border-orange-200",
  };

  return (
    <div className="animate-fade-in-up">
      {/* VIEW 1: DANH SÁCH DECK */}
      {view === "list" && (
        <>
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-bold text-gray-800 dark:text-white text-xl flex items-center gap-2">
                <Layers className="text-blue-600 dark:text-blue-400" />{" "}
                Flashcard của tôi
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Luyện tập trí nhớ với phương pháp lặp lại.
              </p>
            </div>
            <button
              onClick={() => setView("create")}
              className="w-full sm:w-auto bg-gray-900 dark:bg-gray-700 hover:bg-black dark:hover:bg-gray-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-lg flex items-center justify-center gap-2"
            >
              <Plus size={16} /> Tạo bộ mới
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {decks.map((deck) => (
              <div
                key={deck.id}
                onClick={() => startStudy(deck)}
                className={`relative p-6 rounded-2xl border cursor-pointer hover:shadow-md transition-all hover:-translate-y-1 group bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                      colorMap[deck.color] || colorMap.blue
                    }`}
                  >
                    {deck.icon || "📝"}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteDeck(deck.id);
                    }}
                    className="p-2 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <h4 className="font-bold text-gray-800 dark:text-white text-lg mb-1">
                  {deck.title}
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                  {deck.cards?.length || 0} thẻ thuật ngữ
                </p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* VIEW 2: CHẾ ĐỘ HỌC (STUDY MODAL) */}
      {view === "study" && currentDeck && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4">
          <div className="bg-white w-[95vw] h-[92vh] sm:h-[88vh] lg:w-full lg:max-w-2xl rounded-2xl lg:rounded-3xl p-4 sm:p-5 lg:p-6 shadow-2xl relative flex flex-col lg:h-[500px]">
            {/* Header */}
            <div className="flex justify-between items-center gap-3 mb-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setView("list")}
                  className="p-2.5 sm:p-2 hover:bg-gray-100 rounded-full text-gray-500"
                >
                  <X size={22} />
                </button>
                <div>
                  <h3 className="font-bold text-gray-800 text-sm sm:text-base">
                    {currentDeck.title}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {cardIndex + 1} / {currentDeck.cards.length}
                  </p>
                </div>
              </div>
              <div className="w-24 sm:w-1/3 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{
                    width: `${
                      ((cardIndex + 1) / currentDeck.cards.length) * 100
                    }%`,
                  }}
                ></div>
              </div>
            </div>

            {/* Card Area */}
            <div
              className="flex-1 [perspective:1000px] relative group cursor-pointer"
              onClick={() => setIsFlipped(!isFlipped)}
            >
              {/* Container lật 3D */}
              <div
                className={`w-full h-full absolute inset-0 transition-all duration-500 [transform-style:preserve-3d] ${
                  isFlipped ? "[transform:rotateY(180deg)]" : ""
                }`}
              >
                {/* --- MẶT TRƯỚC (Front) --- */}
                <div className="absolute inset-0 bg-blue-50 rounded-2xl border-2 border-blue-100 flex flex-col items-center justify-center p-5 sm:p-8 [backface-visibility:hidden] shadow-inner">
                  <span className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-4">
                    Thuật ngữ
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 text-center select-none">
                    {currentDeck.cards[cardIndex].term}
                  </h2>
                  <p className="absolute bottom-6 text-gray-400 text-xs flex items-center gap-1 animate-pulse">
                    <RotateCw size={12} /> Chạm để lật
                  </p>
                </div>

                {/* --- MẶT SAU (Back) --- */}
                <div className="absolute inset-0 bg-white rounded-2xl border-2 border-gray-100 flex flex-col items-center justify-center p-5 sm:p-8 [backface-visibility:hidden] [transform:rotateY(180deg)] shadow-inner">
                  <span className="text-xs font-bold text-green-500 uppercase tracking-widest mb-4">
                    Định nghĩa
                  </span>
                  <h2 className="text-xl sm:text-2xl font-medium text-gray-700 text-center leading-relaxed select-none">
                    {currentDeck.cards[cardIndex].def}
                  </h2>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex justify-between items-center mt-6 px-1 sm:px-10">
              <button
                onClick={prevCard}
                disabled={cardIndex === 0}
                className="p-4 sm:p-4 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-30 transition-all"
              >
                <ChevronLeft size={28} />
              </button>
              <button
                onClick={() => setIsFlipped(!isFlipped)}
                className="p-5 sm:p-4 rounded-full bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all transform active:scale-90"
              >
                <RotateCw size={28} />
              </button>
              <button
                onClick={nextCard}
                disabled={cardIndex === currentDeck.cards.length - 1}
                className="p-4 sm:p-4 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-30 transition-all"
              >
                <ChevronRight size={28} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: TẠO BỘ THẺ MỚI */}
      {view === "create" && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="font-bold text-lg text-gray-800 dark:text-white">
              Tạo bộ Flashcard mới
            </h3>
            <button
              onClick={() => setView("list")}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-medium"
            >
              Hủy bỏ
            </button>
          </div>

          <div className="space-y-4 mb-8">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">
                Tên bộ thẻ
              </label>
              <input
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                placeholder="VD: Từ vựng Tiếng Anh Unit 1"
                value={newDeckTitle}
                onChange={(e) => setNewDeckTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">
                Màu chủ đạo
              </label>
              <div className="flex gap-3">
                {["blue", "green", "purple", "red", "orange"].map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewDeckColor(c)}
                    className={`w-8 h-8 rounded-full border-2 ${
                      newDeckColor === c
                        ? "border-gray-800 scale-110"
                        : "border-transparent"
                    } ${colorMap[c].split(" ")[0]}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {newCards.map((card, idx) => (
              <div
                key={idx}
                className="flex gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 group"
              >
                <div className="w-8 flex items-center justify-center font-bold text-gray-300">
                  {idx + 1}
                </div>
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <input
                    className="bg-white p-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400"
                    placeholder="Thuật ngữ"
                    value={card.term}
                    onChange={(e) =>
                      handleCardChange(idx, "term", e.target.value)
                    }
                  />
                  <input
                    className="bg-white p-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400"
                    placeholder="Định nghĩa"
                    value={card.def}
                    onChange={(e) =>
                      handleCardChange(idx, "def", e.target.value)
                    }
                  />
                </div>
                <button
                  onClick={() => handleRemoveCardRow(idx)}
                  className="p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-6 flex gap-4">
            <button
              onClick={handleAddCardRow}
              className="flex-1 py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 font-bold hover:bg-gray-50 hover:border-gray-300 transition-all"
            >
              + Thêm thẻ
            </button>
            <button
              onClick={saveDeck}
              className="flex-1 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Save size={18} /> Lưu bộ thẻ
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// --- NEW COMPONENT: TAB LỊCH TRÌNH HÔM NAY ---
const DailyScheduleTab = ({ user }) => {
  const [schedule, setSchedule] = useState([]);
  const [now, setNow] = useState(new Date());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false); // Modal thêm thủ công

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
      // 1. Lấy TKB và Events song song
      const [tkbRes, eventRes] = await Promise.all([
        fetch(`/api/timetable?username=${user.username}`),
        fetch(`/api/events?username=${user.username}`),
      ]);

      const tkbData = await tkbRes.json();
      const eventData = await eventRes.json();
      const todayStr = getCurrentDayString();
      const todayDateStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

      let items = [];

      // 2. Xử lý TKB (Lọc theo thứ hôm nay)
      if (tkbData.success) {
        tkbData.timetable.forEach((cls) => {
          if (cls.day === todayStr) {
            // Tính giờ bắt đầu từ Tiết
            const startTimeStr = PERIOD_START_TIMES[cls.startPeriod] || "00:00";
            const [h, m] = startTimeStr.split(":").map(Number);
            const startDate = new Date();
            startDate.setHours(h, m, 0, 0);

            // Tính giờ kết thúc (Giả sử mỗi tiết 50p)
            const endTime = new Date(
              startDate.getTime() + cls.numPeriods * 50 * 60000
            );

            items.push({
              type: "class",
              id: cls._id,
              title: cls.subject,
              location: `${cls.room} - ${cls.campus}`,
              startTime: startDate,
              endTime: endTime,
              note: `Tiết ${cls.startPeriod} - ${
                cls.startPeriod + cls.numPeriods - 1
              }`,
            });
          }
        });
      }

      // 3. Xử lý Sự kiện thủ công (Lọc theo ngày hôm nay)
      if (eventData.success) {
        eventData.events.forEach((ev) => {
          const evDate = new Date(ev.date);
          if (evDate.toISOString().split("T")[0] === todayDateStr) {
            items.push({
              type: "event",
              id: ev._id,
              title: ev.title,
              location: "Sự kiện cá nhân",
              startTime: evDate,
              endTime: new Date(evDate.getTime() + 60 * 60000), // Mặc định 1 tiếng
              note: ev.type === "deadline" ? "Deadline" : "Cá nhân",
            });
          }
        });
      }

      // 4. Sắp xếp theo giờ tăng dần
      items.sort((a, b) => a.startTime - b.startTime);
      setSchedule(items);
    } catch (e) {
      console.error("Lỗi tải lịch trình:", e);
    }
  };

  // Hàm render thẻ lịch trình
  const renderItem = (item) => {
    const diffMs = item.startTime - now;
    const diffMins = Math.floor(diffMs / 60000);
    const isHappening = now >= item.startTime && now <= item.endTime;
    const isPassed = now > item.endTime;

    // Logic trạng thái
    let statusColor = "border-l-blue-500";
    let statusText = "";
    let bgColor = "bg-white";

    if (isPassed) {
      statusColor = "border-l-gray-300";
      bgColor = "bg-gray-50 opacity-60";
      statusText = "Đã kết thúc";
    } else if (isHappening) {
      statusColor = "border-l-green-500 animate-pulse"; // Nhấp nháy nhẹ
      statusText = "Đang diễn ra";
      bgColor = "bg-green-50";
    } else if (diffMins <= 15) {
      statusColor = "border-l-red-500 animate-bounce-short"; // Rung nhẹ báo động
      statusText = `Sắp bắt đầu: Còn ${diffMins} phút!`;
      bgColor = "bg-red-50";
    } else {
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      statusText = `Còn ${hours > 0 ? hours + "h " : ""}${mins}p nữa`;
    }

    return (
      <div
        key={item.id}
        className={`p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 border-l-4 ${statusColor} ${bgColor} dark:bg-opacity-10 mb-4 transition-all flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 group`}
      >
        <div className="w-full">
          <div className="mb-1 flex items-center gap-2 font-medium text-sm text-gray-600 dark:text-gray-300">
            <Clock
              size={14}
              className={isHappening ? "text-green-600" : "text-gray-400"}
            />
            {item.startTime.toLocaleTimeString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            -{" "}
            {item.endTime.toLocaleTimeString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>

          <div className="flex items-center gap-2 mb-1">
            <h4
              className={`font-bold text-base sm:text-lg ${
                isPassed
                  ? "text-gray-500 dark:text-gray-400 line-through"
                  : "text-gray-800 dark:text-white"
              }`}
            >
              {item.title}
            </h4>
            {item.type === "event" && (
              <span className="text-[10px] bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full font-bold">
                Thủ công
              </span>
            )}
          </div>

          <div className="text-sm text-gray-600 dark:text-gray-300 flex flex-col gap-1">
            <span className="flex items-center gap-2">
              <CheckSquare size={14} className="text-gray-400" />
              {item.location}
            </span>
          </div>
        </div>

        <div className="text-left sm:text-right w-full sm:w-auto">
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full ${
              isHappening
                ? "bg-green-100 text-green-700"
                : diffMins <= 15 && !isPassed
                ? "bg-red-100 text-red-600"
                : "bg-blue-50 text-blue-600"
            } ${isPassed ? "bg-gray-200 text-gray-500" : ""}`}
          >
            {statusText}
          </span>
          <p className="text-xs text-gray-400 mt-2 italic">{item.note}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="animate-fade-in-up overflow-x-hidden">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-bold text-gray-800 dark:text-white text-xl flex items-center gap-2">
            <Calendar className="text-blue-600 dark:text-blue-400" /> Lịch trình
            hôm nay ({now.toLocaleDateString("vi-VN")})
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Hệ thống tự động cập nhật theo thời gian thực.
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="w-full sm:w-auto bg-gray-900 dark:bg-gray-700 hover:bg-black dark:hover:bg-gray-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-lg flex items-center justify-center gap-2"
        >
          + Thêm lịch
        </button>
      </div>

      {schedule.length > 0 ? (
        <div className="space-y-2">
          {schedule.map((item) => renderItem(item))}
        </div>
      ) : (
        <div className="text-center py-16 bg-gray-50 dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
          <p className="text-gray-400 dark:text-gray-500 font-medium">
            Hôm nay bạn rảnh rỗi! Không có lịch trình nào. 🎉
          </p>
        </div>
      )}

      {/* Tận dụng lại AddDeadlineModal để thêm sự kiện thủ công */}
      <AddDeadlineModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        // 👇 THÊM DÒNG NÀY ĐỂ KHÔNG BỊ LỖI KHI LƯU
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

// --- MAIN DASHBOARD ---
const Dashboard = ({ user, darkMode, setDarkMode }) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [chartData, setChartData] = useState([]);
  const [totalStudyHours, setTotalStudyHours] = useState(0);

  // State Chart Toggle
  const [chartMode, setChartMode] = useState("credit"); // 'credit' | 'study'

  // State Deadline
  const [deadlines, setDeadlines] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);

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

  // ... (GIỮ NGUYÊN CÁC HÀM: loadStats, loadDeadlines, loadGpaData, calculateGpaMetrics, handleDeleteDeadline, handleToggleDeadline) ...
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
        setTotalStudyHours((totalMinutes / 60).toFixed(1));
      }
    });
  };

  const loadDeadlines = async () => {
    try {
      const res = await fetch(`/api/events?username=${user.username}`);
      const data = await res.json();
      if (data.success) {
        const sorted = data.events.sort(
          (a, b) => new Date(a.date) - new Date(b.date)
        );
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
    let totalPointCredit = 0; // Tổng (điểm hệ 4 * tín chỉ) tích lũy
    let semesterGPAs = [];

    semesters.forEach((sem) => {
      let semTotalScore = 0;
      let semTotalCredits = 0;
      if (sem.subjects) {
        sem.subjects.forEach((sub) => {
          let subScore10 = 0;
          let totalWeight = 0;
          if (sub.components && sub.components.length > 0) {
            sub.components.forEach((comp) => {
              const score = parseFloat(comp.score);
              const weight = parseFloat(comp.weight);
              if (!isNaN(score) && !isNaN(weight)) {
                subScore10 += score * (weight / 100);
                totalWeight += weight;
              }
            });
          }
          // Chỉ tính môn có đủ trọng số (>= 99.9%)
          if (totalWeight >= 99.9 && subScore10 > 0) {
            const subScore4 = convertToGPA4(subScore10);
            const credits = parseFloat(sub.credits) || 0;
            
            // Tính cho học kỳ hiện tại
            semTotalScore += subScore4 * credits;
            semTotalCredits += credits;
            
            // Tích lũy cho GPA tổng
            totalPointCredit += subScore4 * credits;
            totalCreditsAccumulated += credits;
            
            if (subScore4 >= 1.0) {
              totalSubjectsPassed += 1;
            }
          }
        });
      }
      const semGpa = semTotalCredits > 0 ? semTotalScore / semTotalCredits : 0;
      semesterGPAs.push(semGpa);
    });

    // GPA tích lũy (cumulative) = tổng (điểm * tín chỉ) / tổng tín chỉ
    const cumulativeGpa = totalCreditsAccumulated > 0 ? totalPointCredit / totalCreditsAccumulated : 0;
    
    // GPA học kỳ gần nhất
    const lastSemesterGpa = semesterGPAs.length > 0 ? semesterGPAs[semesterGPAs.length - 1] : 0;
    
    // GPA học kỳ trước đó
    const previousSemesterGpa = semesterGPAs.length > 1 ? semesterGPAs[semesterGPAs.length - 2] : 0;
    
    const diff = cumulativeGpa - previousSemesterGpa;

    setGpaMetrics({
      current: cumulativeGpa.toFixed(2), // Hiển thị GPA tích lũy
      last: previousSemesterGpa.toFixed(2),
      diff: diff.toFixed(2),
      totalCredits: totalCreditsAccumulated,
      passedSubjects: totalSubjectsPassed,
    });
  };

  const handleDeleteDeadline = (id) => {
    toast.custom(
      (t) => (
        <div className="w-[calc(100vw-1rem)] sm:w-full sm:max-w-[360px] bg-white dark:bg-gray-800 p-4 sm:p-5 rounded-t-2xl sm:rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 flex flex-col items-center text-center animate-in fade-in zoom-in duration-300">
          {/* 1. Tiêu đề & Nội dung gọn hơn */}
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Xác nhận xóa?
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4 leading-relaxed">
            Công việc này sẽ bị xóa vĩnh viễn khỏi lịch.
          </p>

          {/* 2. Nút bấm nhỏ gọn, thanh thoát (text-sm, py-2) */}
          <div className="flex w-full flex-col-reverse sm:flex-row gap-2 sm:gap-3">
            {/* Nút Hủy */}
            <button
              onClick={() => toast.dismiss(t)}
              className="w-full flex-1 py-3 sm:py-2 px-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-semibold rounded-lg transition-colors"
            >
              Hủy
            </button>

            {/* Nút Xóa */}
            <button
              onClick={async () => {
                toast.dismiss(t);
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

  const handleToggleDeadline = async (task) => {
    const newDeadlines = deadlines.map((d) =>
      d._id === task._id ? { ...d, isDone: !d.isDone } : d
    );
    setDeadlines(newDeadlines);
    try {
      await fetch("/api/events/toggle", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task._id, username: user.username }),
      });
    } catch (error) {
      loadDeadlines();
    }
  };

  const isIncrease = parseFloat(gpaMetrics.diff) >= 0;

  // Dữ liệu cho biểu đồ tròn tín chỉ
  const creditData = [
    { name: "Hoàn thành", value: gpaMetrics.totalCredits, fill: "#16A34A" },
    {
      name: "Còn lại",
      value: Math.max(0, targetCredits - gpaMetrics.totalCredits),
      fill: "#F3F4F6",
    },
  ];
  const creditPercent =
    Math.round((gpaMetrics.totalCredits / targetCredits) * 100) || 0;
  const remainingCredits = Math.max(0, targetCredits - gpaMetrics.totalCredits);

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
        <div className="flex gap-4 sm:gap-6 overflow-x-auto no-scrollbar">
          {[
            { id: "overview", label: "Tổng quan", icon: GraduationCap },
            { id: "exams", label: "Lịch trình hôm nay", icon: FileText },
            // 👇 ĐỔI TÊN TAB Ở ĐÂY
            { id: "documents", label: "Ghi chú nhanh", icon: StickyNote },
            { id: "flashcards", label: "Flashcard", icon: Layers },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 pb-3 px-1 text-sm font-bold transition-all border-b-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-primary text-primary dark:border-blue-400 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. CONTENT AREA */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Quick Stats Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* CARD 1: GPA */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4 relative overflow-hidden">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center font-bold z-10">
                {gpaMetrics.current}
              </div>
              <div className="z-10">
                <p className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase">
                  GPA Kỳ này
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

            {/* CARD 3: Đề thi */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center font-bold">
                12
              </div>
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase">
                  Đề thi
                </p>
                <p className="text-gray-700 dark:text-gray-200 font-bold">
                  Đã luyện tập
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
                  {totalStudyHours} giờ
                </p>
              </div>
            </div>
          </div>

          {/* Main Grid: Chart & Schedule */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* CỘT TRÁI: BIỂU ĐỒ ĐA NĂNG */}
              <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden">
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
                <div className="bg-gray-100 dark:bg-gray-700 p-1 rounded-lg flex text-xs font-bold">
                  <button
                    onClick={() => setChartMode("credit")}
                    className={`px-3 py-1.5 rounded-md transition-all ${
                      chartMode === "credit"
                        ? "bg-white dark:bg-gray-600 text-green-600 dark:text-green-400 shadow-sm"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                    }`}
                  >
                    Tiến độ
                  </button>
                  <button
                    onClick={() => setChartMode("study")}
                    className={`px-3 py-1.5 rounded-md transition-all ${
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
                {chartMode === "credit" ? (
                  // --- BIỂU ĐỒ TIẾN ĐỘ (REMASTERED) ---
                  <div className="flex flex-col items-center justify-center lg:flex-row gap-5 sm:gap-6 lg:gap-10 p-2">
                    {/* PHẦN 1: BIỂU ĐỒ TRÒN */}
                    <div className="relative w-44 h-44 sm:w-52 sm:h-52 lg:w-56 lg:h-56 flex-shrink-0 group">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadialBarChart
                          innerRadius="75%"
                          outerRadius="100%"
                          barSize={24} // Tăng độ dày cho rõ
                          data={[
                            {
                              value: gpaMetrics.totalCredits,
                              fill: "url(#progressGradient)",
                            },
                          ]} // Sử dụng Gradient
                          startAngle={180}
                          endAngle={0}
                        >
                          {/* Định nghĩa Gradient màu sắc */}
                          <defs>
                            <linearGradient
                              id="progressGradient"
                              x1="0"
                              y1="0"
                              x2="1"
                              y2="0"
                            >
                              <stop offset="0%" stopColor="#3B82F6" />{" "}
                              {/* Blue-500 */}
                              <stop offset="100%" stopColor="#10B981" />{" "}
                              {/* Emerald-500 */}
                            </linearGradient>
                          </defs>

                          <PolarAngleAxis
                            type="number"
                            domain={[0, targetCredits]}
                            angleAxisId={0}
                            tick={false}
                          />
                          <RadialBar
                            minAngle={15}
                            background={{ fill: "#f3f4f6" }} // Màu nền thanh (Light mode)
                            clockWise={true}
                            dataKey="value"
                            cornerRadius={12} // Bo tròn đầu thanh
                          />
                          <Tooltip cursor={false} />
                        </RadialBarChart>
                      </ResponsiveContainer>

                      {/* Text ở giữa biểu đồ */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pt-8 pointer-events-none">
                        <span className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-600 dark:from-blue-400 dark:to-emerald-400 drop-shadow-sm">
                          {creditPercent}%
                        </span>
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-1">
                          Hoàn thành
                        </span>
                      </div>
                    </div>

                    {/* PHẦN 2: CÁC THÔNG SỐ CHI TIẾT (GRID MÀU SẮC) */}
                    <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 w-full max-w-sm">
                      {/* Box 1: Mục tiêu (Màu Xanh Dương) */}
                      <div
                        className="flex flex-col p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 transition-transform lg:hover:scale-105 cursor-pointer"
                        onClick={() => setIsTargetModalOpen(true)}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Target className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <span className="text-xs font-semibold text-blue-600 dark:text-blue-300 uppercase">
                            Mục tiêu
                          </span>
                        </div>
                        <span className="text-xl font-bold text-gray-800 dark:text-white">
                          {targetCredits}{" "}
                          <span className="text-xs font-medium text-gray-500">
                            TC
                          </span>
                        </span>
                      </div>

                      {/* Box 2: Đã tích lũy (Màu Xanh Lá) */}
                      <div className="flex flex-col p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 transition-transform lg:hover:scale-105">
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

                      {/* Box 3: Còn lại (Màu Cam) */}
                      <div className="flex flex-col p-4 rounded-2xl bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 transition-transform lg:hover:scale-105">
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

                      {/* Box 4: Môn đã qua (Màu Tím) */}
                      <div className="flex flex-col p-4 rounded-2xl bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 transition-transform lg:hover:scale-105">
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
                        stroke="#f3f4f6"
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
                          border: "none",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        }}
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
                )}
              </div>
            </div>

            {/* Cột phải: To-Do List */}
            <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col h-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-800 dark:text-white">
                  Deadline sắp tới
                </h3>
                <span className="text-xs font-bold text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-2 py-1 rounded-md">
                  {deadlines.length} task
                </span>
              </div>
              <div className="space-y-3 flex-1 overflow-y-auto pr-2 max-h-[300px]">
                {deadlines.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                    <p>Không có deadline nào.</p>
                    <p className="text-xs">Thư giãn đi! 🎉</p>
                  </div>
                ) : (
                  deadlines.map((task) => (
                    <div
                      key={task._id}
                      className={`flex items-start gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl transition-colors cursor-pointer group relative ${
                        task.isDone ? "opacity-60" : ""
                      }`}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDeadline(task._id);
                        }}
                        className="absolute right-2 top-2 p-1.5 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all z-10"
                      >
                        <Trash2 size={14} />
                      </button>
                      <div
                        className="mt-1 flex-shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={task.isDone || false}
                          onChange={() => handleToggleDeadline(task)}
                          className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                        />
                      </div>
                      <div
                        onClick={() => handleToggleDeadline(task)}
                        className="flex-1"
                      >
                        <p
                          className={`text-sm font-semibold transition-all ${
                            task.isDone
                              ? "text-gray-400 dark:text-gray-500 line-through decoration-gray-400"
                              : "text-gray-700 dark:text-gray-200"
                          }`}
                        >
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {task.type === "exam" && (
                            <span className="text-[10px] font-bold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded">
                              THI
                            </span>
                          )}
                          <p
                            className={`text-xs font-medium ${
                              task.type === "exam"
                                ? "text-red-500 dark:text-red-400"
                                : "text-gray-400 dark:text-gray-500"
                            }`}
                          >
                            {formatDeadlineTime(task.date)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GIAO DIỆN TAB: GHI CHÚ NHANH */}
      {activeTab === "documents" && <QuickNotesTab user={user} />}

      {/* GIAO DIỆN TAB: LỊCH TRÌNH HÔM NAY */}
      {activeTab === "exams" && <DailyScheduleTab user={user} />}

      {/* GIAO DIỆN TAB: FLASHCARD */}
      {activeTab === "flashcards" && <FlashcardTab />}

      <AddDeadlineModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadDeadlines}
        username={user?.username}
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
