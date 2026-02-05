import React, { useState, useEffect, useMemo } from 'react';
import { examService } from '../services/examService';
import { ExamRunner } from '../components/ExamRunner';
import { ExamCreator } from '../components/ExamCreator';
import { Search, Plus, BookOpen, Trophy, Clock, FileText, X, Trash2 } from 'lucide-react';

const SUBJECTS = ["Tất cả", "Toán học", "Vật lý", "Hóa học", "Tiếng Anh", "Sinh học", "Lịch sử"];

const Exams = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    
    // State
    const [exams, setExams] = useState([]);
    const [filterSubject, setFilterSubject] = useState("Tất cả");
    const [searchTerm, setSearchTerm] = useState("");
    
    // View Management
    const [activeExam, setActiveExam] = useState(null); // Exam object selected
    const [examMode, setExamMode] = useState(null); // 'practice' | 'real'
    const [isCreatorOpen, setCreatorOpen] = useState(false);
    const [showModeModal, setShowModeModal] = useState(false); // Modal chọn chế độ

    useEffect(() => {
        loadExams();
    }, []);

    const loadExams = async () => {
        try {
            const data = await examService.getExams();
            setExams(data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleCreateSuccess = async (newExam) => {
        await examService.createExam(newExam);
        setCreatorOpen(false);
        loadExams();
    };

    const handleDelete = async (examId) => {
        if(confirm("Xóa đề này?")) {
            await examService.deleteExam(examId, user.username);
            loadExams();
        }
    };

    // Filter
    const filteredExams = useMemo(() => {
        return exams.filter(e => {
            const matchSub = filterSubject === "Tất cả" || e.subject === filterSubject;
            const matchSearch = e.title.toLowerCase().includes(searchTerm.toLowerCase());
            return matchSub && matchSearch;
        });
    }, [exams, filterSubject, searchTerm]);

    // --- RENDER: EXAM RUNNER ---
    if (activeExam && examMode) {
        return <ExamRunner exam={activeExam} mode={examMode} onExit={() => {
            setActiveExam(null);
            setExamMode(null);
        }} />;
    }

    // --- RENDER: EXAM CREATOR ---
    if (isCreatorOpen) {
        return <ExamCreator onClose={() => setCreatorOpen(false)} onSuccess={handleCreateSuccess} />;
    }

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-6 pb-20">
            {/* Header */}
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">Thư viện đề thi</h1>
                    <p className="text-gray-500">Chọn đề thi phù hợp để bắt đầu luyện tập</p>
                </div>
                <button 
                    onClick={() => setCreatorOpen(true)}
                    className="bg-gray-900 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-black transition-all shadow-lg"
                >
                    <Plus size={18}/> Tạo đề mới
                </button>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 mb-8">
                <div className="relative mb-3">
                    <Search className="absolute left-3 top-3 text-gray-400" size={20}/>
                    <input 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Tìm kiếm đề thi..." 
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-100 outline-none"
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {SUBJECTS.map(sub => (
                        <button
                            key={sub}
                            onClick={() => setFilterSubject(sub)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${
                                filterSubject === sub 
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-200' 
                                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            {sub}
                        </button>
                    ))}
                </div>
            </div>

            {/* Exam Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredExams.map(exam => (
                    // 👇 THÊM class "group relative" để xử lý hover
                    <div key={exam.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col h-full group relative">
                        
                        {/* 👇 NÚT XÓA: Chỉ hiện khi di chuột (group-hover:opacity-100) */}
                        {!exam.isStatic && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleDelete(exam.id); }}
                                className="absolute top-4 right-4 p-2 bg-white text-gray-400 hover:text-red-600 rounded-lg shadow-sm border border-gray-100 opacity-0 group-hover:opacity-100 transition-all z-10"
                                title="Xóa đề thi này"
                            >
                                <Trash2 size={18}/>
                            </button>
                        )}

                        <div className="flex justify-between items-start mb-4 pr-8"> 
                            {/* pr-8 để chữ không đè lên nút xóa */}
                            <h3 className="text-lg font-bold text-gray-800 line-clamp-2">{exam.title}</h3>
                        </div>
                        
                        <div className="mb-4">
                            <span className="inline-block px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold mb-3">
                                {exam.subject}
                            </span>
                            <p className="text-sm text-gray-500 line-clamp-2">
                                Đề thi bao gồm các câu hỏi trắc nghiệm kiến thức tổng hợp môn {exam.subject}.
                            </p>
                        </div>

                        <div className="flex items-center gap-4 text-xs font-medium text-gray-500 mb-6 mt-auto">
                            <div className="flex items-center gap-1"><Clock size={14}/> {exam.time}</div>
                            {/* 👇 Hiển thị số câu đúng logic: nếu là số thì hiện số, nếu là mảng thì hiện độ dài */}
                            <div className="flex items-center gap-1">
                                <FileText size={14}/> 
                                {typeof exam.questions === 'number' ? exam.questions : (exam.questions?.length || 0)} câu
                            </div>
                        </div>

                        <button 
                            onClick={() => { setActiveExam(exam); setShowModeModal(true); }}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-100"
                        >
                            ▷ Làm bài thi
                        </button>
                    </div>
                ))}
            </div>

            {/* --- MODAL CHỌN CHẾ ĐỘ (GIỐNG ẢNH) --- */}
            {showModeModal && activeExam && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
                        {/* Header Gradient */}
                        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white relative">
                            <button onClick={() => { setShowModeModal(false); setActiveExam(null); }} className="absolute top-4 right-4 text-white/80 hover:text-white"><X/></button>
                            <h2 className="text-2xl font-bold mb-1">Chọn chế độ làm bài</h2>
                            <div className="flex items-center gap-4 text-sm text-white/90 mt-2 bg-white/10 w-fit px-3 py-1.5 rounded-lg backdrop-blur-sm">
                                <span className="font-bold">{activeExam.title}</span>
                                <span className="w-1 h-1 bg-white rounded-full"></span>
                                <span>{activeExam.time}</span>
                                <span className="w-1 h-1 bg-white rounded-full"></span>
                                <span>{activeExam.questions?.length} câu</span>
                            </div>
                        </div>

                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Card Luyện tập */}
                            <button 
                                onClick={() => { setShowModeModal(false); setExamMode('practice'); }}
                                className="border-2 border-gray-100 rounded-2xl p-6 text-center hover:border-blue-500 hover:bg-blue-50 transition-all group"
                            >
                                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                    <BookOpen size={32}/>
                                </div>
                                <h3 className="text-lg font-bold text-gray-800 mb-2">Luyện tập</h3>
                                <p className="text-sm text-gray-500 leading-relaxed">
                                    Làm bài không giới hạn thời gian, có thể xem đáp án và giải thích ngay lập tức sau khi chọn.
                                </p>
                            </button>

                            {/* Card Thi thật */}
                            <button 
                                onClick={() => { setShowModeModal(false); setExamMode('real'); }}
                                className="border-2 border-gray-100 rounded-2xl p-6 text-center hover:border-purple-500 hover:bg-purple-50 transition-all group"
                            >
                                <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                    <Trophy size={32}/>
                                </div>
                                <h3 className="text-lg font-bold text-gray-800 mb-2">Thi thật</h3>
                                <p className="text-sm text-gray-500 leading-relaxed">
                                    Thi theo thời gian thực, đồng hồ đếm ngược. Kết quả và đáp án chỉ hiện sau khi nộp bài.
                                </p>
                            </button>
                        </div>

                        <div className="p-4 border-t border-gray-100 text-center">
                            <button onClick={() => { setShowModeModal(false); setActiveExam(null); }} className="text-gray-500 hover:text-gray-800 font-medium text-sm">Hủy bỏ</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Exams;