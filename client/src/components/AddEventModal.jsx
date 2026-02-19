import React, { useState, useEffect } from "react";
import { X, Calendar, Clock, MapPin, Save } from "lucide-react";
import { toast } from "sonner";

const AddEventModal = ({ isOpen, onClose, onSuccess, username, defaultDate }) => {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(defaultDate || new Date().toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [location, setLocation] = useState("");
  const [type, setType] = useState("personal");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitle("");
      setDate(defaultDate || new Date().toISOString().split("T")[0]);
      setStartTime("09:00");
      setEndTime("10:00");
      setLocation("");
      setType("personal");
    }
  }, [isOpen, defaultDate]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Vui lòng nhập tên sự kiện!");
      return;
    }

    if (!date) {
      toast.error("Vui lòng chọn ngày!");
      return;
    }

    // Tạo datetime từ date và startTime
    const eventDate = new Date(`${date}T${startTime}:00`);
    
    if (isNaN(eventDate.getTime())) {
      toast.error("Ngày giờ không hợp lệ!");
      return;
    }

    setLoading(true);

    // Tạo description từ thông tin thời gian và địa điểm
    const timeInfo = `${startTime} - ${endTime}`;
    const description = location.trim() 
      ? `📍 ${location.trim()}\n⏰ ${timeInfo}`
      : `⏰ ${timeInfo}`;

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          title: title.trim(),
          date: eventDate.toISOString(),
          type: type === "personal" ? "other" : type, // Map loại sự kiện
          description: description,
          deadlineTag: "Lịch trình", // Tag mặc định cho sự kiện
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success("✅ Đã thêm lịch trình!");
        onSuccess?.();
        onClose();
      } else {
        toast.error(data.message || "Không thể thêm lịch trình");
      }
    } catch (error) {
      console.error("Lỗi thêm sự kiện:", error);
      toast.error("Có lỗi xảy ra khi thêm lịch trình");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500 text-white shadow-md">
              <Calendar size={22} />
            </div>
            <div>
              <h3 className="font-bold text-xl text-gray-900 dark:text-white">
                Thêm Lịch Trình Mới
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                Tạo sự kiện cá nhân trong ngày
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="text-gray-500 dark:text-gray-400" size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Tên sự kiện */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              Tên sự kiện *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Họp nhóm, Gặp bạn bè..."
              className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 dark:text-white placeholder-gray-400"
            />
          </div>

          {/* Ngày và giờ */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5">
                <Calendar size={14} className="text-gray-400" />
                Ngày
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5">
                <Clock size={14} className="text-gray-400" />
                Giờ bắt đầu
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Giờ kết thúc (optional) */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5">
              <Clock size={14} className="text-gray-400" />
              Giờ kết thúc (tùy chọn)
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
            />
          </div>

          {/* Địa điểm */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5">
              <MapPin size={14} className="text-gray-400" />
              Địa điểm (tùy chọn)
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="VD: Phòng A101, Quán cà phê..."
              className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white placeholder-gray-400"
            />
          </div>

          {/* Loại sự kiện */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              Loại sự kiện
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
            >
              <option value="personal">Cá nhân</option>
              <option value="meeting">Họp/Gặp gỡ</option>
              <option value="study">Học tập</option>
              <option value="other">Khác</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-3 rounded-xl text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 font-semibold transition-colors disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-200/50 dark:shadow-blue-900/30 transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Đang lưu...
              </>
            ) : (
              <>
                <Save size={18} />
                Lưu lịch trình
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddEventModal;
