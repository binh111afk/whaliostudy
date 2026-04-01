import React, { useState, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import AvatarWithFrame from "../components/AvatarWithFrame";
import EditProfileModal from "../components/EditProfileModal";
import ChangePasswordModal from "../components/ChangePasswordModal";
import { UploadModal } from "../components/DocumentModals";
import { documentService } from "../services/documentService";
import { userService } from "../services/userService";
import { studyService } from "../services/studyService";
import { getFullApiUrl } from '../config/apiConfig';
import {
  User,
  FileText,
  Edit2,
  Lock,
  BarChart3,
  Settings,
  Upload,
  FileType,
  Calendar,
  Eye,
  Grid3X3,
  List,
  Clock,
  BookOpen,
  Target,
  TrendingUp,
  PieChart as PieChartIcon,
  RefreshCw,
  AlertCircle,
  Search,
  Plus,
  Copy,
  Check,
  EyeOff,
  ShieldEllipsis,
  Vault,
} from "lucide-react";
import {
  siApple,
  siDiscord,
  siFacebook,
  siGithub,
  siGmail,
  siGoogle,
  siInstagram,
  siTelegram,
  siTiktok,
  siX,
  siYoutube,
} from "simple-icons/icons";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

// ==================== HELPER COMPONENTS ====================
const PRIVACY_SUGGESTIONS = ["Facebook", "Instagram", "Gmail", "TikTok"];

const normalizePlatformName = (value = "") =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");

const PRIVACY_ICON_CATALOG = [
  { icon: siFacebook, aliases: ["facebook", "fb", "meta"] },
  { icon: siInstagram, aliases: ["instagram", "insta", "ig"] },
  { icon: siGmail, aliases: ["gmail", "googlemail"] },
  { icon: siGoogle, aliases: ["google", "googleaccount"] },
  { icon: siTiktok, aliases: ["tiktok", "tik tok", "tt"] },
  { icon: siDiscord, aliases: ["discord"] },
  { icon: siGithub, aliases: ["github", "git hub"] },
  { icon: siTelegram, aliases: ["telegram", "tele"] },
  { icon: siApple, aliases: ["apple", "icloud", "appleid"] },
  { icon: siX, aliases: ["x", "twitter", "xcom"] },
  { icon: siYoutube, aliases: ["youtube", "yt"] },
];

const PRIVACY_ICON_MAP = new Map(
  PRIVACY_ICON_CATALOG.map((item) => [item.icon.slug, item])
);

const resolvePrivacyPlatform = (platformName = "") => {
  const normalized = normalizePlatformName(platformName);
  const matched = PRIVACY_ICON_CATALOG.find((item) =>
    item.aliases.some((alias) => normalized.includes(normalizePlatformName(alias)))
  );

  if (!matched) {
    return {
      label: platformName.trim() || "Tài khoản",
      normalizedPlatform: normalized,
      iconSlug: "",
      iconHex: "",
      iconTitle: "",
      simpleIcon: null,
      tintClass: "bg-slate-100",
      ringClass: "ring-slate-200/80",
    };
  }

  return {
    label: platformName.trim() || matched.icon.title,
    normalizedPlatform: normalized,
    iconSlug: matched.icon.slug,
    iconHex: matched.icon.hex,
    iconTitle: matched.icon.title,
    simpleIcon: matched.icon,
    tintClass: "bg-slate-100",
    ringClass: "ring-slate-200/80",
  };
};

const resolveStoredPrivacyPlatform = (account = {}) => {
  const storedEntry = account.iconSlug ? PRIVACY_ICON_MAP.get(account.iconSlug) : null;
  const stored = storedEntry
    ? {
        label: account.platform?.trim() || storedEntry.icon.title,
        normalizedPlatform:
          account.normalizedPlatform ||
          normalizePlatformName(account.platform || storedEntry.icon.title),
        iconSlug: storedEntry.icon.slug,
        iconHex: storedEntry.icon.hex,
        iconTitle: storedEntry.icon.title,
        simpleIcon: storedEntry.icon,
        tintClass: "bg-slate-100",
        ringClass: "ring-slate-200/80",
      }
    : resolvePrivacyPlatform(account.platform);

  return {
    label: account.platform?.trim() || stored.label || "Tài khoản",
    normalizedPlatform:
      account.normalizedPlatform ||
      normalizePlatformName(account.platform || stored.label),
    iconSlug: account.iconSlug || stored.iconSlug || "",
    iconHex: account.iconHex || stored.iconHex || "",
    iconTitle: account.iconTitle || stored.iconTitle || "",
    simpleIcon: stored.simpleIcon || null,
    tintClass: "bg-slate-100",
    ringClass: "ring-slate-200/80",
  };
};

const PlatformLogo = ({ account, className = "" }) => {
  const meta = resolveStoredPrivacyPlatform(account);

  if (meta.simpleIcon) {
    return (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className={className}
        fill={`#${meta.iconHex || meta.simpleIcon.hex || "64748B"}`}
      >
        <path d={meta.simpleIcon.path} />
      </svg>
    );
  }

  return <ShieldEllipsis className={className} />;
};

const maskPassword = (password = "") =>
  "•".repeat(Math.max(8, Math.min(password.length || 8, 16)));

const PRIVACY_CHIP_STYLES = {
  Facebook:
    "border-[#1877F2]/20 bg-[#1877F2] text-white shadow-[0_10px_24px_-16px_rgba(24,119,242,0.85)]",
  Instagram:
    "border-transparent bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 text-white shadow-[0_10px_24px_-16px_rgba(225,48,108,0.85)]",
  Gmail:
    "border-[#EA4335]/20 bg-[#EA4335] text-white shadow-[0_10px_24px_-16px_rgba(234,67,53,0.85)]",
  TikTok:
    "border-[#111111]/20 bg-[#111111] text-white shadow-[0_10px_24px_-16px_rgba(17,17,17,0.85)]",
};

const DisplayRow = ({ label, value, isLink }) => (
  <div className="flex items-center py-4 border-b border-gray-50 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 px-2 transition-colors -mx-2 rounded-lg">
    <span className="w-1/3 text-gray-500 dark:text-gray-400 font-medium text-sm">
      {label}
    </span>
    {isLink && value ? (
      <a
        href={value}
        target="_blank"
        rel="noreferrer"
        className="flex-1 text-blue-600 dark:text-blue-400 hover:underline font-medium truncate"
      >
        {value}
      </a>
    ) : (
      <span
        className={`flex-1 font-medium truncate ${
          value
            ? "text-gray-800 dark:text-gray-200"
            : "text-gray-400 dark:text-gray-500 italic"
        }`}
      >
        {value || "Chưa cập nhật"}
      </span>
    )}
  </div>
);

// File icon based on type
const FileIcon = ({ type }) => {
  const iconClass =
    type === "pdf"
      ? "text-red-500 dark:text-red-400"
      : "text-blue-500 dark:text-blue-400";
  return <FileType className={`w-8 h-8 ${iconClass}`} />;
};

// Stat Box Component
const StatBox = ({ icon: Icon, label, value, color, bgColor }) => (
  <div
    className={`${bgColor} rounded-xl p-4 border border-gray-100 dark:border-gray-700`}
  >
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-xl font-bold text-gray-800 dark:text-white">
          {value}
        </p>
      </div>
    </div>
  </div>
);

const PrivacyAccountModal = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isSubmitting,
}) => {
  const [platform, setPlatform] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setPlatform(initialData?.platform || "");
    setUsername(initialData?.username || "");
    setPassword(initialData?.password || "");
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!platform.trim() || !username.trim() || !password.trim()) {
      toast.error("Vui lòng nhập đủ nền tảng, tài khoản và mật khẩu.");
      return;
    }
    onSubmit({
      platform: platform.trim(),
      username: username.trim(),
      password,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 18, scale: 0.98 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="w-full max-w-md rounded-[2rem] border border-white/50 bg-white/90 p-5 shadow-[0_30px_80px_-30px_rgba(15,23,42,0.35)] backdrop-blur-xl dark:border-emerald-500/20 dark:bg-slate-900/90"
        style={{ fontFamily: "'Google Sans', 'Plus Jakarta Sans', sans-serif" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-500">
            Privacy Vault
          </p>
          <h3
            className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white"
          >
            Thêm tài khoản mới
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Lưu lại tài khoản cá nhân trong kho riêng tư của bạn.
          </p>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {PRIVACY_SUGGESTIONS.map((item) => (
            <motion.button
              key={item}
              onClick={() => setPlatform(item)}
              whileTap={{ scale: 0.95 }}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium tracking-tight transition ${
                platform === item
                  ? PRIVACY_CHIP_STYLES[item] ||
                    "border-indigo-400 bg-indigo-500 text-white"
                  : "border-slate-200 bg-white/70 text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white"
              }`}
            >
              {item}
            </motion.button>
          ))}
        </div>

        <div className="space-y-3">
          <input
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            placeholder="Tên nền tảng"
            className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm tracking-tight text-slate-800 outline-none transition focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-950/60 dark:text-white dark:focus:border-emerald-500"
          />
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Tài khoản"
            className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm tracking-tight text-slate-800 outline-none transition focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-950/60 dark:text-white dark:focus:border-emerald-500"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mật khẩu"
            type="password"
            className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm tracking-tight text-slate-800 outline-none transition focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-950/60 dark:text-white dark:focus:border-emerald-500"
          />
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600"
          >
            {isSubmitting
              ? "Đang lưu..."
              : initialData
                ? "Lưu thay đổi"
                : "Lưu tài khoản"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ==================== TAB COMPONENTS ====================

// Tab: Tài liệu của tôi (My Documents)
const MyDocumentsTab = ({ currentUser }) => {
  const [viewMode, setViewMode] = useState("grid");
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Load documents
  const loadDocuments = async () => {
    setLoading(true);
    try {
      const data = await documentService.getDocuments();
      const myDocs = (data || []).filter(
        (doc) =>
          doc.uploaderUsername === currentUser?.username &&
          doc.visibility === "private"
      );
      setDocuments(myDocs);
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch documents on mount
  useEffect(() => {
    if (currentUser?.username) {
      loadDocuments();
    }
  }, [currentUser]);

  // Format file size
  const formatSize = (bytes) => {
    if (!bytes) return "0 KB";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Handle upload
  const handleUpload = async (formData) => {
    try {
      // Force visibility to private for profile uploads
      formData.set("visibility", "private");
      const res = await documentService.uploadDocument(formData);
      if (res.success) {
        alert("Tải lên thành công!");
        loadDocuments();
      } else {
        alert("Lỗi: " + res.message);
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Có lỗi xảy ra khi tải lên tài liệu!");
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-10 text-center animate-fade-in-up">
        <RefreshCw className="w-10 h-10 mx-auto mb-4 text-blue-500 animate-spin" />
        <p className="text-gray-500 dark:text-gray-400">Đang tải...</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 md:p-8 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h3 className="text-2xl font-bold text-gray-800 dark:text-white">
            Tài liệu của tôi
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Quản lý tài liệu riêng tư của bạn ({documents.length} tài liệu)
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-md transition-colors ${
                viewMode === "grid"
                  ? "bg-white dark:bg-gray-600 shadow-sm"
                  : "hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              <Grid3X3 size={16} className="text-gray-600 dark:text-gray-300" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-md transition-colors ${
                viewMode === "list"
                  ? "bg-white dark:bg-gray-600 shadow-sm"
                  : "hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              <List size={16} className="text-gray-600 dark:text-gray-300" />
            </button>
          </div>
          {/* Upload Button */}
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors shadow-sm cursor-pointer"
          >
            <Upload size={16} /> Tải tài liệu lên
          </button>
        </div>
      </div>

      {/* Documents List/Grid */}
      {documents.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📂</div>
          <h4 className="text-lg font-medium text-gray-800 dark:text-white mb-2">
            Chưa có tài liệu riêng tư nào
          </h4>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Bạn chưa upload tài liệu riêng tư nào. Hãy vào trang Tài liệu để
            upload!
          </p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            Upload ngay
          </button>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <div
              key={doc._id || doc.id}
              className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-100 dark:border-gray-600 hover:shadow-md transition-shadow cursor-pointer group"
            >
              <div className="flex items-start gap-3">
                <FileIcon type={doc.type} />
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-800 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                    {doc.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <Calendar size={12} />
                    <span>
                      {doc.date ||
                        new Date(doc.createdAt).toLocaleDateString("vi-VN")}
                    </span>
                    <span>•</span>
                    <span>{formatSize(doc.size)}</span>
                  </div>
                  <div className="mt-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs rounded-full">
                      <Eye size={10} /> Riêng tư
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc._id || doc.id}
              className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600 hover:shadow-md transition-shadow cursor-pointer group"
            >
              <FileIcon type={doc.type} />
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-800 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  {doc.name}
                </h4>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <span>
                  {doc.date ||
                    new Date(doc.createdAt).toLocaleDateString("vi-VN")}
                </span>
                <span>{formatSize(doc.size)}</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs rounded-full">
                  <Eye size={10} /> Riêng tư
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={handleUpload}
        currentUser={currentUser}
      />
    </div>
  );
};

// Tab: Cấu hình học tập (Academic Settings)
const AcademicSettingsTab = ({ currentUser, onUpdateUser }) => {
  const [settings, setSettings] = useState({
    creditPrice: currentUser?.settings?.creditPrice || 450000,
    gpaScale: currentUser?.settings?.gpaScale || 4,
    startHour: currentUser?.settings?.startHour || "07:00",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await userService.updateSettings(
        currentUser.username,
        settings
      );
      if (result.success) {
        alert("Đã lưu cấu hình học tập thành công!");
        // Update user state in parent if callback exists
        if (onUpdateUser && result.user) {
          onUpdateUser(result.user);
        }
      } else {
        alert("Lỗi: " + (result.message || "Không thể lưu cấu hình"));
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Đã xảy ra lỗi khi lưu cấu hình!");
    } finally {
      setSaving(false);
    }
  };

  const startHourOptions = [
    "06:30",
    "07:00",
    "07:30",
    "08:00",
    "08:30",
    "09:00",
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 md:p-8 animate-fade-in-up">
      <div className="mb-8">
        <h3 className="text-2xl font-bold text-gray-800 dark:text-white">
          Cấu hình học tập
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Cài đặt các thông số hệ thống cho tính toán học tập
        </p>
      </div>

      <div className="space-y-6 max-w-2xl">
        {/* Credit Price Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Đơn giá tín chỉ (VNĐ)
          </label>
          <div className="relative">
            <input
              type="number"
              value={settings.creditPrice}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  creditPrice: Number(e.target.value),
                })
              }
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="450000"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
              VNĐ/tín chỉ
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Dùng để tính học phí dự kiến mỗi kỳ
          </p>
        </div>

        {/* GPA Scale Select */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Hệ điểm
          </label>
          <select
            value={settings.gpaScale}
            onChange={(e) =>
              setSettings({ ...settings, gpaScale: Number(e.target.value) })
            }
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer"
          >
            <option value={4}>Hệ 4 (GPA tối đa: 4.0)</option>
            <option value={10}>Hệ 10 (GPA tối đa: 10.0)</option>
          </select>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Chọn hệ điểm trường bạn đang áp dụng
          </p>
        </div>

        {/* Start Hour Select */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Giờ bắt đầu tiết 1
          </label>
          <select
            value={settings.startHour}
            onChange={(e) =>
              setSettings({ ...settings, startHour: e.target.value })
            }
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer"
          >
            {startHourOptions.map((hour) => (
              <option key={hour} value={hour}>
                {hour}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Dùng để tính toán thời khóa biểu và lịch học
          </p>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-4">
          <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">
            Thông tin cấu hình hiện tại
          </h4>
          <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
            <li>
              • Học phí mỗi tín chỉ:{" "}
              {settings.creditPrice.toLocaleString("vi-VN")} VNĐ
            </li>
            <li>• Thang điểm: Hệ {settings.gpaScale}</li>
            <li>• Tiết 1 bắt đầu lúc: {settings.startHour}</li>
          </ul>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full sm:w-auto px-8 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {saving && <RefreshCw size={16} className="animate-spin" />}
          {saving ? "Đang lưu..." : "Lưu cấu hình"}
        </button>
      </div>
    </div>
  );
};

// Tab: Thống kê học tập (Statistics)
const StatisticsTab = ({ currentUser }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const COLORS = ["#3B82F6", "#10B981", "#F59E0B"];

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => setIsLoaded(true));
    return () => window.cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    const calculateFallbackFromSemesters = (semesters = []) => {
      const roundScore10 = (score) =>
        Math.round((score + Number.EPSILON) * 10) / 10;
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

      let registeredCredits = 0;
      let passedCredits = 0;
      const gpaSummary = [];

      semesters.forEach((sem, semIndex) => {
        let semTotalScore = 0;
        let semTotalCredits = 0;
        (sem.subjects || []).forEach((sub) => {
          const credits = parseFloat(sub.credits) || 0;
          registeredCredits += credits;
          let weightedScore10 = 0;
          let totalWeight = 0;

          (sub.components || []).forEach((comp) => {
            if (
              comp.score === "" ||
              comp.score === null ||
              comp.score === undefined
            ) {
              return;
            }
            const score = parseFloat(comp.score);
            const weight = parseFloat(comp.weight);
            if (!Number.isNaN(score) && !Number.isNaN(weight)) {
              weightedScore10 += score * (weight / 100);
              totalWeight += weight;
            }
          });

          if (totalWeight >= 99.9) {
            const finalScore10 = roundScore10(weightedScore10);
            const subScore4 = convertToGPA4(finalScore10);
            semTotalScore += subScore4 * credits;
            semTotalCredits += credits;

            const isPassed =
              sub.type === "major" ? finalScore10 >= 5.5 : finalScore10 >= 4.0;
            if (isPassed) passedCredits += credits;
          }
        });

        if (semTotalCredits > 0) {
          gpaSummary.push({
            semester: sem.name || `Kỳ ${semIndex + 1}`,
            gpa: Number((semTotalScore / semTotalCredits).toFixed(2)),
          });
        }
      });

      return {
        gpaSummary,
        registeredCredits,
        passedCredits,
      };
    };

    const fetchStats = async () => {
      try {
        const [profileRes, studyRes, gpaResRaw] = await Promise.all([
          userService.getProfileStats(currentUser?.username),
          studyService.getStats(currentUser?.username),
          fetch(getFullApiUrl(`/api/gpa?username=${currentUser?.username}`)).then((r) =>
            r.json()
          ),
        ]);

        const profileStats = profileRes?.success ? profileRes.data || {} : {};
        const totalStudyMinutes = (studyRes?.success ? studyRes.data || [] : []).reduce(
          (acc, item) => acc + (Number(item.minutes) || 0),
          0
        );
        const fallbackHours = Number((totalStudyMinutes / 60).toFixed(1));

        const semesterSource =
          gpaResRaw?.success && Array.isArray(gpaResRaw.semesters)
            ? gpaResRaw.semesters
            : [];
        const gpaFallback = calculateFallbackFromSemesters(semesterSource);

        const targetCredits = Number(currentUser?.totalTargetCredits) || 150;
        const totalCredits =
          Number(profileStats.totalCredits) ||
          Math.max(targetCredits, gpaFallback.registeredCredits);
        const completedCredits =
          Number(profileStats.completedCredits) || gpaFallback.passedCredits;
        const inProgressCredits = Math.max(
          0,
          gpaFallback.registeredCredits - gpaFallback.passedCredits
        );
        const remainingCredits = Math.max(
          0,
          totalCredits - completedCredits - inProgressCredits
        );

        const mergedStats = {
          ...profileStats,
          totalHours: Number(profileStats.totalHours) || fallbackHours,
          thisWeekHours: Number(profileStats.thisWeekHours) || fallbackHours,
          totalCredits,
          completedCredits,
          gpaSummary:
            Array.isArray(profileStats.gpaSummary) && profileStats.gpaSummary.length > 0
              ? profileStats.gpaSummary
              : gpaFallback.gpaSummary,
          creditDistribution:
            Array.isArray(profileStats.creditDistribution) &&
            profileStats.creditDistribution.length > 0
              ? profileStats.creditDistribution
              : [
                  {
                    name: "Đã hoàn thành",
                    value: completedCredits,
                    color: "#10B981",
                  },
                  {
                    name: "Đang học",
                    value: inProgressCredits,
                    color: "#3B82F6",
                  },
                  {
                    name: "Còn lại",
                    value: remainingCredits,
                    color: "#F59E0B",
                  },
                ],
        };

        setStats(mergedStats);
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };
    if (currentUser?.username) {
      fetchStats();
    }
  }, [currentUser]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-10 text-center animate-fade-in-up">
        <RefreshCw className="w-10 h-10 mx-auto mb-4 text-blue-500 animate-spin" />
        <p className="text-gray-500 dark:text-gray-400">Đang tải thống kê...</p>
      </div>
    );
  }

  // Default values if no stats
  const studyStats = {
    totalHours: stats?.totalHours || 0,
    thisWeekHours: stats?.thisWeekHours || 0,
    totalCredits: stats?.totalCredits || 150,
    completedCredits: stats?.completedCredits || 0,
  };

  const gpaData = stats?.gpaSummary?.length > 0 ? stats.gpaSummary : [];
  const creditData =
    stats?.creditDistribution?.filter((d) => d.value > 0) || [];
  const hasGpaData = gpaData.length > 0;
  const hasCreditData = creditData.length > 0;

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Stat Boxes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatBox
          icon={Clock}
          label="Tổng giờ học"
          value={`${studyStats.totalHours}h`}
          color="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
          bgColor="bg-white dark:bg-gray-800"
        />
        <StatBox
          icon={TrendingUp}
          label="Tuần này"
          value={`${studyStats.thisWeekHours}h`}
          color="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
          bgColor="bg-white dark:bg-gray-800"
        />
        <StatBox
          icon={BookOpen}
          label="Tổng tín chỉ"
          value={studyStats.totalCredits}
          color="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
          bgColor="bg-white dark:bg-gray-800"
        />
        <StatBox
          icon={Target}
          label="Đã hoàn thành"
          value={`${studyStats.completedCredits} TC`}
          color="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
          bgColor="bg-white dark:bg-gray-800"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GPA Line Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp
              className="text-blue-600 dark:text-blue-400"
              size={20}
            />
            <h4 className="text-lg font-bold text-gray-800 dark:text-white">
              GPA qua các kỳ
            </h4>
          </div>
          {hasGpaData ? (
            isLoaded ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={gpaData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#374151"
                      opacity={0.3}
                    />
                    <XAxis
                      dataKey="semester"
                      tick={{ fontSize: 11, fill: "#9CA3AF" }}
                      axisLine={{ stroke: "#4B5563" }}
                    />
                    <YAxis
                      domain={[0, 4]}
                      tick={{ fontSize: 12, fill: "#9CA3AF" }}
                      axisLine={{ stroke: "#4B5563" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1F2937",
                        border: "1px solid #374151",
                        borderRadius: "8px",
                        color: "#F9FAFB",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="gpa"
                      stroke="#3B82F6"
                      strokeWidth={3}
                      dot={{ fill: "#3B82F6", strokeWidth: 2, r: 5 }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 w-full rounded-xl bg-gray-100 dark:bg-gray-700/60 animate-pulse" />
            )
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
              <AlertCircle size={40} className="mb-3 opacity-50" />
              <p>Chưa có dữ liệu GPA</p>
              <p className="text-sm mt-1">Hãy nhập điểm ở trang Tính GPA</p>
            </div>
          )}
        </div>

        {/* Credit Pie Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <PieChartIcon
              className="text-green-600 dark:text-green-400"
              size={20}
            />
            <h4 className="text-lg font-bold text-gray-800 dark:text-white">
              Phân bổ tín chỉ
            </h4>
          </div>
          {hasCreditData ? (
            isLoaded ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={creditData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      labelLine={{ stroke: "#9CA3AF" }}
                    >
                      {creditData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color || COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1F2937",
                        border: "1px solid #374151",
                        borderRadius: "8px",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                      }}
                      itemStyle={{ color: "#FFFFFF", fontWeight: "bold" }}
                      formatter={(value) => [`${value} tín chỉ`, "Số lượng"]}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: "12px" }}
                      formatter={(value) => (
                        <span className="text-gray-600 dark:text-gray-400">
                          {value}
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 w-full rounded-xl bg-gray-100 dark:bg-gray-700/60 animate-pulse" />
            )
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
              <AlertCircle size={40} className="mb-3 opacity-50" />
              <p>Chưa có dữ liệu tín chỉ</p>
              <p className="text-sm mt-1">Hãy thêm môn học ở trang Tính GPA</p>
            </div>
          )}
        </div>
      </div>

      {/* Progress Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <h4 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
          Tiến độ học tập
        </h4>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600 dark:text-gray-400">
                Hoàn thành chương trình
              </span>
              <span className="font-medium text-gray-800 dark:text-white">
                {studyStats.totalCredits > 0
                  ? Math.round(
                      (studyStats.completedCredits / studyStats.totalCredits) *
                        100
                    )
                  : 0}
                %
              </span>
            </div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                style={{
                  width: `${
                    studyStats.totalCredits > 0
                      ? (studyStats.completedCredits /
                          studyStats.totalCredits) *
                        100
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
          {hasGpaData && (
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">
                  GPA hiện tại (
                  {gpaData[gpaData.length - 1]?.gpa?.toFixed(2) || 0}/4.0)
                </span>
                <span className="font-medium text-gray-800 dark:text-white">
                  {Math.round(
                    ((gpaData[gpaData.length - 1]?.gpa || 0) / 4) * 100
                  )}
                  %
                </span>
              </div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      ((gpaData[gpaData.length - 1]?.gpa || 0) / 4) * 100
                    }%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const PrivacyVaultTab = ({ currentUser }) => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [copiedState, setCopiedState] = useState({});
  const [activeRowId, setActiveRowId] = useState(null);
  const [isListHovered, setIsListHovered] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState("");

  const syncAccounts = (nextAccounts = []) => {
    const sorted = [...nextAccounts].sort((a, b) => {
      const left = new Date(b.updatedAt || b.createdAt || 0).getTime();
      const right = new Date(a.updatedAt || a.createdAt || 0).getTime();
      return left - right;
    });
    setAccounts(sorted);
  };

  useEffect(() => {
    let isMounted = true;

    const loadPrivacyAccounts = async () => {
      if (!currentUser?.username) {
        if (isMounted) {
          setLoading(false);
          setAccounts([]);
        }
        return;
      }

      if (!isUnlocked) {
        if (isMounted) {
          setLoading(false);
          setAccounts([]);
        }
        return;
      }

      setLoading(true);
      const result = await userService.getPrivacyAccounts();

      if (!isMounted) return;

      if (!result.success) {
        toast.error(result.message || "Không tải được kho lưu trữ.");
        setAccounts([]);
        setLoading(false);
        return;
      }

      syncAccounts(result.accounts || []);
      setLoading(false);
    };

    loadPrivacyAccounts();
    return () => {
      isMounted = false;
    };
  }, [currentUser?.username, isUnlocked]);

  const filteredAccounts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return accounts;
    return accounts.filter((account) =>
      [account.platform, account.username, account.iconTitle].some((value) =>
        String(value || "").toLowerCase().includes(query)
      )
    );
  }, [accounts, search]);

  const copyText = async (value, label) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedState((prev) => ({ ...prev, [label]: true }));
      window.clearTimeout(copyText.timeoutMap?.[label]);
      copyText.timeoutMap = copyText.timeoutMap || {};
      copyText.timeoutMap[label] = window.setTimeout(() => {
        setCopiedState((prev) => ({ ...prev, [label]: false }));
      }, 1400);
      toast.success("Đã sao chép vào bộ nhớ tạm");
    } catch (error) {
      console.error("Copy failed:", error);
      toast.error("Không thể sao chép lúc này.");
    }
  };

  const togglePassword = (id) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const openCreateModal = () => {
    setEditingAccount(null);
    setIsModalOpen(true);
  };

  const openEditModal = (account) => {
    setEditingAccount(account);
    setIsModalOpen(true);
  };

  const handleSubmitAccount = async (payload) => {
    const detectedPlatform = resolvePrivacyPlatform(payload.platform);
    const requestBody = {
      ...payload,
      normalizedPlatform: detectedPlatform.normalizedPlatform,
      iconSlug: detectedPlatform.iconSlug,
      iconHex: detectedPlatform.iconHex,
      iconTitle: detectedPlatform.iconTitle,
    };

    setIsSaving(true);
    const result = editingAccount?._id
      ? await userService.updatePrivacyAccount(editingAccount._id, requestBody)
      : await userService.createPrivacyAccount(requestBody);
    setIsSaving(false);

    if (!result.success) {
      toast.error(
        result.message ||
          (editingAccount ? "Không cập nhật được tài khoản." : "Không thêm được tài khoản.")
      );
      return;
    }

    syncAccounts(result.accounts || []);
    setIsModalOpen(false);
    setEditingAccount(null);
    toast.success(
      editingAccount ? "Đã cập nhật tài khoản riêng tư." : "Đã thêm tài khoản vào Privacy Vault."
    );
  };

  const handleUnlockVault = async () => {
    if (!unlockPassword.trim()) {
      toast.error("Nhập mật khẩu tài khoản để mở kho lưu trữ.");
      return;
    }

    setIsUnlocking(true);
    const result = await userService.unlockPrivacyVault(unlockPassword);
    setIsUnlocking(false);

    if (!result.success) {
      toast.error(result.message || "Không thể xác thực kho lưu trữ.");
      return;
    }

    setUnlockPassword("");
    setIsUnlocked(true);
    toast.success("Kho lưu trữ đã được mở.");
  };

  const containerVariants = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: 0.09,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 24, scale: 0.97 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.38, ease: "easeOut" },
    },
  };

  return (
    <>
      <div
        className="relative overflow-hidden rounded-[2rem] border border-white/40 bg-white/80 p-5 shadow-sm backdrop-blur-md md:p-6"
        style={{ fontFamily: "'Google Sans', 'Plus Jakarta Sans', sans-serif" }}
      >
        <div className="pointer-events-none absolute inset-y-6 right-10 w-40 rounded-full bg-indigo-200/45 blur-3xl" />

        <div className="relative mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-indigo-500">
              <Vault size={17} />
            </div>
            <div className="min-w-0">
              <h3 className="text-xl font-bold tracking-tight text-slate-900">
                Riêng tư
              </h3>
              <p className="text-sm tracking-tight text-slate-500">
                Kho lưu trữ tài khoản cá nhân.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="flex min-w-[220px] items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3.5 py-2.5 text-sm text-slate-400 shadow-sm transition focus-within:border-indigo-300 sm:min-w-[280px]">
              <Search
                size={14}
                className={isSearchFocused ? "text-indigo-500" : "text-slate-400"}
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                placeholder="Tìm kiếm tài khoản"
                className="w-full bg-transparent text-sm tracking-tight text-slate-700 outline-none placeholder:text-slate-400"
              />
            </label>
            <button
              onClick={openCreateModal}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 text-white shadow-sm transition hover:bg-blue-600"
              aria-label="Thêm tài khoản"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        <div
          className="relative min-h-[260px] overflow-hidden rounded-[1.75rem] border border-slate-100 bg-white/70 shadow-[0_18px_50px_-36px_rgba(99,102,241,0.4)]"
          onMouseLeave={() => {
            setActiveRowId(null);
            setIsListHovered(false);
          }}
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2 px-6 py-16 text-sm tracking-tight text-slate-500">
              <RefreshCw size={16} className="animate-spin" />
              Đang tải kho lưu trữ...
            </div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate={isUnlocked ? "show" : "hidden"}
              className={`${isUnlocked ? "" : "select-none"} ${filteredAccounts.length === 0 ? "min-h-[260px]" : ""}`}
            >
              {filteredAccounts.map((account) => {
                const meta = resolveStoredPrivacyPlatform(account);
                const accountId = account._id || account.id;
                const isVisible = Boolean(visiblePasswords[accountId]);
                const usernameCopyKey = `${accountId}-username`;
                const passwordCopyKey = `${accountId}-password`;
                const shouldBlurSensitive = isUnlocked && (!isListHovered || activeRowId !== accountId);

                return (
                  <motion.div
                    key={accountId}
                    variants={cardVariants}
                    onMouseEnter={() => {
                      if (!isUnlocked) return;
                      setIsListHovered(true);
                      setActiveRowId(accountId);
                    }}
                    className={`group border-b border-slate-100 px-4 py-4 transition last:border-b-0 ${
                      isUnlocked
                        ? "hover:rounded-xl hover:bg-slate-50/50"
                        : "blur-[3px] opacity-55"
                    }`}
                  >
                    <div className="grid items-center gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${meta.tintClass} ring-1 ${meta.ringClass}`}
                        >
                          <PlatformLogo
                            account={account}
                            className="h-[15px] w-[15px] text-slate-500"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold tracking-tight text-slate-800">
                            {meta.label}
                          </p>
                        </div>
                      </div>

                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          User
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <p
                            className={`truncate text-sm font-medium tracking-tight text-slate-700 transition ${
                              shouldBlurSensitive ? "blur-sm" : "blur-0"
                            }`}
                          >
                            {account.username}
                          </p>
                          <button
                            onClick={() => copyText(account.username, usernameCopyKey)}
                            className="rounded-full p-2 text-slate-400 opacity-0 transition hover:bg-slate-100 hover:text-slate-700 group-hover:opacity-100"
                            aria-label="Sao chép tài khoản"
                          >
                            <AnimatePresence mode="wait" initial={false}>
                              <motion.span
                                key={copiedState[usernameCopyKey] ? "check" : "copy"}
                                initial={{ scale: 0.7, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.7, opacity: 0 }}
                                transition={{ duration: 0.16, ease: "easeOut" }}
                                className="block"
                              >
                                {copiedState[usernameCopyKey] ? (
                                  <Check size={15} strokeWidth={2} className="text-emerald-500" />
                                ) : (
                                  <Copy size={15} strokeWidth={1.8} />
                                )}
                              </motion.span>
                            </AnimatePresence>
                          </button>
                        </div>
                      </div>

                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Pass
                        </p>
                        <div className="mt-1 flex items-center gap-1.5">
                          <div className="min-w-0 flex-1 truncate">
                            <AnimatePresence mode="wait" initial={false}>
                              <motion.span
                                key={isVisible ? "visible" : "hidden"}
                                initial={{ opacity: 0, y: 3, filter: "blur(4px)" }}
                                animate={{
                                  opacity: 1,
                                  y: 0,
                                  filter: shouldBlurSensitive ? "blur(5px)" : "blur(0px)",
                                }}
                                exit={{ opacity: 0, y: -3, filter: "blur(4px)" }}
                                transition={{ duration: 0.18, ease: "easeOut" }}
                                className={`inline-block tracking-tight transition ${
                                  isVisible
                                    ? "text-sm font-medium text-slate-700"
                                    : "text-[8px] text-slate-500"
                                }`}
                              >
                                {isVisible
                                  ? account.password
                                  : maskPassword(account.password)}
                              </motion.span>
                            </AnimatePresence>
                          </div>
                          <button
                            onClick={() => togglePassword(accountId)}
                            className="rounded-full p-2 text-slate-400 opacity-0 transition hover:bg-slate-100 hover:text-slate-700 group-hover:opacity-100"
                            aria-label={isVisible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                          >
                            {isVisible ? (
                              <EyeOff size={15} strokeWidth={1.8} />
                            ) : (
                              <Eye size={15} strokeWidth={1.8} />
                            )}
                          </button>
                          <button
                            onClick={() => copyText(account.password, passwordCopyKey)}
                            className="rounded-full p-2 text-slate-400 opacity-0 transition hover:bg-slate-100 hover:text-slate-700 group-hover:opacity-100"
                            aria-label="Sao chép mật khẩu"
                          >
                            <AnimatePresence mode="wait" initial={false}>
                              <motion.span
                                key={copiedState[passwordCopyKey] ? "check" : "copy"}
                                initial={{ scale: 0.7, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.7, opacity: 0 }}
                                transition={{ duration: 0.16, ease: "easeOut" }}
                                className="block"
                              >
                                {copiedState[passwordCopyKey] ? (
                                  <Check size={15} strokeWidth={2} className="text-emerald-500" />
                                ) : (
                                  <Copy size={15} strokeWidth={1.8} />
                                )}
                              </motion.span>
                            </AnimatePresence>
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-start gap-1 lg:justify-end">
                        <button
                          onClick={() => openEditModal(account)}
                          className="rounded-full p-2 text-slate-400 opacity-0 transition hover:bg-slate-100 hover:text-slate-700 group-hover:opacity-100"
                          aria-label="Chỉnh sửa tài khoản"
                        >
                          <Edit2 size={15} strokeWidth={1.8} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          {!loading && isUnlocked && filteredAccounts.length === 0 && (
            <div className="px-6 py-12 text-center text-sm tracking-tight text-slate-400">
              Không tìm thấy tài khoản nào khớp với từ khóa của bạn.
            </div>
          )}

          <AnimatePresence>
            {!isUnlocked && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-10 flex items-center justify-center bg-white/45 p-4 backdrop-blur-md"
              >
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="w-full max-w-md rounded-[1.5rem] border border-white/70 bg-white/85 px-6 py-6 text-center shadow-sm backdrop-blur-md"
                >
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-500">
                    <Lock size={18} />
                  </div>
                  <p className="text-sm font-semibold tracking-tight text-slate-800">
                    Xác thực để truy cập kho lưu trữ
                  </p>
                  <p className="mt-1 text-sm tracking-tight text-slate-500">
                    Nhập mật khẩu tài khoản Whalio của bạn để mở Privacy Vault.
                  </p>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <input
                      type="password"
                      value={unlockPassword}
                      onChange={(e) => setUnlockPassword(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleUnlockVault();
                        }
                      }}
                      placeholder="Mật khẩu chính"
                      className="flex-1 rounded-full border border-slate-200 bg-white/90 px-4 py-2.5 text-sm tracking-tight text-slate-700 outline-none transition focus:border-indigo-300"
                    />
                    <button
                      onClick={handleUnlockVault}
                      disabled={isUnlocking}
                      className="rounded-full bg-slate-900 px-4 py-2.5 text-sm font-medium tracking-tight text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isUnlocking ? "Đang xác thực..." : "Mở kho"}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <PrivacyAccountModal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setEditingAccount(null);
            }}
            onSubmit={handleSubmitAccount}
            initialData={editingAccount}
            isSubmitting={isSaving}
          />
        )}
      </AnimatePresence>
    </>
  );
};

// ==================== MAIN COMPONENT ====================
const Profile = ({ user, onUpdateUser }) => {
  const [activeTab, setActiveTab] = useState("info");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);
  const profileNavRef = useRef(null);
  const profileTabRefs = useRef({});
  const [liquidHighlight, setLiquidHighlight] = useState(null);
  const profileTabs = [
    {
      id: "info",
      label: "Thông tin cá nhân",
      icon: User,
      iconClass:
        "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
    },
    {
      id: "docs",
      label: "Tài liệu của tôi",
      icon: FileText,
      iconClass:
        "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400",
    },
    {
      id: "privacy",
      label: "Riêng tư",
      icon: Vault,
      iconClass:
        "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
    },
    {
      id: "stats",
      label: "Thống kê học tập",
      icon: BarChart3,
      iconClass:
        "bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
    },
    {
      id: "settings",
      label: "Cấu hình học tập",
      icon: Settings,
      iconClass:
        "bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400",
    },
  ];

  useLayoutEffect(() => {
    const navEl = profileNavRef.current;
    const activeEl = profileTabRefs.current[activeTab];
    if (!navEl || !activeEl) return;
    setLiquidHighlight({
      y: activeEl.offsetTop,
      height: activeEl.offsetHeight,
      width: activeEl.offsetWidth,
    });
  }, [activeTab]);

  if (!user)
    return (
      <div className="p-10 text-center text-gray-500 dark:text-gray-400">
        Vui lòng đăng nhập để xem hồ sơ.
      </div>
    );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* === CỘT TRÁI (SIDEBAR) === */}
        <div className="md:col-span-4 lg:col-span-3 space-y-6">
          <motion.div
            whileHover={{ y: -2, boxShadow: "0 24px 50px -30px rgba(59,130,246,0.2)" }}
            transition={{ type: "spring", stiffness: 240, damping: 18 }}
            className="bg-white/60 dark:bg-gray-800/70 rounded-[2rem] border border-white/40 p-6 text-center backdrop-blur-lg"
          >
            {/* Avatar */}
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
              className="mx-auto mb-5"
            >
              <AvatarWithFrame
                src={user.avatar && user.avatar.includes("/") ? user.avatar : null}
                name={user.fullName}
                size="xl"
                avatarClassName="border-4 border-white shadow-lg"
                fallbackClassName="text-4xl bg-gray-200 dark:bg-gray-600"
              />
            </motion.div>
            <h2 className="text-2xl font-semibold text-slate-800 dark:text-white font-sans tracking-tight">
              {user.fullName}
            </h2>
            <p className="mt-1 text-sm text-slate-400 dark:text-slate-500 font-sans">
              {user.email}
            </p>
          </motion.div>

          {/* Menu Navigation */}
          <div className="bg-white/60 dark:bg-gray-800/70 rounded-[2rem] border border-white/40 shadow-sm overflow-hidden backdrop-blur-lg">
            <nav ref={profileNavRef} className="relative flex flex-col gap-1 p-2 pb-4">
              <AnimatePresence>
                {liquidHighlight && (
                  <motion.div
                    layoutId="active-pill"
                    className="pointer-events-none absolute left-2 right-2 rounded-2xl bg-blue-50/80"
                    initial={false}
                    animate={{
                      y: liquidHighlight.y + 3,
                      height: Math.max(0, liquidHighlight.height - 6),
                    }}
                    transition={{ type: "spring", stiffness: 320, damping: 26, mass: 0.6 }}
                  />
                )}
              </AnimatePresence>
              {profileTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    ref={(el) => {
                      profileTabRefs.current[tab.id] = el;
                    }}
                    className={`relative z-10 flex h-12 items-center gap-3 overflow-hidden px-5 text-sm transition-all ${
                      isActive
                        ? "text-blue-600 font-semibold"
                        : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                    }`}
                  >
                    <span className="w-5 h-5 inline-flex items-center justify-center">
                      <Icon size={18} />
                    </span>
                    <span className="leading-none">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* === CỘT PHẢI (CONTENT) === */}
        <div className="md:col-span-8 lg:col-span-9">
          {activeTab === "info" && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 md:p-8 animate-fade-in-up">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                  <h3 className="text-2xl font-bold text-gray-800 dark:text-white text-blue-900 dark:text-blue-400">
                    Thông tin cá nhân
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                    Quản lý thông tin hồ sơ của bạn
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsEditModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
                  >
                    <Edit2 size={16} /> Chỉnh sửa thông tin
                  </button>
                  <button
                    onClick={() => setIsPassModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                  >
                    <Lock size={16} /> Đổi mật khẩu
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <DisplayRow label="Họ và tên" value={user.fullName} />
                <DisplayRow label="Tài khoản" value={user.username} />
                <DisplayRow label="Email" value={user.email} />
                <DisplayRow label="Số điện thoại" value={user.phone} />
                <DisplayRow label="Giới tính" value={user.gender} />
                <DisplayRow label="Năm sinh" value={user.birthYear} />
                <DisplayRow
                  label="Link Facebook"
                  value={user.facebook}
                  isLink
                />
                <DisplayRow label="Tỉnh thành" value={user.city} />
                <DisplayRow label="Trường học" value={user.school} />
              </div>
            </div>
          )}

          {activeTab === "docs" && <MyDocumentsTab currentUser={user} />}

          {activeTab === "privacy" && <PrivacyVaultTab currentUser={user} />}

          {activeTab === "stats" && <StatisticsTab currentUser={user} />}

          {activeTab === "settings" && (
            <AcademicSettingsTab
              currentUser={user}
              onUpdateUser={onUpdateUser}
            />
          )}
        </div>
      </div>

      {/* MODAL CHỈNH SỬA */}
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        user={user}
        onUpdateSuccess={onUpdateUser}
      />

      <ChangePasswordModal
        isOpen={isPassModalOpen}
        onClose={() => setIsPassModalOpen(false)}
        username={user.username}
      />
    </div>
  );
};

export default Profile;
