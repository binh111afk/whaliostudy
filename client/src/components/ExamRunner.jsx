import React, { useState, useEffect, useRef } from 'react';
import { Clock, CheckCircle, XCircle, AlertTriangle, FileText, ChevronLeft, Flag, AlertCircle, Map, ChevronDown } from 'lucide-react';
import { examService } from '../services/examService';

export const ExamRunner = ({ exam, mode, onExit }) => {
    // --- STATE ---
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({});
    const [confirmedShortAnswers, setConfirmedShortAnswers] = useState(new Set());
    const [timeLeft, setTimeLeft] = useState(0);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [score, setScore] = useState(null);
    const [errorMsg, setErrorMsg] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isMapOpen, setIsMapOpen] = useState(false);

    // Timer Ref
    const timerRef = useRef(null);

    // --- KHỞI TẠO BÀI THI ---
    useEffect(() => {
        const initExam = async () => {
            try {
                setLoading(true);
                let rawQuestions = [];

                // 1. Lấy dữ liệu câu hỏi (Array)
                // Nếu 'exam.questions' là Mảng (đề tự tạo) -> Dùng luôn
                if (Array.isArray(exam.questions) && exam.questions.length > 0) {
                    rawQuestions = exam.questions;
                }
                // Nếu không, phải đi tải từ JSON/API về
                // 👇 FIX: Dùng examId hoặc id vì server trả về examId
                else {
                    rawQuestions = await examService.getQuestionsByExamId(exam.examId || exam.id, exam.isStatic);
                }

                if (!rawQuestions || rawQuestions.length === 0) {
                    setErrorMsg("⚠️ Đề thi này chưa có dữ liệu câu hỏi!");
                    setLoading(false);
                    return;
                }

                // 2. Xáo trộn ngân hàng câu hỏi trước
                let processedQuestions = [...rawQuestions];
                processedQuestions = processedQuestions.sort(() => Math.random() - 0.5);

                // 3. 👇 FIX LOGIC GIỚI HẠN SỐ CÂU (QUAN TRỌNG)
                // Ưu tiên 1: exam.limit (nếu có)
                // Ưu tiên 2: exam.questions (nếu nó là số, ví dụ json: "questions": 40)
                // Mặc định: Lấy hết
                let limit = processedQuestions.length;

                if (exam.limit) {
                    limit = parseInt(exam.limit);
                } else if (typeof exam.questions === 'number') {
                    limit = exam.questions;
                }

                // Cắt đúng số lượng yêu cầu
                if (limit > 0 && limit < processedQuestions.length) {
                    processedQuestions = processedQuestions.slice(0, limit);
                }

                // 4. Xử lý từng câu (Shuffle đáp án, gán ID...)
                processedQuestions = processedQuestions.map((q, idx) => {
                    // ... (Đoạn này giữ nguyên logic map cũ) ...
                    const safeOptions = Array.isArray(q.options) ? q.options : [];
                    const safeAnswer = Number.isInteger(q.answer) ? q.answer : -1;

                    let currentOptions = [...safeOptions];
                    let newAnswerIndex = safeAnswer;

                    const normalizedType = (q.type === 'short_answer' || q.type === 'essay')
                        ? 'short_answer'
                        : 'multiple_choice';

                    if (normalizedType === 'multiple_choice' && currentOptions.length > 0 && safeAnswer >= 0 && safeAnswer < currentOptions.length) {
                        const correctContent = currentOptions[safeAnswer];
                        currentOptions = currentOptions.sort(() => Math.random() - 0.5);
                        newAnswerIndex = currentOptions.indexOf(correctContent);
                    }

                    return {
                        ...q,
                        internalId: idx + 1,
                        options: currentOptions,
                        correctAnswer: newAnswerIndex,
                        type: normalizedType,
                        correctText: typeof q.answer === 'string' ? q.answer : ''
                    };
                });

                setQuestions(processedQuestions);

                // ... (Phần timer giữ nguyên) ...
                const durationMinutes = parseInt(exam.time) || 45;
                if (mode === 'real') {
                    setTimeLeft(durationMinutes * 60);
                }

                setLoading(false);

            } catch (err) {
                console.error("❌ Lỗi khởi tạo bài thi:", err);
                setErrorMsg("Có lỗi xảy ra khi tải đề thi. Vui lòng thử lại!");
                setLoading(false);
            }
        };

        initExam();
    }, [exam, mode]);

    // --- TIMER LOGIC ---
    useEffect(() => {
        if (mode === 'real' && timeLeft > 0 && !isSubmitted && !loading && !errorMsg) {
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current);
                        handleSubmit(true);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(timerRef.current);
    }, [timeLeft, isSubmitted, mode, loading, errorMsg]);

    // --- HANDLERS ---
    const handleSelectOption = (qId, optIdx) => {
        // 1. Chặn nếu đã nộp bài
        if (isSubmitted) return;

        // 2. 👇 LOGIC MỚI: Chặn nếu là mode 'practice' và ĐÃ TRẢ LỜI RỒI (Khóa câu hỏi)
        if (mode === 'practice' && answers[qId] !== undefined) return;

        setAnswers(prev => ({ ...prev, [qId]: optIdx }));
    };

    const handleEssayAnswer = (qId, text) => {
        setAnswers(prev => ({ ...prev, [qId]: text }));
    };
    const confirmShortAnswer = (qId) => {
        setConfirmedShortAnswers(prev => new Set([...prev, qId]));
    };

    const normalizeShortAnswer = (value) => {
        return String(value || '')
            .toLowerCase()
            .replace(/[^\p{L}\p{N}\s]/gu, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    };

        const handleSubmit = (auto = false) => {
            if (!auto && mode === 'real') {
                const answeredCount = Object.keys(answers).length;
                if (answeredCount < questions.length) {
                    if (!confirm(`Bạn mới làm ${answeredCount}/${questions.length} câu. Bạn có chắc muốn nộp bài?`)) return;
            } else {
                if (!confirm("Xác nhận nộp bài thi?")) return;
            }
        }

        setIsSubmitted(true);
            clearInterval(timerRef.current);

            let correctCount = 0;
            questions.forEach(q => {
                if (q.type === 'short_answer') {
                    const userText = normalizeShortAnswer(answers[q.internalId]);
                    const expectedText = normalizeShortAnswer(q.correctText || q.answer);
                    if (userText && expectedText && userText === expectedText) {
                        correctCount++;
                    }
                    return;
                }

                if (answers[q.internalId] === q.correctAnswer) {
                    correctCount++;
                }
            });
            setScore(correctCount);
        };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    // 👇 LOGIC MỚI: Xử lý màu sắc cho Map Sidebar
    const getQuestionStatusClass = (q) => {
        const userAns = answers[q.internalId];

        // --- LOGIC CHO CHẾ ĐỘ LUYỆN TẬP (Hiện màu ngay khi chọn) ---
        if (mode === 'practice' && userAns !== undefined) {
            if (q.type === 'short_answer') {
                const isMatch = normalizeShortAnswer(userAns) === normalizeShortAnswer(q.correctText || q.answer);
                return isMatch ? 'bg-green-500 text-white border-green-500' : 'bg-red-500 text-white border-red-500';
            }
            if (userAns === q.correctAnswer) return 'bg-green-500 text-white border-green-500';
            return 'bg-red-500 text-white border-red-500';
        }

        // --- LOGIC KHI ĐÃ NỘP BÀI (Chế độ thi thật sau khi nộp) ---
        if (isSubmitted) {
            if (q.type === 'short_answer') {
                const isMatch = normalizeShortAnswer(userAns) === normalizeShortAnswer(q.correctText || q.answer);
                if (userAns !== undefined && userAns !== '') {
                    return isMatch ? 'bg-green-500 text-white border-green-500' : 'bg-red-500 text-white border-red-500';
                }
                return 'bg-white dark:bg-gray-700 border-red-300 dark:border-red-700 text-red-400';
            }
            if (userAns === q.correctAnswer) return 'bg-green-500 text-white border-green-500';
            if (userAns !== undefined && userAns !== q.correctAnswer) return 'bg-red-500 text-white border-red-500';
            return 'bg-white dark:bg-gray-700 border-red-300 dark:border-red-700 text-red-400';
        }

        // --- LOGIC KHI ĐANG LÀM BÀI (Chế độ thi thật) ---
        // Chỉ hiện màu xanh dương để biết đã chọn, không lộ đáp án
        if (userAns !== undefined) {
            return 'bg-blue-600 text-white border-blue-600';
        }

        // Mặc định (Chưa làm)
        return 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:border-blue-400 dark:hover:border-blue-500';
    };

    if (loading) return <div className="fixed inset-0 bg-white dark:bg-gray-900 z-50 flex items-center justify-center"><div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;

    if (errorMsg) return (
        <div className="fixed inset-0 bg-gray-50 dark:bg-gray-900 z-50 flex flex-col items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl text-center max-w-md w-full">
                <AlertCircle size={32} className="text-red-500 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 mb-6">{errorMsg}</p>
                <button onClick={onExit} className="w-full py-3 bg-gray-900 dark:bg-blue-600 text-white rounded-xl font-bold">Quay lại</button>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900 fixed inset-0 z-50 overflow-hidden">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 md:px-6 py-3 flex justify-between items-center shadow-sm shrink-0 z-10">
                <div className="flex items-center gap-4 min-w-0">
                    <button onClick={() => { if (isSubmitted || confirm('Thoát bài thi?')) onExit(); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300"><ChevronLeft size={24} /></button>
                    <div className="min-w-0">
                        <h2 className="font-bold text-lg text-gray-800 dark:text-white truncate pr-4">{exam.title}</h2>
                        <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded font-bold ${mode === 'real' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'}`}>
                                {mode === 'real' ? 'Thi thật' : 'Luyện tập'}
                            </span>
                            {isSubmitted && <span className="text-xs font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded">Đã nộp bài</span>}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4 md:gap-6 shrink-0">
                    {mode === 'real' && !isSubmitted && (
                        <div className={`text-xl font-mono font-bold flex items-center gap-2 ${timeLeft < 300 ? 'text-red-600 animate-pulse' : 'text-blue-600'}`}>
                            <Clock size={20} className="hidden md:block" /> {formatTime(timeLeft)}
                        </div>
                    )}

                    {!isSubmitted ? (
                        <button onClick={() => handleSubmit(false)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 md:px-6 py-2 rounded-xl font-bold shadow-lg shadow-blue-200 dark:shadow-blue-900/30 text-sm md:text-base whitespace-nowrap">Nộp bài</button>
                    ) : (
                        <div className="text-right hidden md:block">
                            <div className="text-xs text-gray-500 dark:text-gray-400">Điểm số</div>
                            <div className="text-xl font-black text-blue-600 dark:text-blue-400">{score}/{questions.length}</div>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden relative">
                {/* Questions List */}
                <div className={`flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scroll-smooth pb-20 md:pb-6`} id="questions-list">
                    {questions.map((q, idx) => {
                        const userAns = answers[q.internalId];
                        // For short_answer in practice mode: only reveal after explicit confirmation (button/Enter)
                        // For MCQ in practice mode: reveal immediately after selecting an option
                        const showResult = isSubmitted || (
                            mode === 'practice' && (
                                q.type === 'short_answer'
                                    ? confirmedShortAnswers.has(q.internalId)
                                    : userAns !== undefined
                            )
                        );

                        return (
                            <div key={q.internalId} id={`q-${q.internalId}`} className="bg-white dark:bg-gray-800 p-5 md:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 scroll-mt-20">
                                <div className="flex gap-4 mb-4">
                                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold shrink-0 text-sm">{idx + 1}</span>
                                    <div className="text-gray-800 dark:text-gray-100 font-medium text-lg leading-relaxed whitespace-pre-line">{q.question}</div>
                                </div>

                                {q.type === 'short_answer' ? (
                                    <div className="space-y-3">
                                        <textarea
                                            className="w-full p-4 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 focus:bg-white dark:focus:bg-gray-600 transition-colors outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 text-sm md:text-base text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                                            rows={4}
                                            placeholder="Nhập câu trả lời..."
                                            value={userAns || ''}
                                            onChange={(e) => handleEssayAnswer(q.internalId, e.target.value)}
                                            disabled={isSubmitted || (mode === 'practice' && confirmedShortAnswers.has(q.internalId))}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey && mode === 'practice' && !isSubmitted && !confirmedShortAnswers.has(q.internalId)) {
                                                    e.preventDefault();
                                                    confirmShortAnswer(q.internalId);
                                                }
                                            }}
                                        />
                                        {showResult && (
                                            <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 text-sm p-3">
                                                <span className="font-bold">Đáp án mẫu:</span>{' '}
                                                <span className="font-medium">{q.correctText || q.answer || 'Chưa có đáp án'}</span>
                                                                                    {mode === 'practice' && !isSubmitted && !confirmedShortAnswers.has(q.internalId) && (
                                                                                        <button
                                                                                            onClick={() => confirmShortAnswer(q.internalId)}
                                                                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
                                                                                        >
                                                                                            Kiểm tra đáp án
                                                                                        </button>
                                                                                    )}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-3 pl-0 md:pl-12">
                                        {q.options && q.options.map((opt, optIdx) => {
                                            let optClass = "border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer";
                                            let icon = null;

                                            if (showResult) {
                                                if (optIdx === q.correctAnswer) {
                                                    optClass = "bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700 ring-1 ring-green-500";
                                                    icon = <CheckCircle size={18} className="text-green-600 dark:text-green-400 shrink-0" />;
                                                } else if (optIdx === userAns) {
                                                    optClass = "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700 ring-1 ring-red-500";
                                                    icon = <XCircle size={18} className="text-red-600 dark:text-red-400 shrink-0" />;
                                                } else {
                                                    optClass = "opacity-50 border-gray-100 dark:border-gray-700";
                                                }
                                                // 👇 THÊM: Disable pointer events để không click được nữa
                                                if (mode === 'practice') {
                                                    optClass += " pointer-events-none";
                                                }
                                            } else if (userAns === optIdx) {
                                                optClass = "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 ring-1 ring-blue-500";
                                            }

                                            return (
                                                <div
                                                    key={optIdx}
                                                    onClick={() => handleSelectOption(q.internalId, optIdx)}
                                                    className={`p-3 md:p-4 rounded-xl border flex items-start md:items-center justify-between transition-all gap-3 ${optClass}`}
                                                >
                                                    <div className="flex items-start md:items-center gap-3 flex-1">
                                                        <span className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 md:mt-0 ${(userAns === optIdx && !showResult) ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400'}`}>
                                                            {String.fromCharCode(65 + optIdx)}
                                                        </span>
                                                        <span className="text-gray-700 dark:text-gray-200 text-sm md:text-base leading-snug">{opt}</span>
                                                    </div>
                                                    {icon}
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}

                                {showResult && q.explanation && (
                                    <div className="mt-4 md:ml-12 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-800 rounded-xl text-sm text-yellow-800 dark:text-yellow-300 flex gap-3 animate-fade-in">
                                        <AlertTriangle size={18} className="shrink-0 mt-0.5 text-yellow-600 dark:text-yellow-400" />
                                        <div><span className="font-bold block mb-1 text-yellow-900 dark:text-yellow-200">Giải thích chi tiết:</span> <span className="leading-relaxed" dangerouslySetInnerHTML={{ __html: q.explanation }}></span></div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>

                {/* Sidebar (Question Map) */}
                <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex-col shrink-0 hidden md:flex z-20">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700 font-bold text-gray-700 dark:text-gray-200 flex justify-between items-center">
                        <span>Danh sách câu hỏi</span>
                        <span className="text-xs font-normal text-gray-500 dark:text-gray-400">{questions.length} câu</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                        <div className="grid grid-cols-5 gap-2">
                            {questions.map((q, idx) => (
                                <button
                                    key={q.internalId}
                                    onClick={() => document.getElementById(`q-${q.internalId}`).scrollIntoView({ behavior: 'smooth', block: 'center' })}
                                    className={`aspect-square rounded-lg flex items-center justify-center text-sm font-bold border transition-all ${getQuestionStatusClass(q)}`}
                                >
                                    {idx + 1}
                                </button>
                            ))}
                        </div>
                    </div>
                    {isSubmitted && (
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-center">
                            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Kết quả của bạn</div>
                            <div className="text-3xl font-black text-blue-600 dark:text-blue-400 mb-3">{score}/{questions.length}</div>
                            <button onClick={onExit} className="w-full py-2.5 bg-gray-900 dark:bg-blue-600 text-white rounded-xl font-bold hover:bg-black dark:hover:bg-blue-700 transition-all shadow-lg">Quay về thư viện</button>
                        </div>
                    )}
                </div>
            </div>

            {/* Mobile Question Map FAB & Overlay */}
            <div className="md:hidden">
                <button
                    onClick={() => setIsMapOpen(true)}
                    className="fixed bottom-24 right-6 w-14 h-14 bg-gray-900 dark:bg-blue-600 text-white rounded-full flex items-center justify-center shadow-2xl z-40"
                >
                    <Map size={24} />
                </button>

                {isMapOpen && (
                    <div className="fixed inset-0 z-[100] flex flex-col bg-black/60 backdrop-blur-sm animate-fade-in">
                        <div className="flex-1" onClick={() => setIsMapOpen(false)}></div>
                        <div className="bg-white dark:bg-gray-800 rounded-t-3xl p-6 shadow-2xl animate-slide-up max-h-[66vh] flex flex-col">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-black text-xl text-gray-800 dark:text-white">Sơ đồ câu hỏi</h3>
                                <button
                                    onClick={() => setIsMapOpen(false)}
                                    className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300"
                                >
                                    <ChevronDown size={24} />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto pb-6">
                                <div className="grid grid-cols-5 gap-3">
                                    {questions.map((q, idx) => (
                                        <button
                                            key={q.internalId}
                                            onClick={() => {
                                                document.getElementById(`q-${q.internalId}`).scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                setIsMapOpen(false);
                                            }}
                                            className={`aspect-square rounded-xl flex items-center justify-center text-sm font-black border-2 transition-all ${getQuestionStatusClass(q)}`}
                                        >
                                            {idx + 1}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
