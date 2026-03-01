import React, { useState, useEffect, useRef } from 'react';
import { 
    X, Upload, Save, FileText, CheckCircle, CloudUpload, Trash2, AlertCircle, 
    FileSpreadsheet, Image, File as FileIcon 
} from 'lucide-react';

// Danh sách môn học
const SUBJECTS = [
    { id: 1, name: "Cơ sở toán trong CNTT" },
    { id: 2, name: "Tâm lý học đại cương" },
    { id: 3, name: "Kinh tế chính trị" },
    { id: 4, name: "Chủ nghĩa xã hội" },
    { id: 5, name: "Tâm lý học giáo dục" },
    { id: 6, name: "Lập trình C++" },
    { id: 7, name: "Toán rời rạc" },
    { id: 8, name: "Xác suất thống kê" },
    { id: 9, name: "Triết học Mác Lenin" },
    { id: 10, name: "Pháp luật đại cương" },
    { id: 11, name: "Quân sự" },
    { id: 'other', name: "Tài liệu khác" }
];

const getFileIconProps = (fileName) => {
    const ext = fileName?.split('.').pop()?.toLowerCase() || '';
    
    if (['pdf'].includes(ext)) return { icon: FileText, color: 'text-red-500', bg: 'bg-red-50' };
    if (['doc', 'docx'].includes(ext)) return { icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' };
    if (['xls', 'xlsx', 'csv'].includes(ext)) return { icon: FileSpreadsheet, color: 'text-green-600', bg: 'bg-green-50' };
    if (['ppt', 'pptx'].includes(ext)) return { icon: FileText, color: 'text-orange-500', bg: 'bg-orange-50' };
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return { icon: Image, color: 'text-purple-600', bg: 'bg-purple-50' };
    
    return { icon: FileIcon, color: 'text-gray-500', bg: 'bg-gray-50' };
};

// --- MODAL TẢI LÊN (GIAO DIỆN CHUYÊN NGHIỆP) ---
export const UploadModal = ({ isOpen, onClose, onSuccess, currentUser }) => {
  const MAX_FILE_SIZE_MB = 30;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
  const [file, setFile] = useState(null);
  const [name, setName] = useState('');
  const [course, setCourse] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [oversizeMessage, setOversizeMessage] = useState('');
  const fileInputRef = useRef(null);

  // Reset form khi mở modal
  useEffect(() => {
    if (isOpen) {
        setFile(null);
        setName('');
        setCourse('');
        setVisibility('public');
        setDragActive(false);
        setOversizeMessage('');
    }
  }, [isOpen]);

  // Xử lý file được chọn
  const handleFile = (selectedFile) => {
      if (selectedFile) {
          if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
              setOversizeMessage(`File vượt quá ${MAX_FILE_SIZE_MB}MB. Vui lòng chọn file nhỏ hơn hoặc bằng ${MAX_FILE_SIZE_MB}MB.`);
              return;
          }
          setOversizeMessage('');
          setFile(selectedFile);
          // Tự động điền tên file (bỏ đuôi mở rộng)
          const fileName = selectedFile.name.split('.').slice(0, -1).join('.');
          setName(fileName);
      }
  };

  const handleFileChange = (e) => {
      handleFile(e.target.files[0]);
  };

  // Xử lý Drag & Drop
  const handleDrag = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.type === "dragenter" || e.type === "dragover") {
          setDragActive(true);
      } else if (e.type === "dragleave") {
          setDragActive(false);
      }
  };

  const handleDrop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleFile(e.dataTransfer.files[0]);
      }
  };

  const handleSubmit = async () => {
      if (!file) return alert("Vui lòng chọn file!");
      if (!name.trim()) return alert("Vui lòng nhập tên tài liệu!");
      if (!course) return alert("Vui lòng chọn môn học!");
      
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', name);
      formData.append('course', course);
      formData.append('visibility', visibility);
      formData.append('username', currentUser.username);
      formData.append('uploader', currentUser.fullName);

      const ext = file.name.split('.').pop().toLowerCase();
      let type = 'other';
      if (['pdf'].includes(ext)) type = 'pdf';
      else if (['doc', 'docx'].includes(ext)) type = 'word';
      else if (['xls', 'xlsx'].includes(ext)) type = 'excel';
      else if (['ppt', 'pptx'].includes(ext)) type = 'ppt';
      else if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) type = 'image';
      
      formData.append('type', type);

      await onSuccess(formData); // Gọi hàm upload
      setIsSubmitting(false);
      onClose();
  };

  if (!isOpen) return null;

  const fileIconProps = file ? getFileIconProps(file.name) : null;
  const PreviewIcon = fileIconProps?.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col border border-gray-100 dark:border-gray-700">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/60">
            <div>
                <h3 className="font-bold text-xl text-gray-800 dark:text-white">Tải tài liệu lên</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Chia sẻ kiến thức với cộng đồng</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"><X className="text-gray-500 dark:text-gray-300" size={20}/></button>
        </div>

        <div className="p-6 space-y-5">
            {/* Vùng Drag & Drop */}
            {!file ? (
                <div 
                    className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer relative group ${dragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current.click()}
                >
                    <input 
                        ref={fileInputRef}
                        type="file" 
                        onChange={handleFileChange} 
                        className="hidden" 
                    />
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                        <CloudUpload size={32}/>
                    </div>
                    <p className="font-bold text-gray-700 dark:text-gray-200">Nhấn để chọn hoặc kéo thả file vào đây</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Hỗ trợ PDF, Word, Excel, PowerPoint, Ảnh (Max 30MB)</p>
                </div>
            ) : (
                // Giao diện khi đã chọn file
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-xl p-4 flex items-center gap-4 relative animate-fade-in-up">
                    <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-300 shadow-sm shrink-0">
                        <FileText size={24}/>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">{file.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB • Sẵn sàng tải lên</p>
                    </div>
                    <button 
                        onClick={() => setFile(null)} 
                        className="p-2 bg-white dark:bg-gray-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg shadow-sm transition-colors border border-gray-100 dark:border-gray-700"
                        title="Hủy chọn file"
                    >
                        <Trash2 size={18}/>
                    </button>
                </div>
            )}

            {/* Form nhập liệu (Chỉ hiện khi đã chọn file) */}
            {file && (
                <div className="space-y-4 animate-fade-in-up">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Tên hiển thị</label>
                        <input 
                            value={name} 
                            onChange={(e) => setName(e.target.value)} 
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                            placeholder="Ví dụ: Đề thi cuối kỳ Giải tích 1..." 
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Môn học</label>
                            <select 
                                value={course} 
                                onChange={(e) => setCourse(e.target.value)} 
                                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="">-- Chọn môn --</option>
                                {SUBJECTS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Quyền hạn</label>
                            <select 
                                value={visibility} 
                                onChange={(e) => setVisibility(e.target.value)} 
                                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="public">🌐 Công khai (Mọi người)</option>
                                <option value="private">🔒 Riêng tư (Chỉ mình tôi)</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-end gap-3">
            <button 
                onClick={onClose} 
                className="px-5 py-2.5 text-gray-600 dark:text-gray-300 font-bold text-sm hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
            >
                Hủy bỏ
            </button>
            <button 
                onClick={handleSubmit} 
                disabled={isSubmitting || !file}
                className="px-6 py-2.5 bg-gray-900 hover:bg-black text-white rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isSubmitting ? (
                    <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> Đang tải...</>
                ) : (
                    <><Upload size={18}/> Tải lên ngay</>
                )}
            </button>
        </div>
      </div>

      {oversizeMessage && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-red-200 dark:border-red-900/50 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-red-100 dark:border-red-900/40 bg-red-50 dark:bg-red-950/30 flex items-center gap-2">
              <AlertCircle size={18} className="text-red-600 dark:text-red-400 shrink-0" />
              <h4 className="font-bold text-red-700 dark:text-red-300">File vượt giới hạn</h4>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-700 dark:text-gray-200">{oversizeMessage}</p>
            </div>
            <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-end">
              <button
                onClick={() => setOversizeMessage('')}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- MODAL SỬA (GIỮ NGUYÊN HOẶC STYLE LẠI NHẸ) ---
export const EditDocModal = ({ isOpen, onClose, onSubmit, doc }) => {
    const [name, setName] = useState('');
    const [course, setCourse] = useState('');
    const [visibility, setVisibility] = useState('public');

    useEffect(() => {
        if (doc) {
            setName(doc.name);
            setCourse(doc.course || '');
            setVisibility(doc.visibility || 'public');
        }
    }, [doc]);

    const handleSubmit = () => {
        onSubmit({ docId: doc.id, name, course, visibility });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-lg text-gray-800">Sửa thông tin</h3>
                    <button onClick={onClose}><X className="text-gray-400 hover:text-red-500"/></button>
                </div>
                <div className="p-5 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">Tên tài liệu</label>
                        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2.5 border rounded-lg text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">Môn học</label>
                        <select value={course} onChange={(e) => setCourse(e.target.value)} className="w-full p-2.5 border rounded-lg text-sm bg-white">
                            <option value="other">Khác</option>
                            {SUBJECTS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">Quyền hạn</label>
                        <select value={visibility} onChange={(e) => setVisibility(e.target.value)} className="w-full p-2.5 border rounded-lg text-sm bg-white">
                            <option value="public">🌐 Công khai</option>
                            <option value="private">🔒 Riêng tư</option>
                        </select>
                    </div>
                    <button onClick={handleSubmit} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold mt-2">Lưu thay đổi</button>
                </div>
            </div>
        </div>
    );
};
