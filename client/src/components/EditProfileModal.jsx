import React, { useState, useEffect, useRef } from 'react';
import { userService } from '../services/userService';
import { Camera, X } from 'lucide-react';

const EditProfileModal = ({ isOpen, onClose, user, onUpdateSuccess }) => {
  const [formData, setFormData] = useState({});
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in-up">
        
        <div className="flex justify-between items-center p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold text-gray-800">Cập nhật hồ sơ ✏️</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"><X /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-4">
            <div 
              className="relative group cursor-pointer w-28 h-28"
              onClick={() => fileInputRef.current.click()} // Bấm vào ảnh cũng mở chọn file
            >
              <div className="w-full h-full rounded-full border-4 border-blue-50 overflow-hidden shadow-sm">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-blue-100 flex items-center justify-center text-4xl font-bold text-blue-600">
                    {formData.fullName?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              
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
            <button 
              type="button" 
              onClick={() => fileInputRef.current.click()} 
              className="text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors border border-blue-200"
            >
              Đổi ảnh đại diện
            </button>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tên đăng nhập</label>
              <input type="text" value={formData.username} disabled className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 cursor-not-allowed font-medium" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
              <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" required />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
              <input type="text" name="phone" value={formData.phone} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Giới tính</label>
              <select name="gender" value={formData.gender} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white">
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
                <option value="Khác">Khác</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Năm sinh</label>
              <input type="number" name="birthYear" value={formData.birthYear} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trường học</label>
              <input type="text" name="school" value={formData.school} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tỉnh / Thành phố</label>
              <input type="text" name="city" value={formData.city} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Link Facebook</label>
            <input type="text" name="facebook" value={formData.facebook} onChange={handleChange} placeholder="https://facebook.com/..." className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" />
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white pb-2">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-gray-600 hover:bg-gray-100 font-medium transition-colors">Hủy</button>
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