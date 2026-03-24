import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { Bell, Clock, FileText, Pin, StickyNote, Trash2 } from "lucide-react";
import { getFullApiUrl } from "../../config/apiConfig";
import Tooltip from "../Tooltip";

const isMobileViewport = () =>
  typeof window !== "undefined" && window.innerWidth < 640;

const getConfirmToastOptions = () => ({
  position: isMobileViewport() ? "bottom-center" : "top-center",
  duration: Infinity,
});

const GOOGLE_SANS_STACK = {
  fontFamily: "'Google Sans', 'Product Sans', 'Inter', sans-serif",
};

const PASTEL_NOTE_STYLES = [
  {
    value: "pastel-lemon",
    card:
      "bg-[linear-gradient(160deg,rgba(254,249,195,0.9),rgba(255,255,255,0.56))]",
    accent: "text-amber-700 dark:text-amber-300",
  },
  {
    value: "pastel-mint",
    card:
      "bg-[linear-gradient(160deg,rgba(220,252,231,0.9),rgba(255,255,255,0.56))]",
    accent: "text-emerald-700 dark:text-emerald-300",
  },
  {
    value: "pastel-blush",
    card:
      "bg-[linear-gradient(160deg,rgba(252,231,243,0.9),rgba(255,255,255,0.56))]",
    accent: "text-rose-700 dark:text-rose-300",
  },
  {
    value: "pastel-lilac",
    card:
      "bg-[linear-gradient(160deg,rgba(243,232,255,0.9),rgba(255,255,255,0.56))]",
    accent: "text-violet-700 dark:text-violet-300",
  },
];

const CARD_SHELL =
  "rounded-[2rem] border border-white/50 bg-white/70 shadow-2xl shadow-slate-200/40 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/55 dark:shadow-black/20";

const getPinnedStorageKey = (username) => `whalio-dashboard-note-pins:${username}`;

const getPastelStyle = (note, noteIndex = 0) => {
  const colorValue =
    typeof note?.color === "string" && note.color.trim().length > 0
      ? note.color.toLowerCase()
      : "";

  if (colorValue.includes("mint") || colorValue.includes("green")) return PASTEL_NOTE_STYLES[1];
  if (colorValue.includes("pink") || colorValue.includes("rose") || colorValue.includes("blush")) return PASTEL_NOTE_STYLES[2];
  if (colorValue.includes("purple") || colorValue.includes("violet") || colorValue.includes("lilac")) return PASTEL_NOTE_STYLES[3];
  if (colorValue.includes("yellow") || colorValue.includes("amber")) return PASTEL_NOTE_STYLES[0];

  const seed =
    typeof note?._id === "string"
      ? note._id.length + note._id.charCodeAt(0)
      : noteIndex;

  return PASTEL_NOTE_STYLES[seed % PASTEL_NOTE_STYLES.length];
};

const splitIntoColumns = (items, count) => {
  const columns = Array.from({ length: count }, () => []);
  items.forEach((item, index) => {
    columns[index % count].push(item);
  });
  return columns;
};

const EmptyStateCard = ({ icon: Icon, text, tall = false }) => (
  <div
    className={`flex items-center justify-center ${CARD_SHELL} p-6 ${
      tall ? "min-h-[420px]" : "min-h-[280px]"
    }`}
  >
    <div className="flex max-w-[230px] flex-col items-center text-center">
      <div className="relative mb-5 flex h-20 w-20 items-center justify-center rounded-[1.75rem] border border-white/60 bg-gradient-to-br from-slate-100 to-white shadow-lg shadow-slate-200/60 dark:border-white/10 dark:from-slate-800 dark:to-slate-900 dark:shadow-black/20">
        <Icon className="h-9 w-9 text-slate-300 dark:text-slate-600" />
        <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 via-blue-500 to-cyan-400 text-[10px] font-bold text-white shadow-lg shadow-sky-500/30">
          W
        </div>
      </div>
      <p className="text-sm font-medium text-slate-400 dark:text-slate-500">{text}</p>
    </div>
  </div>
);

const SectionHeader = ({
  icon: Icon,
  title,
  description,
  iconClassName = "",
}) => (
  <div className="flex items-start justify-between gap-4 px-1">
    <div className="flex items-center gap-3">
      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${CARD_SHELL}`}>
        <Icon className={`h-5 w-5 ${iconClassName}`} />
      </div>
      <div>
        <h3
          className="text-lg font-semibold text-slate-800 dark:text-slate-100"
          style={GOOGLE_SANS_STACK}
        >
          {title}
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
      </div>
    </div>
  </div>
);

const AddPlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
    <path
      d="M6 12H12M12 12H18M12 12V18M12 12V6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const DashboardNotesTab = ({ user }) => {
  const [myNotes, setMyNotes] = useState([]);
  const [timetableNotes, setTimetableNotes] = useState([]);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [isComposerFocused, setIsComposerFocused] = useState(false);
  const [pinnedNoteIds, setPinnedNoteIds] = useState([]);
  const composerTextareaRef = useRef(null);

  useEffect(() => {
    if (user) {
      fetchMyNotes();
      fetchTimetableNotes();
    }
  }, [user]);

  useEffect(() => {
    if (!user?.username || typeof window === "undefined") return;
    try {
      const rawValue = window.localStorage.getItem(getPinnedStorageKey(user.username));
      const parsedValue = rawValue ? JSON.parse(rawValue) : [];
      setPinnedNoteIds(Array.isArray(parsedValue) ? parsedValue : []);
    } catch (error) {
      console.error("Load pinned quick notes error:", error);
      setPinnedNoteIds([]);
    }
  }, [user]);

  useEffect(() => {
    if (!user?.username || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        getPinnedStorageKey(user.username),
        JSON.stringify(pinnedNoteIds)
      );
    } catch (error) {
      console.error("Persist pinned quick notes error:", error);
    }
  }, [pinnedNoteIds, user]);

  useEffect(() => {
    const textarea = composerTextareaRef.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    textarea.style.height = `${Math.max(textarea.scrollHeight, 96)}px`;
  }, [newContent]);

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
      if (data.success && Array.isArray(data.notes)) {
        setMyNotes(data.notes);
      }
    } catch (error) {
      console.error("Fetch quick notes error:", error);
    }
  };

  const fetchTimetableNotes = async () => {
    try {
      const res = await fetch(getFullApiUrl(`/api/timetable?username=${user.username}`));
      const data = await res.json();
      if (data.success) {
        const notes = [];
        data.timetable.forEach((cls) => {
          if (cls.notes?.length > 0) {
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
        notes.sort((a, b) => {
          if (a.isDone === b.isDone) {
            return new Date(a.deadline || "2099-12-31") - new Date(b.deadline || "2099-12-31");
          }
          return a.isDone ? 1 : -1;
        });
        setTimetableNotes(notes);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddNote = async () => {
    if (!newTitle.trim() || !newContent.trim()) return;

    const palette =
      PASTEL_NOTE_STYLES[(myNotes.length + newTitle.trim().length) % PASTEL_NOTE_STYLES.length];

    try {
      const res = await fetch(getFullApiUrl("/api/quick-notes"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: user.username,
          title: newTitle,
          content: newContent,
          color: palette.value,
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
        setIsComposerFocused(false);
        fetchMyNotes();
      }
    } catch (error) {
      console.error("Add quick note error:", error);
    }
  };

  const handleDeleteNote = (id) => {
    toast.custom(
      (t) => (
        <div className="flex w-[calc(100vw-1rem)] flex-col items-center rounded-t-2xl border border-gray-100 bg-white p-4 text-center shadow-xl animate-in fade-in zoom-in duration-300 sm:w-full sm:max-w-[360px] sm:rounded-2xl dark:border-gray-700 dark:bg-gray-800">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Xóa ghi chú?</h3>
          <p className="mb-4 mt-1 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
            Hành động này không thể hoàn tác.
          </p>
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:gap-3">
            <button
              onClick={() => toast.dismiss(t)}
              className="w-full flex-1 rounded-lg bg-gray-100 px-3 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-200 sm:py-2 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
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
                    setPinnedNoteIds((prev) => prev.filter((noteId) => noteId !== id));
                    fetchMyNotes();
                    toast.success("Đã dọn dẹp ghi chú!", { position: "top-center" });
                  }
                } catch (error) {
                  console.error(error);
                  toast.error("Lỗi hệ thống, thử lại sau!", { position: "top-center" });
                }
              }}
              className="w-full flex-1 rounded-lg bg-red-600 px-3 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-red-700 sm:py-2"
            >
              Xóa
            </button>
          </div>
        </div>
      ),
      getConfirmToastOptions()
    );
  };

  const handleToggleTimetableNote = async (note) => {
    const newNotes = timetableNotes.map((n) =>
      n.id === note.id && n.classId === note.classId ? { ...n, isDone: !n.isDone } : n
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
    } catch (error) {
      console.error(error);
      fetchTimetableNotes();
    }
  };

  const handleDeleteTimetableNote = (note) => {
    toast.custom(
      (t) => (
        <div className="flex w-[calc(100vw-1rem)] flex-col items-center rounded-t-2xl border border-gray-100 bg-white p-4 text-center shadow-xl animate-in fade-in zoom-in duration-300 sm:w-full sm:max-w-[360px] sm:rounded-2xl dark:border-gray-700 dark:bg-gray-800">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Xóa nhắc nhở?</h3>
          <p className="mb-4 mt-1 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
            Nhắc nhở môn <span className="font-bold text-gray-700 dark:text-gray-300">{note.subject}</span>{" "}
            sẽ bị xóa vĩnh viễn.
          </p>
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:gap-3">
            <button
              onClick={() => toast.dismiss(t)}
              className="w-full flex-1 rounded-lg bg-gray-100 px-3 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-200 sm:py-2 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              Hủy
            </button>
            <button
              onClick={async () => {
                toast.dismiss(t);
                setTimetableNotes((prev) => prev.filter((n) => n.id !== note.id));
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
                  toast.success("Đã xóa nhắc nhở thành công!", { position: "top-center" });
                } catch (error) {
                  console.error(error);
                  fetchTimetableNotes();
                  toast.error("Lỗi kết nối, đã khôi phục lại dữ liệu!", { position: "top-center" });
                }
              }}
              className="w-full flex-1 rounded-lg bg-red-600 px-3 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-red-700 sm:py-2"
            >
              Xóa
            </button>
          </div>
        </div>
      ),
      getConfirmToastOptions()
    );
  };

  const togglePinnedNote = (noteId) => {
    setPinnedNoteIds((prev) =>
      prev.includes(noteId) ? prev.filter((id) => id !== noteId) : [noteId, ...prev]
    );
  };

  const sortedMyNotes = [...myNotes].sort((a, b) => {
    const aPinned = pinnedNoteIds.includes(a._id);
    const bPinned = pinnedNoteIds.includes(b._id);
    if (aPinned !== bPinned) return aPinned ? -1 : 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const noteColumns = splitIntoColumns(sortedMyNotes, 2);

  return (
    <div className="grid grid-cols-1 gap-6 overflow-x-hidden animate-fade-in-up xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.9fr)]">
      <div className="space-y-6">
        <SectionHeader
          icon={StickyNote}
          title="Ghi chú của tôi"
          description="Bento board gọn hơn, đỡ loãng và tập trung vào nội dung."
          iconClassName="text-amber-500 dark:text-amber-300"
        />

        <div className={`${CARD_SHELL} p-4 sm:p-5`}>
          <motion.div
            layout
            onFocusCapture={() => setIsComposerFocused(true)}
            onBlurCapture={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) {
                setIsComposerFocused(false);
              }
            }}
            className={`relative overflow-hidden rounded-[1.75rem] border border-white/60 bg-white/80 px-4 py-3 shadow-inner shadow-white/30 transition-all duration-300 dark:border-white/10 dark:bg-slate-950/40 ${
              isComposerFocused ? "ring-4 ring-amber-400/10" : ""
            }`}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.14),transparent_48%),radial-gradient(circle_at_bottom_right,rgba(251,191,36,0.08),transparent_36%)]" />
            <div className="relative space-y-2 pb-16">
              <input
                className="w-full bg-transparent text-sm font-bold text-slate-600 outline-none placeholder:font-bold placeholder:text-slate-400 dark:text-slate-200 dark:placeholder:text-slate-500"
                style={GOOGLE_SANS_STACK}
                placeholder="VD: Mua giáo trình"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
              <textarea
                ref={composerTextareaRef}
                className="min-h-[96px] w-full resize-none bg-transparent text-sm font-light leading-6 text-slate-600 outline-none placeholder:text-slate-400 dark:text-slate-300 dark:placeholder:text-slate-500"
                placeholder="Nội dung ghi chú..."
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
              />
            </div>

            <motion.button
              type="button"
              whileHover={{ y: -2 }}
              transition={{ type: "spring", stiffness: 260, damping: 18 }}
              onClick={handleAddNote}
              className="absolute bottom-4 right-4 inline-flex w-fit items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-200/70 transition-all hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300/35 dark:bg-blue-500 dark:shadow-blue-900/30 dark:hover:bg-blue-400"
              aria-label="Thêm ghi chú"
            >
              <AddPlusIcon />
              <span
                className="text-[13px] font-bold leading-none"
                style={GOOGLE_SANS_STACK}
              >
                Thêm
              </span>
            </motion.button>

          </motion.div>
        </div>

        {sortedMyNotes.length > 0 ? (
          <div className={`${CARD_SHELL} p-4 sm:p-5`}>
            <div className="mb-4 flex items-center justify-between gap-3 px-1">
              <p
                className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500"
                style={GOOGLE_SANS_STACK}
              >
                Quick Notes
              </p>
              <span className="rounded-full border border-white/50 bg-white/60 px-3 py-1 text-[11px] font-medium text-slate-500 dark:border-white/10 dark:bg-slate-950/30 dark:text-slate-400">
                {sortedMyNotes.length} note{sortedMyNotes.length > 1 ? "s" : ""}
              </span>
            </div>
            <div className="hidden grid-cols-2 gap-4 md:grid">
              {noteColumns.map((column, columnIndex) => (
                <motion.div key={`note-column-${columnIndex}`} layout className="space-y-4">
                  <AnimatePresence initial={false}>
                    {column.map((note, noteIndex) => {
                      const noteStyle = getPastelStyle(note, noteIndex);
                      const isPinned = pinnedNoteIds.includes(note._id);

                      return (
                        <motion.article
                          key={note._id}
                          layout
                          initial={{ opacity: 0, y: 18, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 14, scale: 0.96 }}
                          transition={{ type: "spring", stiffness: 240, damping: 24 }}
                          className={`group relative overflow-hidden rounded-[1.75rem] border border-white/20 p-4 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/40 dark:border-white/10 dark:hover:shadow-black/20 ${noteStyle.card}`}
                        >
                          <div className="absolute right-3 top-3 z-10 flex items-center gap-2 opacity-0 translate-y-1 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                            <Tooltip text={isPinned ? "Bỏ ghim" : "Ghim"}>
                              <button
                                type="button"
                                onClick={() => togglePinnedNote(note._id)}
                                className={`flex h-8 w-8 items-center justify-center rounded-full border border-white/40 bg-white/40 text-slate-500 backdrop-blur-md transition-all hover:bg-white/70 hover:text-slate-800 dark:border-white/10 dark:bg-slate-950/35 dark:text-slate-400 dark:hover:bg-slate-900/70 dark:hover:text-slate-100 ${
                                  isPinned ? "text-amber-600 dark:text-amber-300" : ""
                                }`}
                              >
                                <Pin className="h-3.5 w-3.5" />
                              </button>
                            </Tooltip>
                            <Tooltip text="Xóa">
                              <button
                                type="button"
                                onClick={() => handleDeleteNote(note._id)}
                                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/40 bg-white/40 text-slate-500 backdrop-blur-md transition-all hover:bg-white/70 hover:text-rose-500 dark:border-white/10 dark:bg-slate-950/35 dark:text-slate-400 dark:hover:bg-slate-900/70"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </Tooltip>
                          </div>

                          <div className="pr-10">
                            <p
                              className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400"
                              style={GOOGLE_SANS_STACK}
                            >
                              {isPinned ? "Pinned Note" : "Quick Note"}
                            </p>
                            <h4
                              className="mt-2 text-[14px] font-semibold uppercase tracking-[0.16em] text-slate-800 dark:text-slate-100"
                              style={GOOGLE_SANS_STACK}
                            >
                              {note.title}
                            </h4>
                            <p className="mt-3 whitespace-pre-wrap text-[14px] font-light leading-6 text-slate-600 dark:text-slate-300">
                              {note.content}
                            </p>
                            <p
                              className={`mt-4 text-[10px] font-medium uppercase tracking-[0.2em] ${noteStyle.accent}`}
                              style={GOOGLE_SANS_STACK}
                            >
                              {new Date(note.createdAt).toLocaleDateString("vi-VN")}
                            </p>
                          </div>
                        </motion.article>
                      );
                    })}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
            <motion.div layout className="space-y-4 md:hidden">
              <AnimatePresence initial={false}>
                {sortedMyNotes.map((note, noteIndex) => {
                  const noteStyle = getPastelStyle(note, noteIndex);
                  const isPinned = pinnedNoteIds.includes(note._id);

                  return (
                    <motion.article
                      key={note._id}
                      layout
                      initial={{ opacity: 0, y: 18, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 14, scale: 0.96 }}
                      transition={{ type: "spring", stiffness: 240, damping: 24 }}
                      className={`group relative overflow-hidden rounded-[1.75rem] border border-white/20 p-4 backdrop-blur-md dark:border-white/10 ${noteStyle.card}`}
                    >
                      <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => togglePinnedNote(note._id)}
                          className={`flex h-8 w-8 items-center justify-center rounded-full border border-white/40 bg-white/40 text-slate-500 backdrop-blur-md transition-all dark:border-white/10 dark:bg-slate-950/35 dark:text-slate-400 ${
                            isPinned ? "text-amber-600 dark:text-amber-300" : ""
                          }`}
                        >
                          <Pin className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteNote(note._id)}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/40 bg-white/40 text-slate-500 backdrop-blur-md transition-all dark:border-white/10 dark:bg-slate-950/35 dark:text-slate-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="pr-10">
                        <p
                          className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400"
                          style={GOOGLE_SANS_STACK}
                        >
                          {isPinned ? "Pinned Note" : "Quick Note"}
                        </p>
                        <h4
                          className="mt-2 text-[14px] font-semibold uppercase tracking-[0.16em] text-slate-800 dark:text-slate-100"
                          style={GOOGLE_SANS_STACK}
                        >
                          {note.title}
                        </h4>
                        <p className="mt-3 whitespace-pre-wrap text-[14px] font-light leading-6 text-slate-600 dark:text-slate-300">
                          {note.content}
                        </p>
                        <p
                          className={`mt-4 text-[10px] font-medium uppercase tracking-[0.2em] ${noteStyle.accent}`}
                          style={GOOGLE_SANS_STACK}
                        >
                          {new Date(note.createdAt).toLocaleDateString("vi-VN")}
                        </p>
                      </div>
                    </motion.article>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          </div>
        ) : (
          <EmptyStateCard icon={FileText} text="Chưa có ghi chú nào cho Whalio note board." />
        )}
      </div>

      <div className="space-y-6">
        <SectionHeader
          icon={Bell}
          title="Nhắc nhở từ Thời khóa biểu"
          description="Danh sách pill gọn hơn để dashboard đỡ kéo dài theo chiều dọc."
          iconClassName="text-sky-500 dark:text-sky-300"
        />

        <motion.div layout className={`flex flex-col ${CARD_SHELL} p-4 sm:p-5`}>
          <div className="mb-4 flex items-center justify-between gap-3 px-1">
            <p
              className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500"
              style={GOOGLE_SANS_STACK}
            >
              Reminder List
            </p>
            {timetableNotes.length > 0 && (
              <span className="rounded-full border border-white/50 bg-sky-50/80 px-3 py-1 text-[11px] font-medium text-sky-600 dark:border-white/10 dark:bg-sky-500/10 dark:text-sky-300">
                {timetableNotes.length} mục
              </span>
            )}
          </div>

          <AnimatePresence initial={false}>
            {timetableNotes.length > 0 ? (
              <motion.div layout className="flex flex-wrap gap-3">
                {timetableNotes.map((note, idx) => (
                  <motion.button
                    key={`${note.classId}-${note.id}-${idx}`}
                    layout
                    type="button"
                    initial={{ opacity: 0, y: 18, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 14, scale: 0.96 }}
                    transition={{ type: "spring", stiffness: 220, damping: 22 }}
                    onClick={() => handleToggleTimetableNote(note)}
                    className={`group flex min-h-[88px] w-full items-start gap-3 rounded-[1.5rem] border px-4 py-3 text-left transition-all duration-300 ${
                      note.isDone
                        ? "border-white/20 bg-slate-100/70 opacity-70 dark:border-white/10 dark:bg-slate-800/60"
                        : "border-sky-100/80 bg-sky-50/90 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-sky-200/30 dark:border-sky-400/10 dark:bg-sky-500/10"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={note.isDone || false}
                      onChange={() => handleToggleTimetableNote(note)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1 h-4 w-4 shrink-0 cursor-pointer rounded-full border-white/50 bg-white/80 text-sky-600 accent-sky-500"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p
                          className={`truncate text-[12px] font-semibold uppercase tracking-[0.18em] ${
                            note.isDone
                              ? "text-slate-400 line-through"
                              : "text-sky-700 dark:text-sky-300"
                          }`}
                          style={GOOGLE_SANS_STACK}
                        >
                          {note.subject}
                        </p>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTimetableNote(note);
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded-full border border-white/50 bg-white/70 text-slate-400 opacity-0 transition-all duration-300 group-hover:opacity-100 hover:text-rose-500 dark:border-white/10 dark:bg-slate-900/50 dark:text-slate-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <p
                        className={`mt-1 line-clamp-2 text-sm font-light leading-5 ${
                          note.isDone ? "text-slate-400" : "text-slate-600 dark:text-slate-300"
                        }`}
                      >
                        {note.content}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {note.room && (
                          <span className="rounded-full bg-white/75 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500 dark:bg-slate-900/50 dark:text-slate-400">
                            {note.room}
                          </span>
                        )}
                        {note.deadline && (
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium ${
                              !note.isDone && new Date(note.deadline) < new Date()
                                ? "bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300"
                                : "bg-white/75 text-slate-500 dark:bg-slate-900/50 dark:text-slate-400"
                            }`}
                          >
                            <Clock className="h-3 w-3" />
                            {new Date(note.deadline).toLocaleDateString("vi-VN")}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.button>
                ))}
              </motion.div>
            ) : (
              <EmptyStateCard
                icon={Bell}
                text="Chưa có nhắc nhở nào trong thời khóa biểu."
                tall
              />
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};

export default DashboardNotesTab;
