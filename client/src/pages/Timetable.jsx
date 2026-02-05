import React, { useState, useEffect, useMemo } from "react";
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
} from "lucide-react";

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

  const handleSaveClass = async (formData, isEdit) => {
    const classData = {
      ...formData,
      username: user.username,
      classId: isEdit ? classToEdit._id || classToEdit.id : undefined,
    };
    const res = await timetableService.saveClass(classData, isEdit);
    if (res.success) {
      loadTimetable();
      setClassModalOpen(false);
    } else {
      alert("Lỗi: " + res.message);
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

  const handleDeleteClass = async (classId) => {
    if (confirm("Bạn có chắc muốn xóa môn này?")) {
      await timetableService.deleteClass(classId, user.username);
      loadTimetable();
    }
  };

  const handleDeleteAll = async () => {
    if (confirm("CẢNH BÁO: Xóa sạch thời khóa biểu?")) {
      await timetableService.clearTimetable(user.username);
      loadTimetable();
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const importedData = await processExcelFile(file);
      if (confirm(`Tìm thấy ${importedData.length} lớp học. Nhập ngay?`)) {
        for (const cls of importedData) {
          await timetableService.saveClass({ ...cls, username: user.username });
        }
        await loadTimetable();
        setImportModalOpen(false);
      }
    } catch (err) {
      alert("Lỗi đọc file Excel!");
    }
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

        <div
          className="font-bold text-gray-800 text-sm leading-tight line-clamp-2"
          title={cls.subject}
        >
          {cls.subject}
        </div>

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
        <div className="absolute bottom-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 p-1 rounded-lg backdrop-blur-sm shadow-sm">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setClassForNotes(cls);
              setNotesModalOpen(true);
            }}
            className="p-1 hover:bg-yellow-100 text-yellow-600 rounded"
            title="Ghi chú"
          >
            <ClipboardList size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setClassToEdit(cls);
              setClassModalOpen(true);
            }}
            className="p-1 hover:bg-blue-100 text-blue-600 rounded"
            title="Sửa"
          >
            <Edit3 size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteClass(cls._id || cls.id);
            }}
            className="p-1 hover:bg-red-100 text-red-600 rounded"
            title="Xóa"
          >
            <Trash2 size={14} />
          </button>
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
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 relative">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className="font-bold text-gray-800 text-lg leading-tight mb-2">
              {cls.subject}
            </h3>
            <div className="text-sm text-gray-500 space-y-1">
              <span className="flex items-center gap-2 font-medium text-blue-600">
                <Clock size={16} /> {timeDisplay} (Tiết {cls.startPeriod}-
                {endPeriod})
              </span>
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
              className="p-2 bg-yellow-50 text-yellow-600 rounded-xl relative"
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
              className="p-2 bg-blue-50 text-blue-600 rounded-xl"
            >
              <Edit3 size={20} />
            </button>
            <button
              onClick={() => handleDeleteClass(cls._id || cls.id)}
              className="p-2 bg-red-50 text-red-600 rounded-xl"
            >
              <Trash2 size={20} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-6 pb-20">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
        <div className="flex items-center gap-4 bg-white p-2 rounded-xl shadow-sm border border-gray-200 w-full md:w-auto justify-between md:justify-start">
          <button
            onClick={() => handleWeekChange(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeft />
          </button>
          <div className="font-bold text-gray-700 min-w-[200px] text-center text-sm md:text-base">
            {formatDateDisplay(currentWeekStart)} -{" "}
            {formatDateDisplay(
              new Date(currentWeekStart).setDate(currentWeekStart.getDate() + 6)
            )}
          </div>
          <button
            onClick={() => handleWeekChange(1)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronRight />
          </button>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <button
            onClick={handleDeleteAll}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 font-bold transition-all cursor-pointer"
            title="Xóa tất cả"
          >
            <Trash2 size={20} />
            <span className="hidden sm:inline">Xóa tất cả</span>
          </button>
          <button
            onClick={() => setImportModalOpen(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 font-bold transition-all cursor-pointer"
          >
            <Upload size={20} />{" "}
            <span className="hidden sm:inline">Nhập Excel</span>
          </button>
          <button
            onClick={() => {
              setClassToEdit(null);
              setClassModalOpen(true);
            }}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold shadow-lg shadow-blue-200 transition-all cursor-pointer"
          >
            <Plus size={20} /> <span>Thêm môn</span>
          </button>
        </div>
      </div>

      {/* --- DESKTOP VIEW (TABLE) --- */}
      <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] border-collapse table-fixed">
            <thead>
              <tr>
                <th className="p-4 bg-gray-50 border-b border-r border-gray-200 w-24 text-gray-500 uppercase text-xs font-bold sticky left-0 z-10">
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
                      className={`p-4 border-b border-r border-gray-200 ${
                        isToday ? "bg-blue-50/50" : "bg-white"
                      }`}
                    >
                      <div
                        className={`text-sm font-black ${
                          isToday ? "text-blue-600" : "text-gray-800"
                        }`}
                      >
                        THỨ {day}
                      </div>
                      <div className="text-xs text-gray-400 font-medium mt-1">
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
                  <td className="p-4 bg-gray-50 border-b border-r border-gray-200 font-bold text-gray-600 text-center sticky left-0 z-10 text-sm">
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
                        className="p-2 border-b border-r border-gray-200 align-top h-auto min-h-[140px] relative group/cell"
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
                              className="w-full h-full min-h-[100px] flex items-center justify-center text-gray-300 hover:text-blue-500 opacity-0 group-hover/cell:opacity-100 transition-opacity"
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
        <div className="flex overflow-x-auto pb-4 gap-2 no-scrollbar mb-2">
          {days.map((day, index) => {
            const date = new Date(currentWeekStart);
            date.setDate(date.getDate() + index);
            const isSelected = selectedMobileDay === day;
            const isToday = new Date().toDateString() === date.toDateString();

            return (
              <button
                key={day}
                onClick={() => setSelectedMobileDay(day)}
                className={`flex flex-col items-center min-w-[70px] p-2 rounded-xl border-2 transition-all ${
                  isSelected
                    ? "border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-200"
                    : isToday
                    ? "border-blue-200 bg-blue-50 text-blue-600"
                    : "border-transparent bg-white text-gray-500"
                }`}
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
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 bg-white rounded-2xl border-2 border-dashed border-gray-100">
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
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="font-bold text-xl mb-4 text-gray-800">
              Nhập từ Excel
            </h3>

            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center mb-4 hover:bg-gray-50 transition-colors cursor-pointer relative group bg-gray-50/50">
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
              />
              <div className="group-hover:scale-110 transition-transform duration-200">
                <Upload className="mx-auto text-blue-500 mb-3" size={48} />
              </div>
              <p className="text-sm font-bold text-gray-700">
                Nhấn để tải lên file Excel
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Hỗ trợ định dạng .xlsx, .xls
              </p>
            </div>

            {/* 👇 ĐÃ THÊM LẠI LINK HỖ TRỢ Ở ĐÂY */}
            <div className="text-center mb-6 bg-blue-50 p-3 rounded-lg border border-blue-100">
              <p className="text-xs text-blue-800 mb-1 font-medium">
                Chưa có file Excel?
              </p>
              <a
                href="https://products.aspose.app/cells/conversion/image-to-excel"
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center justify-center gap-1"
              >
                👉 Chuyển ảnh TKB sang Excel miễn phí
              </a>
            </div>

            <button
              onClick={() => setImportModalOpen(false)}
              className="w-full py-3 bg-gray-100 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

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
    </div>
  );
};

export default Timetable;
