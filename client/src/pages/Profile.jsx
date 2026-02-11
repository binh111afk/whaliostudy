import React, { useState } from "react";
import EditProfileModal from "../components/EditProfileModal";
import ChangePasswordModal from "../components/ChangePasswordModal";
import { User, FileText, Bookmark, Gift, Edit2, Lock } from "lucide-react";

// Hàm helper để hiển thị thông tin, nếu chưa có thì hiện "Chưa cập nhật"
const DisplayRow = ({ label, value, isLink }) => (
  <div className="flex items-center py-4 border-b border-gray-50 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 px-2 transition-colors -mx-2 rounded-lg">
    <span className="w-1/3 text-gray-500 dark:text-gray-400 font-medium text-sm">{label}</span>
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
          value ? "text-gray-800 dark:text-gray-200" : "text-gray-400 dark:text-gray-500 italic"
        }`}
      >
        {value || "Chưa cập nhật"}
      </span>
    )}
  </div>
);

const Profile = ({ user, onUpdateUser }) => {
  const [activeTab, setActiveTab] = useState("info");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);

  if (!user)
    return (
      <div className="p-10 text-center text-gray-500 dark:text-gray-400">Vui lòng đăng nhập để xem hồ sơ.</div>
    );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* === CỘT TRÁI (SIDEBAR) === */}
        <div className="md:col-span-4 lg:col-span-3 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 text-center">
            {/* Avatar */}
            <div className="w-28 h-28 mx-auto rounded-full border-4 border-white dark:border-gray-700 shadow-lg overflow-hidden bg-gray-100 dark:bg-gray-700 mb-4 relative">
              {/* 1. Ưu tiên hiển thị ảnh (nếu là đường dẫn hợp lệ) */}
              {user.avatar && user.avatar.includes("/") && (
                <img
                  src={user.avatar}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Nếu ảnh lỗi -> Ẩn ảnh đi -> Hiện cái chữ cái bên dưới lên
                    e.target.style.display = "none";
                    e.target.nextSibling.style.display = "flex";
                  }}
                />
              )}

              {/* 2. Fallback: Chữ cái đầu (Mặc định ẩn nếu đang có ảnh) */}
              <div
                className="w-full h-full flex items-center justify-center text-4xl font-bold text-gray-400 dark:text-gray-500 bg-gray-200 dark:bg-gray-600"
                style={{
                  display:
                    user.avatar && user.avatar.includes("/") ? "none" : "flex",
                }}
              >
                {user.fullName ? user.fullName.charAt(0).toUpperCase() : "U"}
              </div>
            </div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">{user.fullName}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
          </div>

          {/* Menu Navigation */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <nav className="flex flex-col">
              <button
                onClick={() => setActiveTab("info")}
                className={`flex items-center gap-3 px-5 py-4 text-sm font-medium transition-colors ${
                  activeTab === "info"
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                <div
                  className={`p-1.5 rounded-lg ${
                    activeTab === "info"
                      ? "bg-white/20"
                      : "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                  }`}
                >
                  <User size={18} />
                </div>
                Thông tin cá nhân
              </button>

              <button
                onClick={() => setActiveTab("docs")}
                className={`flex items-center gap-3 px-5 py-4 text-sm font-medium transition-colors ${
                  activeTab === "docs"
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                <div
                  className={`p-1.5 rounded-lg ${
                    activeTab === "docs"
                      ? "bg-white/20"
                      : "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                  }`}
                >
                  <FileText size={18} />
                </div>
                Tài liệu của tôi
              </button>

              <button
                onClick={() => setActiveTab("saved")}
                className={`flex items-center gap-3 px-5 py-4 text-sm font-medium transition-colors ${
                  activeTab === "saved"
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                <div
                  className={`p-1.5 rounded-lg ${
                    activeTab === "saved"
                      ? "bg-white/20"
                      : "bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
                  }`}
                >
                  <Bookmark size={18} />
                </div>
                Tài liệu đã lưu
              </button>

              <button className="flex items-center gap-3 px-5 py-4 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <div className="p-1.5 rounded-lg bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
                  <Gift size={18} />
                </div>
                Kho vật phẩm
              </button>
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

          {activeTab === "docs" && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-10 text-center animate-fade-in-up">
              <div className="text-6xl mb-4">📂</div>
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                Tài liệu của tôi
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Tính năng đang được cập nhật từ file cũ...
              </p>
            </div>
          )}

          {activeTab === "saved" && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-10 text-center animate-fade-in-up">
              <div className="text-6xl mb-4">🔖</div>
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                Tài liệu đã lưu
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Tính năng đang được cập nhật từ file cũ...
              </p>
            </div>
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
