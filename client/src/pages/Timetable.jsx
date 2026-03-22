import React, { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { timetableService } from "../services/timetableService";
import {
  getMonday,
  formatDateDisplay,
  isClassInWeek,
  PASTEL_COLORS,
  processExcelFile,
  PERIOD_TIMES,
} from "../utils/timetableHelpers"; // 👈 Import PERIOD_TIMES
import { ClassModal, NotesModal } from "../components/TimetableModals";
import LoadingOverlay from "../components/LoadingOverlay";
import Tooltip from "../components/Tooltip";
import { AnimatePresence, motion } from "framer-motion";

import {
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Upload,
  Clock,
  MapPin,
  FileText,
  Edit3,
  ClipboardList,
  Building,
  ArrowRight,
  X,
} from "lucide-react";

const isMobileViewport = () =>
  typeof window !== "undefined" && window.innerWidth < 640;

const getConfirmToastOptions = () => ({
  position: isMobileViewport() ? "bottom-center" : "top-center",
  duration: Infinity,
});

const Timetable = () => {
  const user = JSON.parse(localStorage.getItem("user"));

  const [timetable, setTimetable] = useState([]);
  const [currentWeekStart, setCurrentWeekStart] = useState(
    getMonday(new Date())
  );
  const [selectedMobileDay, setSelectedMobileDay] = useState(
    new Date().getDay() === 0 ? "CN" : String(new Date().getDay() + 1)
  );

  const [isImportModalOpen, setImportModalOpen] = useState(false);
  const [isClassModalOpen, setClassModalOpen] = useState(false);
  const [classToEdit, setClassToEdit] = useState(null);

  const [isNotesModalOpen, setNotesModalOpen] = useState(false);
  const [classForNotes, setClassForNotes] = useState(null);

  // Loading overlay state
  const [loadingState, setLoadingState] = useState({ isLoading: false, message: "" });

  const loadTimetable = async () => {
    if (user) {
      const res = await timetableService.getTimetable(user.username);
      if (res.success) setTimetable(res.timetable);
    }
  };

  useEffect(() => {
    loadTimetable();
  }, []);

  const weeklyClasses = useMemo(() => {
    return timetable.filter((cls) => isClassInWeek(cls, currentWeekStart));
  }, [timetable, currentWeekStart]);

  const days = ["2", "3", "4", "5", "6", "7", "CN"];
  const sessions = [
    { id: "morning", label: "Sáng" },
    { id: "afternoon", label: "Chiều" },
    { id: "evening", label: "Tối" },
  ];
  const actionBtnFontStyle = {
    fontFamily: "'Google Sans', 'Plus Jakarta Sans', sans-serif",
  };

  const handleSaveClass = async (formData, isEdit) => {
    const classData = {
      ...formData,
      username: user.username,
      classId: isEdit ? classToEdit._id || classToEdit.id : undefined,
    };
    
    setLoadingState({ 
      isLoading: true, 
      message: isEdit ? "Đang cập nhật lớp học..." : "Đang thêm lớp học..." 
    });
    
    try {
      const res = await timetableService.saveClass(classData, isEdit);
      if (res.success) {
        await loadTimetable();
        setClassModalOpen(false);
        toast.success(isEdit ? "Cập nhật thành công!" : "Thêm lớp học thành công!", {
          position: isMobileViewport() ? "bottom-center" : "top-center",
        });
      } else {
        toast.error("Lỗi: " + res.message, {
          position: isMobileViewport() ? "bottom-center" : "top-center",
        });
      }
    } catch (error) {
      console.error(error);
      toast.error("Đã xảy ra lỗi khi lưu lớp học!", {
        position: isMobileViewport() ? "bottom-center" : "top-center",
      });
    } finally {
      setLoadingState({ isLoading: false, message: "" });
    }
  };

  const handleNoteAction = async (
    action,
    noteContent = null,
    noteId = null
  ) => {
    if (!classForNotes) return;
    const classId = classForNotes._id || classForNotes.id;
    const noteData =
      action === "add"
        ? { id: Date.now().toString(), content: noteContent, isDone: false }
        : { id: noteId };
    const res = await timetableService.updateNote(
      classId,
      user.username,
      action,
      noteData
    );
    if (res.success) {
      const updatedClass = { ...classForNotes, notes: res.notes };
      setClassForNotes(updatedClass);
      setTimetable((prev) =>
        prev.map((c) => ((c._id || c.id) === classId ? updatedClass : c))
      );
    }
  };

  const handleDeleteClass = (classId) => {
    toast.custom((t) => (
      <div className="w-[calc(100vw-1rem)] sm:w-full sm:max-w-[360px] bg-white dark:bg-gray-900 p-4 sm:p-5 rounded-t-2xl sm:rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 flex flex-col items-center text-center animate-in fade-in zoom-in duration-300">
        
        {/* Tiêu đề ngắn gọn */}
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
          Xóa môn học?
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4 leading-relaxed">
          Môn này sẽ bị gỡ khỏi thời khóa biểu của bạn.
        </p>
  
        {/* Nút bấm ngang hàng */}
        <div className="flex w-full flex-col-reverse sm:flex-row gap-2 sm:gap-3">
          
          {/* Nút Hủy */}
          <button
            onClick={() => toast.dismiss(t)}
            className="w-full flex-1 py-3 sm:py-2 px-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-semibold rounded-lg transition-all hover:shadow-md active:scale-95"
          >
            Hủy
          </button>
  
          {/* Nút Xóa */}
          <button
            onClick={async () => {
              toast.dismiss(t);
              setLoadingState({ isLoading: true, message: "Đang xóa lớp học..." });
              try {
                await timetableService.deleteClass(classId, user.username);
                await loadTimetable();
                toast.success("Đã xóa môn học!", {
                  position: isMobileViewport() ? "bottom-center" : "top-center",
                });
              } catch (error) {
                console.error(error);
                toast.error("Lỗi khi xóa môn!", {
                  position: isMobileViewport() ? "bottom-center" : "top-center",
                });
              } finally {
                setLoadingState({ isLoading: false, message: "" });
              }
            }}
            className="w-full flex-1 py-3 sm:py-2 px-3 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg shadow-sm transition-all hover:shadow-md active:scale-95"
          >
            Xóa
          </button>
        </div>
  
      </div>
    ), getConfirmToastOptions());
  };

  const handleDeleteAll = () => {
    toast.custom((t) => (
      <div className="w-[calc(100vw-1rem)] sm:w-full sm:max-w-[360px] bg-white dark:bg-gray-900 p-4 sm:p-5 rounded-t-2xl sm:rounded-2xl shadow-xl border border-red-100 dark:border-red-900/30 flex flex-col items-center text-center animate-in fade-in zoom-in duration-300">
        
        {/* Tiêu đề Cảnh báo mạnh */}
        <h3 className="text-lg font-bold text-red-600 dark:text-red-500">
          Xóa sạch TKB?
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4 leading-relaxed">
          Toàn bộ lịch học sẽ bị xóa trắng. <br/> Hành động này <span className="font-bold text-gray-700 dark:text-gray-300">không thể hoàn tác!</span>
        </p>
  
        {/* Nút bấm */}
        <div className="flex w-full flex-col-reverse sm:flex-row gap-2 sm:gap-3">
          
          <button
            onClick={() => toast.dismiss(t)}
            className="w-full flex-1 py-3 sm:py-2 px-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-semibold rounded-lg transition-all hover:shadow-md active:scale-95"
          >
            Giữ lại
          </button>
  
          <button
            onClick={async () => {
              toast.dismiss(t);
              setLoadingState({ isLoading: true, message: "Đang xóa toàn bộ lịch học..." });
              try {
                await timetableService.clearTimetable(user.username);
                await loadTimetable();
                toast.success("Đã dọn sạch thời khóa biểu!", {
                  position: isMobileViewport() ? "bottom-center" : "top-center",
                });
              } catch (error) {
                console.error(error);
                toast.error("Lỗi khi xóa dữ liệu!", {
                  position: isMobileViewport() ? "bottom-center" : "top-center",
                });
              } finally {
                setLoadingState({ isLoading: false, message: "" });
              }
            }}
            className="w-full flex-1 py-3 sm:py-2 px-3 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg shadow-red-500/30 transition-all hover:shadow-md active:scale-95"
          >
            Xóa hết
          </button>
        </div>
  
      </div>
    ), getConfirmToastOptions());
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const importedData = await processExcelFile(file);
      if (confirm(`Tìm thấy ${importedData.length} lớp học. Nhập ngay?`)) {
        setLoadingState({ isLoading: true, message: `Đang thêm ${importedData.length} lớp học...` });
        try {
          for (const cls of importedData) {
            await timetableService.saveClass({ ...cls, username: user.username });
          }
          await loadTimetable();
          setImportModalOpen(false);
          toast.success(`Đã thêm ${importedData.length} lớp học thành công!`, {
            position: isMobileViewport() ? "bottom-center" : "top-center",
          });
        } catch (saveErr) {
          console.error(saveErr);
          toast.error("Lỗi khi lưu lớp học!", {
            position: isMobileViewport() ? "bottom-center" : "top-center",
          });
        } finally {
          setLoadingState({ isLoading: false, message: "" });
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi đọc file Excel!", {
        position: isMobileViewport() ? "bottom-center" : "top-center",
      });
    }
    // Reset input
    e.target.value = '';
  };

  const handleWeekChange = (offset) => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + offset * 7);
    setCurrentWeekStart(newDate);
  };

  // --- SUB-COMPONENT: CLASS CARD (ĐÃ SỬA GIAO DIỆN) ---
  const ClassCard = ({ cls }) => {
    const colorIndex =
      Math.abs(cls.subject.charCodeAt(0)) % PASTEL_COLORS.length;
    const bgColor = PASTEL_COLORS[colorIndex];
    const notesCount = cls.notes?.filter((n) => !n.isDone).length || 0;

    // 👇 Tính giờ học từ tiết
    const startT = PERIOD_TIMES[cls.startPeriod]?.start || "??:??";
    const endPeriod = cls.startPeriod + cls.numPeriods - 1;
    const endT = PERIOD_TIMES[endPeriod]?.end || "??:??";
    const timeDisplay = `${startT} - ${endT}`;

    return (
      <div
        className="p-3 rounded-lg border-l-4 shadow-sm hover:shadow-md transition-all cursor-pointer text-left relative group overflow-hidden flex flex-col gap-1"
        style={{ backgroundColor: bgColor, borderLeftColor: "#6366f1" }}
      >
        {/* Badge đếm Notes */}
        {notesCount > 0 && (
          <div className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full z-10 animate-pulse">
            {notesCount}
          </div>
        )}

        <Tooltip text={cls.subject}>
          <div className="font-bold text-gray-800 text-sm leading-tight line-clamp-2">
            {cls.subject}
          </div>
        </Tooltip>

        <div className="text-[11px] text-gray-600 flex items-center gap-1 font-medium">
          <Clock size={12} /> {timeDisplay}
        </div>

        <div className="text-[11px] text-gray-500 flex items-center gap-1">
          <MapPin size={12} /> {cls.room}
        </div>

        <div className="text-[11px] text-gray-500 flex items-center gap-1.5">
            <Building size={12} className="text-green-600"/> {cls.campus}
        </div>

        {/* HOVER ACTIONS */}
        <div className="absolute bottom-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 dark:bg-gray-800/90 p-1 rounded-lg backdrop-blur-sm shadow-sm">
          <Tooltip text="Ghi chú">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setClassForNotes(cls);
                setNotesModalOpen(true);
              }}
              className="p-1 hover:bg-yellow-100 text-yellow-600 rounded transition-all hover:shadow-md active:scale-95"
            >
              <ClipboardList size={14} />
            </button>
          </Tooltip>
          <Tooltip text="Sửa">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setClassToEdit(cls);
                setClassModalOpen(true);
              }}
              className="p-1 hover:bg-blue-100 text-blue-600 rounded transition-all hover:shadow-md active:scale-95"
            >
              <Edit3 size={14} />
            </button>
          </Tooltip>
          <Tooltip text="Xóa">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteClass(cls._id || cls.id);
              }}
              className="p-1 hover:bg-red-100 text-red-600 rounded transition-all hover:shadow-md active:scale-95"
            >
              <Trash2 size={14} />
            </button>
          </Tooltip>
        </div>
      </div>
    );
  };

  // --- SUB-COMPONENT: MOBILE CLASS ITEM (ĐÃ SỬA) ---
  const MobileClassItem = ({ cls }) => {
    const notesCount = cls.notes?.filter((n) => !n.isDone).length || 0;

    const startT = PERIOD_TIMES[cls.startPeriod]?.start || "??:??";
    const endPeriod = cls.startPeriod + cls.numPeriods - 1;
    const endT = PERIOD_TIMES[endPeriod]?.end || "??:??";
    const timeDisplay = `${startT} - ${endT}`;

    return (
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 relative">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
              <span className="flex items-center gap-2 font-medium text-blue-600">
                <Clock size={16} /> {timeDisplay} (Tiết {cls.startPeriod}-
                {endPeriod})
              </span>
              <h3 className="font-bold text-gray-800 dark:text-white text-lg leading-tight pt-0.5">
                {cls.subject}
              </h3>
              <span className="flex items-center gap-2">
                <MapPin size={16} /> {cls.room} - {cls.campus}
              </span>
              <span className="flex items-center gap-1.5">
                <Building size={16} className="text-green-600"/> {cls.campus}
              </span>
            </div>
          </div>

          {/* Mobile Actions */}
          <div className="flex flex-col gap-2 ml-3">
            <button
              onClick={() => {
                setClassForNotes(cls);
                setNotesModalOpen(true);
              }}
              className="p-2 bg-yellow-50 text-yellow-600 rounded-xl relative transition-all hover:shadow-md active:scale-95"
            >
              <ClipboardList size={20} />
              {notesCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] w-4 h-4 flex items-center justify-center rounded-full">
                  {notesCount}
                </span>
              )}
            </button>
            <button
              onClick={() => {
                setClassToEdit(cls);
                setClassModalOpen(true);
              }}
              className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl transition-all hover:shadow-md active:scale-95"
            >
              <Edit3 size={20} />
            </button>
            <button
              onClick={() => handleDeleteClass(cls._id || cls.id)}
              className="p-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl transition-all hover:shadow-md active:scale-95"
            >
              <Trash2 size={20} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-6 pb-20 overflow-x-hidden">
      {/* HEADER */}
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex h-12 items-center justify-between gap-1 rounded-full border border-slate-100 bg-white px-2 py-1.5 shadow-[0_2px_12px_rgba(15,23,42,0.04)] sm:h-auto">
          <button
            onClick={() => handleWeekChange(-1)}
            className="h-9 w-9 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100/80 transition-all hover:shadow-md active:scale-95"
            aria-label="Tuần trước"
          >
            <ChevronLeft size={18} strokeWidth={1.8} />
          </button>
          <div className="min-w-[190px] px-2 text-center text-sm font-semibold text-slate-700 font-['Plus_Jakarta_Sans']">
            {formatDateDisplay(currentWeekStart)} -{" "}
            {formatDateDisplay(
              new Date(currentWeekStart).setDate(currentWeekStart.getDate() + 6)
            )}
          </div>
          <button
            onClick={() => handleWeekChange(1)}
            className="h-9 w-9 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100/80 transition-all hover:shadow-md active:scale-95"
            aria-label="Tuần sau"
          >
            <ChevronRight size={18} strokeWidth={1.8} />
          </button>
        </div>

        <div className="grid h-12 w-full grid-cols-3 gap-2 rounded-2xl bg-slate-50/70 p-1 sm:flex sm:h-auto sm:w-auto sm:items-center sm:justify-end sm:rounded-full sm:p-1.5">
          <Tooltip text="Xóa toàn bộ môn học trong tuần biểu">
            <motion.button
              onClick={handleDeleteAll}
              whileHover={{
                x: [0, -2, 2, -1.5, 1.5, 0],
                transition: { duration: 0.35 },
              }}
              className="group relative flex h-full w-full items-center justify-center gap-2 rounded-2xl border border-transparent text-slate-400 transition-all duration-200 hover:bg-rose-500 hover:text-white hover:shadow-[0_10px_24px_-8px_rgba(244,63,94,0.55)] active:scale-95 sm:h-10 sm:w-auto sm:rounded-full sm:border-rose-200/70 sm:bg-rose-50 sm:px-4 sm:text-rose-500 sm:hover:bg-rose-100 sm:hover:text-rose-600"
              style={actionBtnFontStyle}
            >
              <Trash2 size={16} className="opacity-80" />
              <span className="hidden sm:inline">Xóa tất cả</span>
            </motion.button>
          </Tooltip>

          <Tooltip text="Nhập danh sách môn từ file Excel">
            <button
              onClick={() => setImportModalOpen(true)}
              className="flex h-full w-full items-center justify-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-3 text-emerald-600 text-sm font-bold transition-all duration-300 hover:bg-gradient-to-br hover:from-emerald-500 hover:to-green-500 hover:text-white hover:border-transparent hover:shadow-[0_10px_24px_-8px_rgba(16,185,129,0.55)] hover:scale-105 active:scale-95 sm:h-10 sm:w-auto sm:rounded-full sm:px-4"
              style={actionBtnFontStyle}
            >
              <Upload size={17} />
              <span className="hidden sm:inline">Nhập Excel</span>
            </button>
          </Tooltip>

          <button
            onClick={() => {
              setClassToEdit(null);
              setClassModalOpen(true);
            }}
            className="flex h-full w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-indigo-600 via-blue-600 to-violet-500 px-3 text-white text-sm font-bold shadow-[0_10px_20px_-5px_rgba(79,70,229,0.4)] transition-all duration-300 hover:scale-105 hover:shadow-[0_16px_30px_-8px_rgba(79,70,229,0.55)] active:scale-95 sm:h-10 sm:w-auto sm:rounded-full sm:px-5"
            style={actionBtnFontStyle}
          >
            <Plus size={17} strokeWidth={2} />
            <span className="hidden sm:inline">Thêm môn</span>
          </button>
        </div>
      </div>

      {/* --- DESKTOP VIEW (TABLE) --- */}
      <div className="hidden md:block bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-slate-100/80 dark:border-slate-700/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] border-collapse table-fixed">
            <thead>
              <tr>
                <th className="p-4 bg-slate-50/80 dark:bg-slate-900 border-b border-r border-slate-100/80 dark:border-slate-700/80 w-24 text-slate-500 dark:text-slate-400 uppercase text-xs font-bold sticky left-0 z-10">
                  Buổi
                </th>
                {days.map((day, index) => {
                  const date = new Date(currentWeekStart);
                  date.setDate(date.getDate() + index);
                  const isToday =
                    new Date().toDateString() === date.toDateString();
                  return (
                    <th
                      key={day}
                      className={`p-4 border-b border-r border-slate-100/80 dark:border-slate-700/80 ${
                        isToday ? "bg-blue-50/50 dark:bg-blue-900/20" : "bg-white dark:bg-gray-800"
                      }`}
                    >
                      <div
                        className={`text-sm font-black flex flex-col items-center gap-1 ${
                          isToday ? "text-blue-700 dark:text-blue-300" : "text-gray-800 dark:text-white"
                        }`}
                      >
                        <span>THỨ {day}</span>
                        {isToday && (
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-blue-300" />
                        )}
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500 font-medium mt-1">
                        {formatDateDisplay(date)}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr key={session.id}>
                  <td className="p-4 bg-slate-50/80 dark:bg-slate-900 border-b border-r border-slate-100/80 dark:border-slate-700/80 font-bold text-slate-600 dark:text-slate-400 text-center sticky left-0 z-10 text-sm">
                    {session.label}
                  </td>
                  {days.map((day) => {
                    const cellClasses = weeklyClasses
                      .filter(
                        (c) =>
                          String(c.day) === day &&
                          (c.session === session.id ||
                            (session.id === "morning" && c.startPeriod <= 6) ||
                            (session.id === "afternoon" &&
                              c.startPeriod > 6 &&
                              c.startPeriod <= 12) ||
                            (session.id === "evening" && c.startPeriod > 12))
                      )
                      .sort((a, b) => a.startPeriod - b.startPeriod);

                    return (
                      // 👇 Fix layout: min-h-[140px] để ô rộng hơn, h-auto để co giãn nếu nhiều môn
                      <td
                        key={`${day}-${session.id}`}
                        className="p-2 border-b border-r border-slate-100/80 dark:border-slate-700/80 align-top h-auto min-h-[140px] relative group/cell"
                      >
                        <div className="flex flex-col gap-2 h-full">
                          {cellClasses.map((cls) => (
                            <ClassCard key={cls._id || cls.id} cls={cls} />
                          ))}
                          {cellClasses.length === 0 && (
                            <button
                              onClick={() => {
                                setClassToEdit(null);
                                setClassModalOpen(true);
                              }}
                              className="w-full h-full min-h-[100px] flex items-center justify-center text-gray-300 hover:text-blue-500 opacity-0 group-hover/cell:opacity-100 transition-all hover:shadow-md active:scale-95"
                            >
                              <Plus size={24} />
                            </button>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MOBILE VIEW (TABS) --- */}
      <div className="md:hidden">
        <div className="flex overflow-x-auto pb-4 gap-2 no-scrollbar mb-2 whitespace-nowrap snap-x snap-mandatory">
          {days.map((day, index) => {
            const date = new Date(currentWeekStart);
            date.setDate(date.getDate() + index);
            const isSelected = selectedMobileDay === day;
            const isToday = new Date().toDateString() === date.toDateString();

            return (
              <button
                key={day}
                onClick={() => setSelectedMobileDay(day)}
                className={`flex flex-col items-center min-w-[74px] p-2 rounded-xl border-2 transition-all snap-start ${
                  isSelected
                    ? "border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-blue-900/30"
                    : isToday
                    ? "border-blue-200 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                    : "border-transparent bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                } hover:shadow-md active:scale-95`}
              >
                <span className="text-xs font-bold">Thứ {day}</span>
                <span
                  className={`text-[10px] ${
                    isSelected ? "text-blue-100" : "text-gray-400"
                  }`}
                >
                  {formatDateDisplay(date)}
                </span>
              </button>
            );
          })}
        </div>

        <div className="space-y-3">
          {weeklyClasses.filter((c) => String(c.day) === selectedMobileDay)
            .length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-100 dark:border-gray-700">
              <Clock size={48} className="mb-2 opacity-20" />
              <p className="font-medium">Hôm nay không có môn nào!</p>
              <p className="text-xs">Chạm vào nút "+" để thêm lịch</p>
            </div>
          ) : (
            weeklyClasses
              .filter((c) => String(c.day) === selectedMobileDay)
              .sort((a, b) => a.startPeriod - b.startPeriod)
              .map((cls) => (
                <MobileClassItem key={cls._id || cls.id} cls={cls} />
              ))
          )}
        </div>
      </div>

      {/* --- IMPORT MODAL --- */}
      <AnimatePresence>
        {isImportModalOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              initial={{ y: 36, opacity: 0, scale: 0.97 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 24, opacity: 0, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 360, damping: 28 }}
              className="relative w-full max-w-md overflow-hidden rounded-[2.5rem] border border-white/60 bg-white/90 p-6 shadow-2xl shadow-blue-500/10 backdrop-blur-xl"
            >
              <button
                onClick={() => setImportModalOpen(false)}
                className="absolute right-5 top-5 rounded-full p-1.5 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-700 hover:shadow-md active:scale-95"
                aria-label="Đóng"
              >
                <X size={18} strokeWidth={1.6} />
              </button>

              <h3
                className="mb-5 pr-10 text-2xl font-bold text-slate-900"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                Nhập từ Excel
              </h3>

              <div className="relative mb-5 cursor-pointer rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 text-center transition-all duration-200 hover:border-blue-500 hover:bg-blue-50/50 group">
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileUpload}
                  className="absolute inset-0 z-10 cursor-pointer opacity-0"
                />
                <Upload
                  className="mx-auto mb-3 text-blue-500 transition-transform duration-200 group-hover:animate-bounce"
                  size={46}
                />
                <p className="text-sm font-bold text-slate-700">
                  Kéo thả file vào đây hoặc click để chọn
                </p>
                <p className="mt-1 text-xs text-slate-500">Hỗ trợ định dạng .xlsx, .xls</p>
              </div>

              <div className="mb-6 grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/70 px-3 py-3 text-center">
                <div className="flex flex-col items-center gap-1">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">1</div>
                  <span className="text-[11px] font-semibold text-slate-600">Tải mẫu</span>
                </div>
                <ArrowRight size={14} className="text-slate-400" />
                <div className="flex flex-col items-center gap-1">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">2</div>
                  <span className="text-[11px] font-semibold text-slate-600">Điền thông tin</span>
                </div>
                <ArrowRight size={14} className="text-slate-400" />
                <div className="flex flex-col items-center gap-1">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">3</div>
                  <span className="text-[11px] font-semibold text-slate-600">Tải lên</span>
                </div>
              </div>

              <div className="text-center">
                <a
                  href="https://products.aspose.app/cells/conversion/image-to-excel"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-full bg-indigo-50 px-5 py-2.5 text-sm font-bold text-indigo-600 transition-colors hover:bg-indigo-100"
                >
                  Chuyển ảnh TKB sang Excel
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- CREATE/EDIT CLASS MODAL --- */}
      <ClassModal
        isOpen={isClassModalOpen}
        onClose={() => setClassModalOpen(false)}
        onSubmit={handleSaveClass}
        initialData={classToEdit}
      />

      {/* --- NOTES MODAL --- */}
      <NotesModal
        isOpen={isNotesModalOpen}
        onClose={() => setNotesModalOpen(false)}
        classData={classForNotes}
        onAdd={(content) => handleNoteAction("add", content)}
        onToggle={(noteId) => handleNoteAction("toggle", null, noteId)}
        onDelete={(noteId) => handleNoteAction("delete", null, noteId)}
      />

      {/* --- LOADING OVERLAY --- */}
      <LoadingOverlay 
        isVisible={loadingState.isLoading} 
        message={loadingState.message} 
      />
    </div>
  );
};

export default Timetable;
