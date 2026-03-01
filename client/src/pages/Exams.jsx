import React, { useState, useEffect, useMemo } from "react";
import { examService } from "../services/examService";
import { ExamRunner } from "../components/ExamRunner";
import { ExamCreator } from "../components/ExamCreator";
import {
  Search,
  Plus,
  BookOpen,
  Trophy,
  Clock,
  FileText,
  X,
  Trash2,
} from "lucide-react";

const SUBJECTS = [
  "Tất cả",
  "Pháp luật",
  "Tâm lý",
  "Triết học",
  "Chủ nghĩa xã hội",
  "Tâm lý học giáo dục",
  "Kinh tế chính trị",
];

const EXAMS_PER_PAGE = 9;

const Exams = () => {
  const [user, setUser] = useState(null);

  // State
  const [exams, setExams] = useState([]);
  const [filterSubject, setFilterSubject] = useState("Tất cả");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // View Management
  const [activeExam, setActiveExam] = useState(null); // Exam object selected
  const [examMode, setExamMode] = useState(null); // 'practice' | 'real'
  const [isCreatorOpen, setCreatorOpen] = useState(false);
  const [showModeModal, setShowModeModal] = useState(false); // Modal chọn chế độ

  useEffect(() => {
    // Load user from localStorage
    const storedUser =
      localStorage.getItem("currentUser") || localStorage.getItem("user");

    if (storedUser) {
      try {
        // 1. Phải parse trước
        const parsedUser = JSON.parse(storedUser);

        // 2. Sau đó mới log được
        console.log("👤 Đã tìm thấy User:", parsedUser);

        // 3. Cuối cùng lưu vào State
        setUser(parsedUser);
      } catch (error) {
        console.error("Lỗi parse user data:", error);
        setUser(null);
      }
    } else {
      console.log("⚠️ Không tìm thấy thông tin đăng nhập trong localStorage");
    }
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
    console.log('📥 Nhận exam mới:', newExam);
    console.log('📊 Số câu hỏi:', newExam.questions?.length);
    
    // Thêm username để server biết ai tạo đề
    const examWithUser = {
      ...newExam,
      username: user?.username || 'anonymous'
    };
    
    await examService.createExam(examWithUser);
    setCreatorOpen(false);
    loadExams();
  };

  const handleDelete = async (targetId) => {
    console.log("🗑️ Request delete for ID:", targetId);

    if (!user || !user.username) {
      alert("Vui lòng đăng nhập để xóa đề thi!");
      return;
    }

    if (confirm("Bạn có chắc chắn muốn xóa đề thi này không?")) {
      try {
        // Gọi service
        const result = await examService.deleteExam(targetId, user.username);

        if (result.success) {
          alert("Đã xóa thành công!");
          loadExams(); // Load lại danh sách ngay
        } else {
          // Hiện thông báo lỗi chi tiết từ server (vd: Bạn không có quyền...)
          alert("Lỗi: " + result.message);
        }
      } catch (error) {
        console.error("Lỗi xóa đề thi:", error);
        alert("Lỗi kết nối đến server!");
      }
    }
  };

  // Filter
  const filteredExams = useMemo(() => {
    return exams.filter((e) => {
      const matchSub =
        filterSubject === "Tất cả" || e.subject === filterSubject;
      const matchSearch = e.title
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      return matchSub && matchSearch;
    });
  }, [exams, filterSubject, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredExams.length / EXAMS_PER_PAGE));
  const paginatedExams = useMemo(() => {
    const start = (currentPage - 1) * EXAMS_PER_PAGE;
    return filteredExams.slice(start, start + EXAMS_PER_PAGE);
  }, [filteredExams, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterSubject, searchTerm]);

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  // --- RENDER: EXAM RUNNER ---
  if (activeExam && examMode) {
    return (
      <ExamRunner
        exam={activeExam}
        mode={examMode}
        onExit={() => {
          setActiveExam(null);
          setExamMode(null);
        }}
      />
    );
  }

  // --- RENDER: EXAM CREATOR ---
  if (isCreatorOpen) {
    return (
      <ExamCreator
        onClose={() => setCreatorOpen(false)}
        onSuccess={handleCreateSuccess}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 pb-20">
      {/* Header */}
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
            Thư viện đề thi
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Chọn đề thi phù hợp để bắt đầu luyện tập
          </p>
        </div>
        <button
          onClick={() => setCreatorOpen(true)}
          className="bg-gray-900 dark:bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-black dark:hover:bg-blue-700 transition-all shadow-lg"
        >
          <Plus size={18} /> Tạo đề mới
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-gray-800 p-2 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mb-8">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-3 text-gray-400 dark:text-gray-500" size={20} />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm kiếm đề thi..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700 border-none rounded-xl focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 outline-none text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {SUBJECTS.map((sub) => (
            <button
              key={sub}
              onClick={() => setFilterSubject(sub)}
              className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${
                filterSubject === sub
                  ? "bg-blue-600 text-white shadow-md shadow-blue-200 dark:shadow-blue-900"
                  : "bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
              }`}
            >
              {sub}
            </button>
          ))}
        </div>
      </div>

      {/* Exam Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedExams.map((exam) => {
          // 👇 LOGIC PHÂN QUYỀN MỚI
          const isAdmin = user?.role === "admin";
          const isOwner = user?.username && exam.createdBy === user.username;
          // Chỉ hiện nút xóa nếu: (Không phải đề mẫu) VÀ (Là Admin HOẶC Chính chủ)
          const canDelete = !exam.isStatic && (isAdmin || isOwner);

          // Lấy ID chuẩn
          const deleteId = exam.examId || exam.id;

          return (
            <div
              key={exam.examId || exam.id}
              className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all flex flex-col h-full group relative"
            >
              {/* 👇 CHỈ HIỆN KHI CÓ QUYỀN (canDelete) */}
              {canDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(deleteId);
                  }}
                  className="absolute top-4 right-4 p-2 bg-white dark:bg-gray-700 text-gray-400 hover:text-red-600 rounded-lg shadow-sm border border-gray-100 dark:border-gray-600 opacity-0 group-hover:opacity-100 transition-all z-10"
                  title="Xóa đề thi"
                >
                  <Trash2 size={18} />
                </button>
              )}

              {/* ... (Các phần hiển thị tên, môn học giữ nguyên như cũ) ... */}
              <div className="flex justify-between items-start mb-4 pr-8">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white line-clamp-2">
                  {exam.title}
                </h3>
              </div>

              <div className="mb-4">
                <span className="inline-block px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold mb-3">
                  {exam.subject}
                </span>
                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                  Đề thi bao gồm các câu hỏi trắc nghiệm kiến thức tổng hợp môn{" "}
                  {exam.subject}.
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs font-medium text-gray-500 dark:text-gray-400 mb-6 mt-auto">
                <div className="flex items-center gap-1">
                  <Clock size={14} /> {exam.time}
                </div>
                <div className="flex items-center gap-1">
                  <FileText size={14} />
                  {/* 👇 Ưu tiên hiển thị exam.limit trước */}
                  {exam.limit ||
                    (Array.isArray(exam.questions)
                      ? exam.questions.length
                      : 0)}{" "}
                  câu
                </div>
              </div>

              <button
                onClick={() => {
                  setActiveExam(exam);
                  setShowModeModal(true);
                }}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-100 dark:shadow-blue-900/30"
              >
                ▷ Làm bài thi
              </button>
            </div>
          );
        })}
      </div>

      {filteredExams.length > EXAMS_PER_PAGE && (
        <div className="mt-8 flex items-center justify-center gap-3">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Trước
          </button>
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
            Trang {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Sau
          </button>
        </div>
      )}

      {/* --- MODAL CHỌN CHẾ ĐỘ (GIỐNG ẢNH) --- */}
      {showModeModal && activeExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
            {/* Header Gradient */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white relative">
              <button
                onClick={() => {
                  setShowModeModal(false);
                  setActiveExam(null);
                }}
                className="absolute top-4 right-4 text-white/80 hover:text-white"
              >
                <X />
              </button>
              <h2 className="text-2xl font-bold mb-1">Chọn chế độ làm bài</h2>
              <div className="flex items-center gap-4 text-sm text-white/90 mt-2 bg-white/10 w-fit px-3 py-1.5 rounded-lg backdrop-blur-sm">
                <span className="font-bold">{activeExam.title}</span>
                <span className="w-1 h-1 bg-white rounded-full"></span>
                <span>{activeExam.time}</span>
                <span className="w-1 h-1 bg-white rounded-full"></span>
                <span>{activeExam.limit || (Array.isArray(activeExam.questions) ? activeExam.questions.length : 0)} câu</span>
              </div>
            </div>

            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card Luyện tập */}
              <button
                key="practice-mode"
                onClick={() => {
                  setShowModeModal(false);
                  setExamMode("practice");
                }}
                className="border-2 border-gray-100 dark:border-gray-600 rounded-2xl p-6 text-center hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group"
              >
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <BookOpen size={32} />
                </div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">
                  Luyện tập
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  Làm bài không giới hạn thời gian, có thể xem đáp án và giải
                  thích ngay lập tức sau khi chọn.
                </p>
              </button>

              {/* Card Thi thật */}
              <button
                key="real-mode"
                onClick={() => {
                  setShowModeModal(false);
                  setExamMode("real");
                }}
                className="border-2 border-gray-100 dark:border-gray-600 rounded-2xl p-6 text-center hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all group"
              >
                <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Trophy size={32} />
                </div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">
                  Thi thật
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  Thi theo thời gian thực, đồng hồ đếm ngược. Kết quả và đáp án
                  chỉ hiện sau khi nộp bài.
                </p>
              </button>
            </div>

            <div className="p-4 border-t border-gray-100 dark:border-gray-700 text-center">
              <button
                onClick={() => {
                  setShowModeModal(false);
                  setActiveExam(null);
                }}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white font-medium text-sm"
              >
                Hủy bỏ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Exams;
