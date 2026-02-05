import React, { useState, useEffect } from 'react';
import { 
    X, Save, Plus, Trash2, CheckSquare, Square, 
    Calendar, Clock, MapPin, Building, Layers, Edit3, Hash
} from 'lucide-react';
import { PERIOD_TIMES } from '../utils/timetableHelpers';

// ============================================================
// 1. MODAL THÊM / SỬA LỚP HỌC (GIAO DIỆN MỚI)
// ============================================================
export const ClassModal = ({ isOpen, onClose, onSubmit, initialData }) => {
  const [formData, setFormData] = useState({
    subject: '', room: '', campus: 'Cơ sở chính', 
    day: '2', session: 'morning', startPeriod: 1, numPeriods: 2,
    startDate: '', endDate: ''
  });

  // --- Helper: Lấy tuần hiện tại ---
  const getDefaultWeekDates = () => {
    const today = new Date();
    const day = today.getDay();
    const diffToMon = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diffToMon));
    const sunday = new Date(new Date(monday).setDate(monday.getDate() + 6));
    const toInputString = (date) => date.toISOString().split('T')[0];
    return { start: toInputString(monday), end: toInputString(sunday) };
  };

  // --- Reset / Fill Data ---
  useEffect(() => {
    if (isOpen) {
        if (initialData) {
            setFormData({
                ...initialData,
                startDate: initialData.startDate ? initialData.startDate.split('T')[0] : '',
                endDate: initialData.endDate ? initialData.endDate.split('T')[0] : ''
            }); 
        } else {
            const defaults = getDefaultWeekDates();
            setFormData({ 
                subject: '', room: '', campus: 'Cơ sở chính', 
                day: '2', session: 'morning', startPeriod: 1, numPeriods: 2,
                startDate: defaults.start, endDate: defaults.end
            }); 
        }
    }
  }, [isOpen, initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    if (!formData.subject.trim()) return alert('Vui lòng nhập tên môn học!');
    if (!formData.room.trim()) return alert('Vui lòng nhập phòng học!');
    onSubmit(formData, !!initialData);
  };

  // --- Tính giờ tự động ---
  const getCalculatedTime = () => {
      const start = parseInt(formData.startPeriod);
      const num = parseInt(formData.numPeriods);
      const end = start + num - 1;
      if (end > 15) return '⚠️ Vượt quá tiết 15';
      const startTime = PERIOD_TIMES[start]?.start || '??:??';
      const endTime = PERIOD_TIMES[end]?.end || '??:??';
      return `${startTime} - ${endTime} (Tiết ${start} - ${end})`;
  };

  if (!isOpen) return null;

  // CSS Classes dùng chung
  const inputStyle = "w-full p-2.5 border border-gray-300 bg-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm font-medium text-gray-800 placeholder-gray-400";
  const labelStyle = "block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5";
  const iconStyle = "text-gray-400";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        
        {/* --- HEADER --- */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/80 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl shadow-sm ${initialData ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                    {initialData ? <Edit3 size={22}/> : <Plus size={22}/>}
                </div>
                <div>
                    <h3 className="font-bold text-xl text-gray-800 leading-none">{initialData ? 'Cập Nhật Lớp Học' : 'Thêm Môn Học Mới'}</h3>
                    <p className="text-sm text-gray-500 mt-1">Điền thông tin chi tiết vào thời khóa biểu</p>
                </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X className="text-gray-500" size={20}/></button>
        </div>
        
        {/* --- BODY --- */}
        <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
            
            {/* 1. Tên môn */}
            <div>
                <label className={labelStyle}><Layers size={14} className={iconStyle}/> Tên môn học <span className="text-red-500">*</span></label>
                <input name="subject" value={formData.subject} onChange={handleChange} className={inputStyle + " text-base"} placeholder="Ví dụ: Toán cao cấp A1" autoFocus />
            </div>
            
            {/* 2. Địa điểm (Grid 2 cột) */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className={labelStyle}><MapPin size={14} className={iconStyle}/> Phòng học <span className="text-red-500">*</span></label>
                    <input name="room" value={formData.room} onChange={handleChange} className={inputStyle} placeholder="Vd: A101" />
                </div>
                <div>
                    <label className={labelStyle}><Building size={14} className={iconStyle}/> Cơ sở</label>
                    <input name="campus" value={formData.campus} onChange={handleChange} className={inputStyle} placeholder="Vd: CS1" />
                </div>
            </div>

            {/* 3. Thời gian (Grid 2 cột) */}
            <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-100 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={labelStyle}><Calendar size={14} className={iconStyle}/> Thứ</label>
                        <select name="day" value={formData.day} onChange={handleChange} className={inputStyle}>
                            {['2', '3', '4', '5', '6', '7', 'CN'].map(d => <option key={d} value={d}>{d === 'CN' ? 'Chủ Nhật' : 'Thứ ' + d}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={labelStyle}><Clock size={14} className={iconStyle}/> Buổi</label>
                        <select name="session" value={formData.session} onChange={handleChange} className={inputStyle}>
                            <option value="morning">Sáng</option>
                            <option value="afternoon">Chiều</option>
                            <option value="evening">Tối</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={labelStyle}><Hash size={14} className={iconStyle}/> Tiết bắt đầu</label>
                        <select name="startPeriod" value={formData.startPeriod} onChange={handleChange} className={inputStyle}>
                            {Object.keys(PERIOD_TIMES).map(p => (
                                <option key={p} value={p}>Tiết {p} ({PERIOD_TIMES[p].start})</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className={labelStyle}><Hash size={14} className={iconStyle}/> Số tiết</label>
                        <input type="number" name="numPeriods" value={formData.numPeriods} onChange={handleChange} min="1" max="15" className={inputStyle} />
                    </div>
                </div>

                {/* Thanh hiển thị giờ tự động */}
                <div className="bg-white p-3 rounded-lg border border-blue-100 flex justify-between items-center shadow-sm">
                    <span className="text-xs font-bold text-blue-700 uppercase flex items-center gap-1"><Clock size={14}/> Thời gian thực</span>
                    <span className="text-sm font-black text-blue-600">
                        {getCalculatedTime()}
                    </span>
                </div>
            </div>

            {/* 4. Ngày áp dụng (Grid 2 cột) */}
            <div>
                <label className={labelStyle}><Calendar size={14} className={iconStyle}/> Thời gian áp dụng (Tùy chọn)</label>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} className={inputStyle} title="Ngày bắt đầu" />
                    </div>
                    <div>
                        <input type="date" name="endDate" value={formData.endDate} onChange={handleChange} className={inputStyle} title="Ngày kết thúc" />
                    </div>
                </div>
                <p className="text-[11px] text-gray-400 mt-2 italic ml-1">* Mặc định áp dụng cho tuần hiện tại. Để trống nếu học tất cả các tuần.</p>
            </div>

        </div>

        {/* --- FOOTER --- */}
        <div className="p-4 border-t border-gray-100 bg-white shrink-0">
            <button 
                onClick={handleSubmit} 
                className={`w-full py-3.5 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98] text-base ${initialData ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' : 'bg-green-600 hover:bg-green-700 shadow-green-200'}`}
            >
                <Save size={20}/> {initialData ? 'Lưu Thay Đổi' : 'Hoàn Tất Thêm Môn'}
            </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// 2. MODAL GHI CHÚ (NOTES) - Giữ nguyên để đảm bảo tính năng
// ============================================================
export const NotesModal = ({ isOpen, onClose, classData, onAdd, onToggle, onDelete }) => {
    const [noteContent, setNoteContent] = useState('');

    const handleAdd = () => {
        if (!noteContent.trim()) return;
        onAdd(noteContent);
        setNoteContent('');
    };

    if (!isOpen || !classData) return null;

    const notes = classData.notes || [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                <div className="p-4 border-b border-gray-100 bg-yellow-50 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-100 text-yellow-700 rounded-lg">
                            <CheckSquare size={20}/>
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-gray-800 leading-none">Ghi chú môn học</h3>
                            <p className="text-xs text-gray-500 font-medium mt-1 line-clamp-1">{classData.subject}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-yellow-200 rounded-full transition-colors"><X className="text-gray-500"/></button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar bg-gray-50/50">
                    {notes.length === 0 ? (
                        <div className="text-center py-12 text-gray-400 flex flex-col items-center">
                            <CheckSquare size={32} className="mb-2 opacity-30"/>
                            <p>Chưa có ghi chú nào.</p>
                        </div>
                    ) : (
                        notes.map(note => (
                            <div key={note.id} className={`flex items-start gap-3 p-3 rounded-xl border transition-all group ${note.isDone ? 'bg-gray-100 border-gray-200' : 'bg-white border-gray-200 shadow-sm hover:border-blue-200'}`}>
                                <button onClick={() => onToggle(note.id)} className={`mt-0.5 transition-colors ${note.isDone ? 'text-gray-400 hover:text-blue-600' : 'text-blue-600 hover:text-blue-700'}`}>
                                    {note.isDone ? <CheckSquare size={22}/> : <Square size={22}/>}
                                </button>
                                <div className={`flex-1 text-sm leading-relaxed break-words ${note.isDone ? 'text-gray-400 line-through' : 'text-gray-700 font-medium'}`}>
                                    {note.content}
                                </div>
                                <button onClick={() => onDelete(note.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Trash2 size={18}/>
                                </button>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-3 border-t border-gray-100 bg-white shrink-0">
                    <div className="flex gap-2 items-center bg-gray-100 p-1 rounded-xl pl-3 focus-within:ring-2 focus-within:ring-yellow-300 transition-all">
                        <input 
                            value={noteContent} 
                            onChange={(e) => setNoteContent(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                            className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-gray-800 placeholder-gray-400"
                            placeholder="Thêm việc cần làm..." 
                            autoFocus
                        />
                        <button onClick={handleAdd} disabled={!noteContent.trim()} className="p-2.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 font-bold transition-colors shadow-sm">
                            <Plus size={20}/>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};