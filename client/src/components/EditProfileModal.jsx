import React, { useState, useEffect, useRef } from 'react';
import { useAvatarFrame } from "../context/AvatarFrameContext";
import AvatarWithFrame from "./AvatarWithFrame";
import { userService } from '../services/userService';
import { Camera, X } from 'lucide-react';

const EditProfileModal = ({ isOpen, onClose, user, onUpdateSuccess }) => {
  const [formData, setFormData] = useState({});
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [isFramePickerOpen, setIsFramePickerOpen] = useState(false);
  const [previewFrameId, setPreviewFrameId] = useState(null);
  const { selectedFrameId, setSelectedFrameId } = useAvatarFrame();

  const frameOptions = [
    { id: "whale_wave", label: "Sóng xanh" },
    { id: "cyber_neon", label: "Neon" },
    { id: "golden_crown", label: "Vàng" },
    { id: "nature_leaf", label: "Lá xanh" },
    { id: "ai_vortex", label: "Vortex" },
    { id: "winged_aura", label: "Cánh chim" },
    { id: "royal_crown", label: "Vương miện" },
    { id: "arcane_rune", label: "Rune" },
    { id: "rare_sapphire", label: "Rare" },
    { id: "epic_ember", label: "Epic" },
    { id: "legendary_aurora", label: "Legendary" },
  ];
  const [isLoading, setIsLoading] = useState(false);
  
  // Tạo ref để nút bấm có thể kích hoạt input file ẩn
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        fullName: user.fullName || '',
        email: user.email || '',
        phone: user.phone || '',
        gender: user.gender || 'Nam',
        birthYear: user.birthYear || '',
        school: user.school || '',
        city: user.city || '',
        facebook: user.facebook || ''
      });
      // Chỉ hiện preview nếu avatar là đường dẫn ảnh hợp lệ (chứa http, https, hoặc blob)
      const hasValidAvatar = user.avatar && (user.avatar.includes('/') || user.avatar.startsWith('data:'));
      setAvatarPreview(hasValidAvatar ? user.avatar : null);
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // 1. Kiểm tra loại file (chỉ cho phép ảnh)
      if (!file.type.startsWith('image/')) {
        alert('Vui lòng chọn file ảnh (JPG, PNG,...)');
        return;
      }
      
      // 2. Lưu file vào state để tí nữa upload
      setAvatarFile(file);
      
      // 3. Tạo preview ngay lập tức
      const previewUrl = URL.createObjectURL(file);
      setAvatarPreview(previewUrl);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let finalAvatarUrl = user.avatar; // Mặc định giữ avatar cũ

      // 1. Nếu có chọn file mới -> Upload lên server trước
      if (avatarFile) {
        console.log("Đang upload avatar...");
        const uploadRes = await userService.uploadAvatar(user.username, avatarFile);
        
        if (uploadRes.success) {
          finalAvatarUrl = uploadRes.avatar; // Lấy link ảnh mới từ server trả về
        } else {
          console.error("Lỗi upload avatar:", uploadRes.message);
          alert('Không thể upload ảnh: ' + uploadRes.message);
        }
      }

      // 2. Gộp link avatar mới vào dữ liệu update
      const updateData = {
        ...formData,
        avatar: finalAvatarUrl
      };

      // 3. Gửi cập nhật thông tin text
      const updateRes = await userService.updateProfile(updateData);
      
      if (updateRes.success) {
        alert('✅ Cập nhật hồ sơ thành công!');
        onUpdateSuccess(updateRes.user);
        onClose();
      } else {
        alert('❌ Lỗi: ' + updateRes.message);
      }
    } catch (error) {
      console.error(error);
      alert('🔌 Lỗi kết nối Server');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in-up">
        
        <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Cập nhật hồ sơ ✏️</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all"><X /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-4">
            <div 
              className="relative group cursor-pointer w-28 h-28"
              onClick={() => fileInputRef.current.click()}
            >
              <AvatarWithFrame
                src={avatarPreview || (user?.avatar && user.avatar.includes("/") ? user.avatar : null)}
                name={formData.fullName}
                size="xl"
                frameId={selectedFrameId}
                avatarClassName="border-4 border-blue-50 shadow-sm"
                fallbackClassName="text-4xl bg-blue-100 text-blue-600"
              />
              
              {/* Overlay icon Camera khi hover */}
              <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="text-white drop-shadow-md" size={32} />
              </div>
            </div>

            {/* Input file ẩn */}
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileChange} 
            />

            {/* Nút bấm hiển thị */}
            <div className="flex items-center gap-2">
            <button 
              type="button" 
              onClick={() => fileInputRef.current.click()} 
              className="text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors border border-blue-200 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 dark:border-blue-700/40 dark:text-blue-300"
            >
              Đổi ảnh đại diện
            </button>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsFramePickerOpen((prev) => !prev)}
                  className="text-sm font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 px-4 py-2 rounded-lg transition-colors border border-slate-200 dark:bg-slate-700/40 dark:hover:bg-slate-700/60 dark:border-slate-600 dark:text-slate-200"
                >
                  Chọn khung
                </button>
              </div>
            </div>

            {isFramePickerOpen && (
              <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                <div className="w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-200/70 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Avatar Frame</p>
                      <h3 className="text-lg font-semibold text-white">Chọn khung đại diện</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsFramePickerOpen(false)}
                      className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-slate-200 hover:bg-white/10"
                    >
                      Đóng
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-[1.3fr_0.7fr]">
                    <div>
                      <div className="grid grid-cols-4 gap-4">
                        {frameOptions.map((frame) => (
                          <button
                            key={frame.id}
                            type="button"
                            onMouseEnter={() => setPreviewFrameId(frame.id)}
                            onMouseLeave={() => setPreviewFrameId(null)}
                            onClick={() => {
                              setSelectedFrameId(frame.id);
                              setPreviewFrameId(null);
                            }}
                            className={`group relative aspect-square rounded-2xl border transition-all ${
                              selectedFrameId === frame.id
                                ? "border-blue-400 shadow-[0_0_18px_rgba(59,130,246,0.45)]"
                                : "border-white/10 hover:border-white/40"
                            }`}
                          >
                            <div className="absolute inset-3 rounded-full bg-slate-900/70" />
                            <span className={`avatar-frame frame-${frame.id}`} />
                            <span className={`avatar-ornament ornament-${frame.id}`} />
                            <div className="absolute inset-0 rounded-2xl ring-1 ring-white/10" />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                      <p className="text-sm font-semibold text-white">Preview</p>
                      <div className="mt-4 flex items-center justify-center">
                        <AvatarWithFrame
                          src={avatarPreview || (user?.avatar && user.avatar.includes("/") ? user.avatar : null)}
                          name={formData.fullName}
                          size="xl"
                          frameId={previewFrameId ?? selectedFrameId}
                          avatarClassName="border-4 border-white shadow-lg"
                          fallbackClassName="text-4xl bg-slate-800 text-white"
                        />
                      </div>
                      <p className="mt-3 text-center text-xs text-slate-400">
                        {frameOptions.find((f) => f.id === (previewFrameId ?? selectedFrameId))?.label || "Chưa chọn khung"}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFrameId(null);
                          setPreviewFrameId(null);
                        }}
                        className="mt-4 w-full rounded-xl border border-white/10 bg-white/5 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10"
                      >
                        Bỏ khung
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Tên đăng nhập</label>
                <input type="text" value={formData.username} disabled className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-500 dark:text-gray-300 cursor-not-allowed font-medium" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Họ và tên</label>
                <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all dark:bg-gray-800 dark:text-gray-100" required />
              </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Email</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all dark:bg-gray-800 dark:text-gray-100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Số điện thoại</label>
                <input type="text" name="phone" value={formData.phone} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all dark:bg-gray-800 dark:text-gray-100" />
              </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Giới tính</label>
                <select name="gender" value={formData.gender} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white dark:bg-gray-800 dark:text-gray-100">
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Năm sinh</label>
                <input type="number" name="birthYear" value={formData.birthYear} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all dark:bg-gray-800 dark:text-gray-100" />
              </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Trường học</label>
                <input type="text" name="school" value={formData.school} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all dark:bg-gray-800 dark:text-gray-100" />
              </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Tỉnh / Thành phố</label>
              <input type="text" name="city" value={formData.city} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all dark:bg-gray-800 dark:text-gray-100" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Link Facebook</label>
            <input type="text" name="facebook" value={formData.facebook} onChange={handleChange} placeholder="https://facebook.com/..." className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all dark:bg-gray-800 dark:text-gray-100" />
          </div>

          <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3 sticky bottom-0 bg-white dark:bg-gray-800 pb-2">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-medium transition-colors">Hủy</button>
            <button type="submit" disabled={isLoading} className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2">
              {isLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
              {isLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default EditProfileModal;
