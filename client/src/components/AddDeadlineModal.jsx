import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { X, Calendar, Clock, Save, Tag, Plus } from "lucide-react";

const DEFAULT_DEADLINE_TAGS = ["Công việc", "Dự án", "Học bài", "Hạn chót"];
const DEADLINE_TAG_STORAGE_KEY = "whalio_deadline_tags_v1";

const buildDeadlineDate = (date, time) => {
  const composed = `${date}T${time}:00`;
  const parsed = new Date(composed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const AddDeadlineModal = ({ isOpen, onClose, onSuccess, username }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState("23:59");
  const [deadlineTag, setDeadlineTag] = useState(DEFAULT_DEADLINE_TAGS[0]);
  const [customTag, setCustomTag] = useState("");
  const [tagOptions, setTagOptions] = useState(DEFAULT_DEADLINE_TAGS);
  const [loading, setLoading] = useState(false);

  const mergedTagOptions = useMemo(() => {
    const safe = tagOptions
      .map((item) => String(item || "").trim())
      .filter(Boolean);
    const unique = Array.from(new Set([...DEFAULT_DEADLINE_TAGS, ...safe]));
    return unique.slice(0, 16);
  }, [tagOptions]);

  useEffect(() => {
    if (!isOpen) return;
    try {
      const raw = localStorage.getItem(DEADLINE_TAG_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      setTagOptions(parsed);
    } catch {
      setTagOptions(DEFAULT_DEADLINE_TAGS);
    }
  }, [isOpen]);

  useEffect(() => {
    try {
      localStorage.setItem(
        DEADLINE_TAG_STORAGE_KEY,
        JSON.stringify(mergedTagOptions)
      );
    } catch {
      // ignore storage errors
    }
  }, [mergedTagOptions]);

  if (!isOpen) return null;

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDate(new Date().toISOString().split("T")[0]);
    setTime("23:59");
    setDeadlineTag(DEFAULT_DEADLINE_TAGS[0]);
    setCustomTag("");
  };

  const handleAddTag = () => {
    const nextTag = customTag.trim();
    if (!nextTag) return;
    const exists = mergedTagOptions.some(
      (item) => item.toLowerCase() === nextTag.toLowerCase()
    );
    if (!exists) {
      setTagOptions((prev) => [...prev, nextTag]);
    }
    setDeadlineTag(nextTag);
    setCustomTag("");
  };

  const handleSubmit = async () => {
    if (!username) {
      toast.error("Không tìm thấy tài khoản đăng nhập.");
      return;
    }

    if (!title.trim()) {
      toast.warning("Quên đặt tên rồi kìa bạn!", {
        description: "Vui lòng đặt tên Deadline.",
      });
      return;
    }

    if (!date || !time) {
      toast.warning("Thiếu ngày hoặc giờ deadline.");
      return;
    }

    const finalDate = buildDeadlineDate(date, time);
    if (!finalDate) {
      toast.warning("Ngày giờ chưa hợp lệ.", {
        description: "Vui lòng chọn lại ngày/giờ deadline.",
      });
      return;
    }

    const normalizedTag = String(deadlineTag || "").trim() || "Công việc";

    setLoading(true);
    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          title: title.trim(),
          description: description.trim(),
          date: finalDate.toISOString(),
          type: "deadline",
          deadlineTag: normalizedTag,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (data.success) {
        toast.success("Thêm deadline thành công!");
        resetForm();
        onSuccess?.();
        onClose?.();
      } else {
        toast.error(data.message || "Không thể thêm deadline.");
      }
    } catch (error) {
      console.error("Lỗi thêm deadline:", error);
      toast.error("Không thể kết nối đến server!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-2xl sm:p-6">
        <div className="mb-5 flex items-center justify-between border-b border-gray-200 pb-4">
          <h3 className="flex items-center gap-2 text-xl font-bold text-gray-800">
            <Calendar className="text-blue-600" size={22} /> Thêm Deadline mới
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="Đóng modal"
          >
            <X size={22} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">
              Tiêu đề
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ví dụ: Nộp báo cáo cuối kỳ"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-gray-800 outline-none transition-colors focus:border-blue-300 focus:ring-2 focus:ring-blue-200"
              autoFocus
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">
              Mô tả
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả chi tiết deadline (không bắt buộc)"
              rows={3}
              className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-gray-800 outline-none transition-colors focus:border-blue-300 focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">
                Ngày hết hạn
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-3 outline-none transition-colors focus:border-blue-300 focus:ring-2 focus:ring-blue-200"
                />
                <Calendar
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={17}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">
                Giờ
              </label>
              <div className="relative">
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-3 outline-none transition-colors focus:border-blue-300 focus:ring-2 focus:ring-blue-200"
                />
                <Clock
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={17}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">
              Tag loại deadline
            </label>
            <div className="mb-2 flex flex-wrap gap-2">
              {mergedTagOptions.map((tagName) => (
                <button
                  key={tagName}
                  type="button"
                  onClick={() => setDeadlineTag(tagName)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    deadlineTag === tagName
                      ? "border-blue-300 bg-blue-50 text-blue-700"
                      : "border-gray-200 bg-white text-gray-600 hover:border-blue-200 hover:bg-blue-50/50"
                  }`}
                >
                  {tagName}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="Tạo tag mới..."
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-sm outline-none transition-colors focus:border-blue-300 focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <button
                type="button"
                onClick={handleAddTag}
                className="inline-flex items-center gap-1 rounded-xl border border-blue-200 bg-blue-50 px-3 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100"
              >
                <Plus size={14} />
                Thêm
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button
            onClick={onClose}
            type="button"
            className="w-full rounded-xl bg-gray-100 py-3 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-200 sm:flex-1"
          >
            Hủy bỏ
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            type="button"
            className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-200 transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70 sm:flex-1"
          >
            {loading ? (
              "Đang lưu..."
            ) : (
              <span className="inline-flex items-center gap-2">
                <Save size={16} /> Lưu Deadline
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddDeadlineModal;
