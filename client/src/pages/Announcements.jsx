import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Bell, Plus, Pencil, Trash2, CalendarClock, Tag, Image as ImageIcon, X } from "lucide-react";
import { announcementService } from "../services/announcementService";

const TYPE_OPTIONS = [
  { value: "all", label: "Tất cả" },
  { value: "new-feature", label: "Tính năng mới" },
  { value: "update", label: "Bản cập nhật" },
  { value: "maintenance", label: "Lịch bảo trì" },
  { value: "other", label: "Thông tin khác" },
];

const formatDateTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("vi-VN", {
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const AnnouncementModal = ({ isOpen, onClose, onSubmit, initialData }) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState("other");
  const [imageFile, setImageFile] = useState(null);
  const [keepImage, setKeepImage] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setTitle(initialData?.title || "");
    setContent(initialData?.content || "");
    setType(initialData?.type || "other");
    setImageFile(null);
    setKeepImage(Boolean(initialData?.image));
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-gray-700 dark:bg-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
            {initialData ? "Sửa thông báo" : "Thêm thông báo"}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Tiêu đề thông báo"
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Nội dung thông báo"
            rows={5}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            {TYPE_OPTIONS.filter((x) => x.value !== "all").map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
          {initialData?.image && (
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <input
                type="checkbox"
                checked={keepImage}
                onChange={(e) => setKeepImage(e.target.checked)}
              />
              Giữ ảnh hiện tại nếu không chọn ảnh mới
            </label>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 dark:border-gray-600 dark:text-gray-200"
          >
            Hủy
          </button>
          <button
            onClick={() =>
              onSubmit({
                title,
                content,
                type,
                imageFile,
                keepImage,
              })
            }
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
          >
            {initialData ? "Lưu chỉnh sửa" : "Đăng thông báo"}
          </button>
        </div>
      </div>
    </div>
  );
};

const Announcements = ({ user }) => {
  const [announcements, setAnnouncements] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const isAdmin = user?.role === "admin";

  const loadAnnouncements = async () => {
    setLoading(true);
    const result = await announcementService.getAnnouncements();
    if (!result.success) {
      toast.error(result.message || "Không tải được thông báo");
      setAnnouncements([]);
      setLoading(false);
      return;
    }
    setAnnouncements(result.announcements || []);
    setLoading(false);
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const filteredItems = useMemo(() => {
    if (activeFilter === "all") return announcements;
    return announcements.filter((item) => item.type === activeFilter);
  }, [activeFilter, announcements]);

  const handleSubmit = async ({ title, content, type, imageFile, keepImage }) => {
    if (!title.trim() || !content.trim()) {
      toast.error("Vui lòng nhập tiêu đề và nội dung");
      return;
    }
    if (!user?.username) {
      toast.error("Bạn cần đăng nhập");
      return;
    }

    const formData = new FormData();
    formData.append("username", user.username);
    formData.append("title", title.trim());
    formData.append("content", content.trim());
    formData.append("type", type);
    formData.append("keepImage", keepImage ? "true" : "false");
    if (imageFile) formData.append("image", imageFile);

    const result = editing
      ? await announcementService.updateAnnouncement(editing.id, formData)
      : await announcementService.createAnnouncement(formData);

    if (!result.success) {
      toast.error(result.message || "Không lưu được thông báo");
      return;
    }

    toast.success(editing ? "Đã cập nhật thông báo" : "Đã thêm thông báo");
    setIsModalOpen(false);
    setEditing(null);
    loadAnnouncements();
  };

  const handleDelete = async (id) => {
    if (!user?.username) return;
    const ok = window.confirm("Bạn chắc chắn muốn xóa thông báo này?");
    if (!ok) return;
    const result = await announcementService.deleteAnnouncement(id, user.username);
    if (!result.success) {
      toast.error(result.message || "Không xóa được thông báo");
      return;
    }
    toast.success("Đã xóa thông báo");
    if (expandedId === id) setExpandedId(null);
    loadAnnouncements();
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-wrap items-center gap-2">
          <div className="mr-auto flex items-center gap-2 text-lg font-bold text-gray-800 dark:text-gray-100">
            <Bell size={20} className="text-blue-600" />
            Thông báo từ Admin
          </div>
          {isAdmin && (
            <button
              onClick={() => {
                setEditing(null);
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Plus size={16} />
              Thêm thông báo
            </button>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {TYPE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setActiveFilter(option.value)}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                activeFilter === option.value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {loading && (
          <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
            Đang tải thông báo...
          </div>
        )}

        {!loading && filteredItems.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-800">
            Chưa có thông báo trong mục này.
          </div>
        )}

        {!loading &&
          filteredItems.map((item) => (
            <div key={item.id} className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div
                className="cursor-pointer"
                onClick={() => setExpandedId((prev) => (prev === item.id ? null : item.id))}
              >
                <div className="flex items-start gap-3">
                  <div className="h-16 w-16 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-700">
                    {item.image ? (
                      <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-gray-400">
                        <ImageIcon size={20} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-base font-bold text-gray-800 dark:text-gray-100">{item.title}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <span className="inline-flex items-center gap-1">
                        <Tag size={12} />
                        {TYPE_OPTIONS.find((x) => x.value === item.type)?.label || "Thông tin khác"}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <CalendarClock size={12} />
                        {formatDateTime(item.createdAt)}
                      </span>
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditing(item);
                          setIsModalOpen(true);
                        }}
                        className="rounded-lg p-1.5 text-gray-500 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-gray-700"
                        aria-label="Sửa thông báo"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(item.id);
                        }}
                        className="rounded-lg p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-gray-700"
                        aria-label="Xóa thông báo"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {expandedId === item.id && (
                <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-700/40">
                  <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100">{item.title}</h4>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-200">{item.content}</p>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Đăng lúc: {formatDateTime(item.createdAt)}
                  </p>
                </div>
              )}
            </div>
          ))}
      </div>

      <AnnouncementModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditing(null);
        }}
        onSubmit={handleSubmit}
        initialData={editing}
      />
    </div>
  );
};

export default Announcements;
