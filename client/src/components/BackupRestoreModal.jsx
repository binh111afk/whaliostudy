import React, { useRef } from 'react';
import { X, Download, Upload, AlertTriangle } from 'lucide-react';
import { backupService } from '../services/backupService';

const BackupRestoreModal = ({ isOpen, onClose, user }) => {
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleExport = async () => {
    const result = await backupService.exportData(user.username);
    
    if (result.success) {
      alert(`✅ Sao lưu thành công!\nFile: ${result.filename}`);
    } else {
      alert(`❌ Lỗi: ${result.message}`);
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const confirmRestore = window.confirm(
      `⚠️ CẢNH BÁO!\n\n` +
      `Hành động này sẽ GHI ĐÈ toàn bộ dữ liệu hiện tại của bạn bằng dữ liệu từ file backup.\n\n` +
      `Dữ liệu sẽ bị mất:\n` +
      `• Sự kiện\n` +
      `• Thời khóa biểu\n` +
      `• Điểm GPA\n` +
      `• Lịch sử học tập\n` +
      `• Ghi chú nhanh\n\n` +
      `Bạn có chắc chắn muốn tiếp tục?`
    );

    if (!confirmRestore) {
      e.target.value = '';
      return;
    }

    const result = await backupService.importData(user.username, file);
    
    if (result.success) {
      alert(
        `✅ Khôi phục thành công!\n\n` +
        `Phiên bản: ${result.backupInfo.version}\n` +
        `Ngày sao lưu: ${result.backupInfo.exportDate}\n\n` +
        `Trang sẽ tải lại để cập nhật dữ liệu...`
      );
      setTimeout(() => window.location.reload(), 1500);
    } else {
      alert(`❌ Lỗi: ${result.message}`);
    }

    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md animate-fade-in-up">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Upload size={24} className="text-blue-600" />
            Sao lưu & Khôi phục
          </h2>
          <button 
            onClick={onClose} 
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all"
          >
            <X />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          
          {/* Warning Banner */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle size={20} className="text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800 dark:text-yellow-300">
              <p className="font-semibold mb-1">Lưu ý quan trọng</p>
              <p className="text-xs">
                Chức năng này chỉ sao lưu dữ liệu cá nhân (sự kiện, thời khóa biểu, GPA...). 
                Không bao gồm tài liệu đã upload và bài viết cộng đồng.
              </p>
            </div>
          </div>

          {/* Export Button */}
          <button
            onClick={handleExport}
            className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-xl font-bold shadow-lg shadow-blue-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Download size={20} />
            Sao lưu dữ liệu
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">hoặc</span>
            </div>
          </div>

          {/* Import Button */}
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept=".json" 
            onChange={handleImport} 
          />
          
          <button
            onClick={() => fileInputRef.current.click()}
            className="w-full flex items-center justify-center gap-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-6 py-4 rounded-xl font-bold border-2 border-gray-300 dark:border-gray-600 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Upload size={20} />
            Khôi phục từ file
          </button>

          {/* Info Text */}
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2">
            File sao lưu sẽ có định dạng <code className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">.json</code>
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-medium transition-colors"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
};

export default BackupRestoreModal;
