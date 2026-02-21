import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { getFullApiUrl } from '../../config/apiConfig';
import {
  StickyNote,
  Bell,
  Clock,
  Trash2,
  Plus,
} from "lucide-react";

// --- HELPER ---
const isMobileViewport = () =>
  typeof window !== "undefined" && window.innerWidth < 640;

const getConfirmToastOptions = () => ({
  position: isMobileViewport() ? "bottom-center" : "top-center",
  duration: Infinity,
});

// --- COMPONENT: TAB GHI CHÚ NHANH ---
const DashboardNotesTab = ({ user }) => {
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
      const res = await fetch(getFullApiUrl(`/api/quick-notes?username=${user.username}`));
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
      const res = await fetch(getFullApiUrl(`/api/timetable?username=${user.username}`));
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
                classId: cls._id,
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
      const res = await fetch(getFullApiUrl("/api/quick-notes"), {
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
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Xóa ghi chú?
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4 leading-relaxed">
            Hành động này không thể hoàn tác.
          </p>

          <div className="flex w-full flex-col-reverse sm:flex-row gap-2 sm:gap-3">
            <button
              onClick={() => toast.dismiss(t)}
                className="w-full flex-1 py-3 sm:py-2 px-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-semibold rounded-lg transition-colors"
            >
              Hủy
            </button>

            <button
              onClick={async () => {
                toast.dismiss(t);
                try {
                  const res = await fetch(
                    getFullApiUrl(`/api/quick-notes/${id}?username=${user.username}`),
                    { method: "DELETE" }
                  );
                  if (!res.ok) throw new Error(`QUICK_NOTES_${res.status}`);
                  const contentType = res.headers.get("content-type") || "";
                  if (!contentType.includes("application/json")) {
                    throw new Error("QUICK_NOTES_INVALID_CONTENT");
                  }
                  const data = await res.json();

                  if (data.success) {
                    fetchMyNotes();
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

  // --- HANDLERS CHO NOTE TKB ---
  const handleToggleTimetableNote = async (note) => {
    const newNotes = timetableNotes.map((n) =>
      n.id === note.id && n.classId === note.classId
        ? { ...n, isDone: !n.isDone }
        : n
    );
    newNotes.sort((a, b) => (a.isDone === b.isDone ? 0 : a.isDone ? 1 : -1));
    setTimetableNotes(newNotes);

    try {
      await fetch(getFullApiUrl("/api/timetable/update-note"), {
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
      fetchTimetableNotes();
    }
  };

  const handleDeleteTimetableNote = (note) => {
    toast.custom(
      (t) => (
        <div className="w-[calc(100vw-1rem)] sm:w-full sm:max-w-[360px] bg-white dark:bg-gray-800 p-4 sm:p-5 rounded-t-2xl sm:rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 flex flex-col items-center text-center animate-in fade-in zoom-in duration-300">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Xóa nhắc nhở?
          </h3>

          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4 leading-relaxed">
            Nhắc nhở môn{" "}
            <span className="font-bold text-gray-700 dark:text-gray-300">
              {note.subject}
            </span>{" "}
            sẽ bị xóa vĩnh viễn.
          </p>

          <div className="flex w-full flex-col-reverse sm:flex-row gap-2 sm:gap-3">
            <button
              onClick={() => toast.dismiss(t)}
                className="w-full flex-1 py-3 sm:py-2 px-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-semibold rounded-lg transition-colors"
            >
              Hủy
            </button>

            <button
              onClick={async () => {
                toast.dismiss(t);

                setTimetableNotes(
                  timetableNotes.filter((n) => n.id !== note.id)
                );

                try {
                  await fetch(getFullApiUrl("/api/timetable/update-note"), {
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
                  fetchTimetableNotes();
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
                className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap leading-relaxed font-normal"
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

export default DashboardNotesTab;
