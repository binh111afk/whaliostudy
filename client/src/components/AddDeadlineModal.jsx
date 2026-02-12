import React, { useState } from 'react';
import { toast } from 'sonner';
import { X, Calendar, Clock, Type, Save, AlertCircle } from 'lucide-react';

const AddDeadlineModal = ({ isOpen, onClose, onSuccess, username }) => {
    const [title, setTitle] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]); // Mặc định hôm nay
    const [time, setTime] = useState('23:59');
    const [type, setType] = useState('deadline'); // exam, deadline, other
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!title.trim()) return toast.error("Vui lòng nhập tên deadline!");
        if (!date) return toast.error("Vui lòng chọn ngày!");

        setLoading(true);
        try {
            // Kết hợp ngày và giờ
            const finalDate = new Date(`${date}T${time}`);

            const response = await fetch('/api/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username,
                    title,
                    date: finalDate,
                    type
                })
            });

            const data = await response.json();

            if (data.success) {
                toast.success("Thêm deadline thành công!");
                // Reset form
                setTitle('');
                setType('deadline');
                onSuccess(); // Báo cho Dashboard biết để load lại list
                onClose();   // Đóng modal
            } else {
                toast.error(data.message || "Có lỗi xảy ra!");
            }
        } catch (error) {
            console.error("Lỗi thêm deadline:", error);
            toast.error("Không thể kết nối đến server!");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl transform transition-all scale-100">
                {/* Header */}
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Calendar className="text-blue-600" /> Thêm Deadline mới
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer">
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tên công việc</label>
                        <input 
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Ví dụ: Nộp bài tập C++..."
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                            autoFocus
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ngày hết hạn</label>
                            <div className="relative">
                                <input 
                                    type="date" 
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full p-3 pl-10 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                                />
                                <Calendar className="absolute left-3 top-3 text-gray-400" size={18}/>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Giờ</label>
                            <div className="relative">
                                <input 
                                    type="time" 
                                    value={time}
                                    onChange={(e) => setTime(e.target.value)}
                                    className="w-full p-3 pl-10 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                                />
                                <Clock className="absolute left-3 top-3 text-gray-400" size={18}/>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Loại công việc</label>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setType('deadline')}
                                className={`flex-1 py-2 rounded-lg text-sm font-bold border cursor-pointer ${type === 'deadline' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-gray-200 text-gray-500'}`}
                            >
                                Deadline
                            </button>
                            <button 
                                onClick={() => setType('exam')}
                                className={`flex-1 py-2 rounded-lg text-sm font-bold border cursor-pointer ${type === 'exam' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-200 text-gray-500'}`}
                            >
                                Lịch thi
                            </button>
                            <button 
                                onClick={() => setType('other')}
                                className={`flex-1 py-2 rounded-lg text-sm font-bold border cursor-pointer ${type === 'other' ? 'bg-gray-100 border-gray-300 text-gray-600' : 'bg-white border-gray-200 text-gray-500'}`}
                            >
                                Khác
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-8 flex gap-3">
                    <button 
                        onClick={onClose}
                        className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-all cursor-pointer"
                    >
                        Hủy bỏ
                    </button>
                    <button 
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 flex items-center justify-center gap-2 transition-all disabled:opacity-70 cursor-pointer"
                    >
                        {loading ? 'Đang lưu...' : <><Save size={18}/> Lưu Deadline</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddDeadlineModal;