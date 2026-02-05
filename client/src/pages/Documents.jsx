import React, { useState, useEffect, useMemo } from 'react';
import { documentService } from '../services/documentService';
import { UploadModal, EditDocModal } from '../components/DocumentModals';
import { 
    Search, Upload, FileText, Image, FileSpreadsheet, File as FileIcon, 
    Eye, Edit3, Trash2, Bookmark, Globe, Lock, ChevronLeft, ChevronRight, 
    LayoutGrid, Star, Check 
} from 'lucide-react';

// Danh sách môn học
const SUBJECTS = [
    { id: 'all', name: "Tất cả" },
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
    { id: 'other', name: "Khác" }
];

const Documents = () => {
  // 👇 THAY ĐỔI 1: Đưa user vào State để cập nhật không cần reload
  const [currentUser, setCurrentUser] = useState(JSON.parse(localStorage.getItem('user')));
  
  // --- STATE ---
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters & View Mode
  const [viewMode, setViewMode] = useState('all'); 
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterType, setFilterType] = useState('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6; 

  // Modals
  const [isUploadModalOpen, setUploadModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [docToEdit, setDocToEdit] = useState(null);

  // --- FETCH DATA ---
  const loadDocuments = async () => {
      setIsLoading(true);
      try {
          const data = await documentService.getDocuments();
          // Filter: Chỉ hiện công khai HOẶC của chính mình (kể cả private)
          const validDocs = data.filter(doc => 
              doc.visibility !== 'private' || (currentUser && doc.uploaderUsername === currentUser.username)
          );
          setDocuments(validDocs);
      } catch (error) {
          console.error(error);
      } finally {
          setIsLoading(false);
      }
  };

  useEffect(() => {
      loadDocuments();
  }, []); // Chỉ chạy 1 lần khi mount, user thay đổi không cần load lại API documents

  // Reset trang khi đổi chế độ xem
  useEffect(() => {
      setCurrentPage(1);
  }, [viewMode, searchTerm, filterSubject, filterType]);

  // --- FILTER LOGIC ---
  const filteredDocs = useMemo(() => {
      return documents.filter(doc => {
          // 1. Lọc theo chế độ xem (Saved)
          // 👇 Dùng currentUser từ State để check realtime
          if (viewMode === 'saved') {
              if (!currentUser?.savedDocs?.includes(doc.id)) return false;
          }

          // 2. Các bộ lọc khác
          const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());
          const matchesSubject = filterSubject === 'all' || String(doc.course) === String(filterSubject);
          const matchesType = filterType === 'all' || doc.type === filterType;
          
          return matchesSearch && matchesSubject && matchesType;
      });
  }, [documents, searchTerm, filterSubject, filterType, viewMode, currentUser]);

  // --- PAGINATION ---
  const totalPages = Math.ceil(filteredDocs.length / itemsPerPage);
  const currentDocs = filteredDocs.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
  );

  // --- STATS ---
  const stats = useMemo(() => {
      const savedDocs = currentUser?.savedDocs || [];
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      return {
          total: documents.length,
          saved: savedDocs.filter(id => documents.find(d => d.id === id)).length,
          new: documents.filter(d => new Date(d.createdAt) > sevenDaysAgo).length
      };
  }, [documents, currentUser]);

  // --- HANDLERS ---
  const handleUpload = async (formData) => {
      const res = await documentService.uploadDocument(formData);
      if (res.success) { alert("Tải lên thành công!"); loadDocuments(); }
      else { alert("Lỗi: " + res.message); }
  };

  const handleEdit = async (data) => {
      const res = await documentService.updateDocument({ ...data, username: currentUser.username });
      if (res.success) loadDocuments();
  };

  const handleDelete = async (docId) => {
      if(confirm("Xóa tài liệu này?")) {
          const res = await documentService.deleteDocument(docId, currentUser.username);
          if (res.success) loadDocuments();
      }
  };

  // 👇 THAY ĐỔI 2: Xử lý Lưu không reload trang
  const handleToggleSave = async (docId) => {
      if (!currentUser) return alert("Vui lòng đăng nhập!");
      
      // Gọi API (Backend vẫn xử lý lưu vào DB)
      const res = await documentService.toggleSave(docId, currentUser.username);
      
      if (res.success) {
          // Cập nhật LocalStorage
          const updatedUser = { ...currentUser, savedDocs: res.savedDocs };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          
          // Cập nhật State -> React tự render lại giao diện -> KHÔNG RELOAD
          setCurrentUser(updatedUser);
      }
  };

  const handleView = (doc) => {
      const ext = doc.path.substring(doc.path.lastIndexOf('.')).toLowerCase();
      if (['.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt'].includes(ext)) {
          window.open(`https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(doc.path)}`, '_blank');
      } else {
          window.open(doc.path, '_blank');
      }
  };

  const getFileIcon = (type) => {
      switch(type) {
          case 'pdf': return { icon: FileText, color: 'text-red-500', bg: 'bg-red-50' };
          case 'word': return { icon: FileText, color: 'text-blue-500', bg: 'bg-blue-50' };
          case 'excel': return { icon: FileSpreadsheet, color: 'text-green-500', bg: 'bg-green-50' };
          case 'image': return { icon: Image, color: 'text-purple-500', bg: 'bg-purple-50' };
          default: return { icon: FileIcon, color: 'text-gray-500', bg: 'bg-gray-50' };
      }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            
            {/* === LEFT SIDEBAR === */}
            <div className="space-y-8">
                {/* 1. Bộ lọc */}
                <div>
                    <h3 className="font-bold text-lg mb-4 text-gray-800">Bộ lọc</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Tìm kiếm</label>
                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-3 text-gray-400"/>
                                <input 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Tên tài liệu..." 
                                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Môn học</label>
                            <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none cursor-pointer">
                                {SUBJECTS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Loại file</label>
                            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none cursor-pointer">
                                <option value="all">Tất cả</option>
                                <option value="pdf">PDF Document</option>
                                <option value="word">Microsoft Word</option>
                                <option value="ppt">PowerPoint</option>
                                <option value="image">Hình ảnh</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* 2. Thống kê */}
                <div>
                    <h3 className="font-bold text-lg mb-4 text-gray-800">Thống kê</h3>
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="flex justify-between items-center p-4 border-b border-gray-100">
                            <span className="text-sm text-gray-600">Tổng tài liệu</span>
                            <span className="font-bold text-gray-800">{stats.total}</span>
                        </div>
                        <div className="flex justify-between items-center p-4 border-b border-gray-100">
                            <span className="text-sm text-gray-600">Đã lưu</span>
                            <span className="font-bold text-blue-600">{stats.saved}</span>
                        </div>
                        <div className="flex justify-between items-center p-4">
                            <span className="text-sm text-gray-600">Mới (7 ngày)</span>
                            <span className="font-bold text-green-600">{stats.new}</span>
                        </div>
                    </div>
                </div>

                {/* 3. Thư viện cá nhân */}
                <div>
                    <h3 className="font-bold text-lg mb-4 text-gray-800">Thư viện</h3>
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden p-2 space-y-1">
                        <button 
                            onClick={() => setViewMode('all')}
                            className={`w-full flex items-center justify-between p-3 rounded-lg text-sm font-medium transition-colors ${viewMode === 'all' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
                        >
                            <span className="flex items-center gap-2"><LayoutGrid size={18}/> Kho tài liệu chung</span>
                            {viewMode === 'all' && <Check size={16}/>}
                        </button>
                        <button 
                            onClick={() => setViewMode('saved')}
                            className={`w-full flex items-center justify-between p-3 rounded-lg text-sm font-medium transition-colors ${viewMode === 'saved' ? 'bg-orange-50 text-orange-600' : 'text-gray-600 hover:bg-gray-50'}`}
                        >
                            <span className="flex items-center gap-2"><Star size={18}/> Tài liệu đã lưu</span>
                            {viewMode === 'saved' && <Check size={16}/>}
                        </button>
                    </div>
                </div>
            </div>

            {/* === MAIN CONTENT === */}
            <div className="lg:col-span-3">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        {viewMode === 'saved' ? <><Star className="text-orange-500 fill-orange-500"/> Tài liệu đã lưu</> : 'Kho tài liệu'}
                    </h2>
                    <button 
                        onClick={() => setUploadModalOpen(true)}
                        className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-black transition-all shadow-lg shadow-gray-200"
                    >
                        <Upload size={16}/> Tải lên
                    </button>
                </div>

                {isLoading ? (
                    <div className="text-center py-20 text-gray-400">Đang tải...</div>
                ) : filteredDocs.length === 0 ? (
                    <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                        <p className="text-gray-500">
                            {viewMode === 'saved' ? 'Bạn chưa lưu tài liệu nào.' : 'Không tìm thấy tài liệu.'}
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Grid Documents */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in-up">
                            {currentDocs.map(doc => {
                                const { icon: Icon, color, bg } = getFileIcon(doc.type);
                                
                                // 👇 THAY ĐỔI 3: Logic Quyền (Admin hoặc Chủ sở hữu)
                                const isAdmin = currentUser?.role === 'admin';
                                const isOwner = currentUser && (
                                    doc.uploaderUsername === currentUser.username || 
                                    doc.uploader === currentUser.fullName // Support dữ liệu cũ
                                );
                                const canAction = isAdmin || isOwner; // Cho phép sửa/xóa

                                const isSaved = currentUser?.savedDocs?.includes(doc.id);
                                const subjectName = SUBJECTS.find(s => s.id == doc.course)?.name || "Khác";

                                return (
                                    <div key={doc.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group flex flex-col h-full relative">
                                        
                                        {/* HEADER: Icon và Title + Badge (Đã sửa lỗi đè chữ) */}
                                        <div className="flex items-start gap-4 mb-4">
                                            {/* Icon File */}
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${bg} ${color}`}>
                                                <Icon size={24}/>
                                            </div>
                                
                                            {/* Content Right */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start gap-2">
                                                    {/* Tên file (Có thể xuống dòng) */}
                                                    <h4 className="font-bold text-gray-800 text-sm line-clamp-2 leading-tight" title={doc.name}>
                                                        {doc.name}
                                                    </h4>
                                                    
                                                    {/* Badge (Không dùng absolute nữa, dùng flex item để chiếm chỗ) */}
                                                    {doc.visibility === 'private' ? (
                                                        <span className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200 whitespace-nowrap">
                                                            <Lock size={10}/> Riêng tư
                                                        </span>
                                                    ) : (
                                                        <span className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100 whitespace-nowrap">
                                                            <Globe size={10}/> Công khai
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                
                                        {/* INFO: Người tải, Môn, Ngày... (Giữ nguyên) */}
                                        <div className="space-y-2 text-xs text-gray-500 mb-6 flex-1">
                                            <div className="flex justify-between">
                                                <span>Người tải:</span>
                                                <span className="font-medium text-gray-700 truncate ml-2">{doc.uploader || 'Ẩn danh'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Môn:</span>
                                                <span className="font-medium text-gray-700 truncate max-w-[120px]" title={subjectName}>{subjectName}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Ngày:</span>
                                                <span className="font-medium text-gray-700">{new Date(doc.createdAt).toLocaleDateString('vi-VN')}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Kích cỡ:</span>
                                                <span className="font-medium text-gray-700">{(doc.size / 1024 / 1024).toFixed(2)} MB</span>
                                            </div>
                                        </div>
                                
                                        {/* ACTIONS FOOTER (Giữ nguyên) */}
                                        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                            <button onClick={() => handleView(doc)} className="p-2 text-gray-400 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors" title="Xem">
                                                <Eye size={18}/>
                                            </button>
                                            <button onClick={() => handleToggleSave(doc.id)} className={`p-2 rounded-lg transition-colors ${isSaved ? 'text-blue-600 bg-blue-50' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'}`} title="Lưu">
                                                <Bookmark size={18} fill={isSaved ? "currentColor" : "none"}/>
                                            </button>
                                            
                                            {canAction && (
                                                <>
                                                <button onClick={() => { setDocToEdit(doc); setEditModalOpen(true); }} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Sửa">
                                                    <Edit3 size={18}/>
                                                </button>
                                                <button onClick={() => handleDelete(doc.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Xóa">
                                                    <Trash2 size={18}/>
                                                </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex justify-center items-center gap-2 mt-8">
                                <button 
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft size={20} className="text-gray-600"/>
                                </button>
                                <span className="text-sm font-bold text-gray-700 bg-gray-100 px-4 py-2 rounded-lg">
                                    Trang {currentPage} / {totalPages}
                                </span>
                                <button 
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRight size={20} className="text-gray-600"/>
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>

        {/* Modals */}
        <UploadModal 
            isOpen={isUploadModalOpen} 
            onClose={() => setUploadModalOpen(false)} 
            onSuccess={handleUpload}
            currentUser={currentUser}
        />
        <EditDocModal
            isOpen={isEditModalOpen}
            onClose={() => setEditModalOpen(false)}
            onSubmit={handleEdit}
            doc={docToEdit}
        />
    </div>
  );
};

export default Documents;