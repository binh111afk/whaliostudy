import React, { useState, useRef } from "react";
import {
  Save,
  FileText,
  AlertCircle,
  X,
  Palette,
  Clock,
  BookOpen,
} from "lucide-react";
import mammoth from "mammoth";
import { QuestionCard } from "./QuestionCard";
import { ExamToolbar } from "./ExamToolbar";

export const ExamCreator = ({ onClose, onSuccess }) => {
  // --- STATE QUẢN LÝ DỮ LIỆU ---
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("Pháp luật");
  const [time, setTime] = useState(45);
  const [description, setDescription] = useState("");
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

  // Mặc định có 1 câu hỏi rỗng
  const [questions, setQuestions] = useState([
    {
      id: Date.now(),
      question: "",
      type: "multiple_choice",
      options: ["", "", "", ""],
      correctAnswer: 0,
      correctText: "",
      correctAnswers: [], // For checkbox type
      points: 1,
    },
  ]);

  // Ref cho input file ẩn
  const jsonInputRef = useRef(null);
  const wordInputRef = useRef(null);

  // ============================================================
  // 1. LOGIC XỬ LÝ WORD (.DOCX) - PHIÊN BẢN CẢI TIẾN
  // ============================================================
  const handleWordUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const arrayBuffer = event.target.result;

        // Convert sang HTML để giữ lại các thẻ <b>, <i>, <u>
        const result = await mammoth.convertToHtml({
          arrayBuffer: arrayBuffer,
        });

        // 1. Dọn dẹp HTML rác của Word
        const cleanHtml = normalizeHtml(result.value);

        // 2. Phân tích thông minh
        const parsedQuestions = parseHtmlToQuestions(cleanHtml);

        if (parsedQuestions.length > 0) {
          // Map với cấu trúc mới (thêm id và points)
          const mappedQuestions = parsedQuestions.map((q, idx) => ({
            ...q,
            id: Date.now() + idx,
            points: q.points || 1,
            correctAnswers: q.correctAnswers || [],
          }));
          setQuestions(mappedQuestions);
          setActiveQuestionIndex(0);
          alert(
            `✅ Đã nhập thành công ${parsedQuestions.length} câu hỏi!\n(Hệ thống đã tự động chọn đáp án đúng dựa trên In đậm/Nghiêng/Gạch chân)`
          );
        } else {
          alert(
            "⚠️ Không tìm thấy câu hỏi nào! Vui lòng kiểm tra lại file Word."
          );
        }
      } catch (error) {
        console.error("Lỗi đọc Word:", error);
        alert(
          "Lỗi khi đọc file Word! File có thể bị hỏng hoặc chứa định dạng không hỗ trợ."
        );
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = null; // Reset input để chọn lại file cũ được
  };

  // --- HELPER 1: Dọn dẹp HTML (Lọc rác Word) ---
  const normalizeHtml = (html) => {
    return html
      .replace(/<o:p>/g, "")
      .replace(/<\/o:p>/g, "") // Xóa thẻ rác Office
      .replace(/<w:[\w]+>/g, "")
      .replace(/<\/w:[\w]+>/g, "") // Xóa thẻ w:
      .replace(/\u00A0/g, " ") // Xóa khoảng trắng không ngắt dòng
      .replace(/&nbsp;/g, " ")
      .replace(/<br\s*\/?>/gi, "\n") // Chuyển <br> thành xuống dòng
      .replace(/\n\s*\n/g, "\n") // Xóa dòng trống thừa
      .trim();
  };

  // --- HELPER 3: PHÂN TÍCH CÚ PHÁP - PHIÊN BẢN SỬA LỖI ---
  const parseHtmlToQuestions = (htmlString) => {
    // LƯU LẠI HTML GỐC để kiểm tra định dạng
    const originalHtml = htmlString;
    
    // 1. Xử lý HTML ban đầu để chuẩn hóa
    const cleanHtml = htmlString
      .replace(/<o:p>/g, "").replace(/<\/o:p>/g, "")
      .replace(/<w:[\w]+>/g, "").replace(/<\/w:[\w]+>/g, "")
      .replace(/\u00A0/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<\/div>/gi, "\n")
      .replace(/\n\s*\n/g, "\n")
      .trim();
  
    // 2. Tạo DOM để phân tích
    const parser = new DOMParser();
    const doc = parser.parseFromString(cleanHtml, "text/html");
    
    // 3. Lấy tất cả text content theo block để giữ cấu trúc dòng
    const blockNodes = Array.from(doc.querySelectorAll("p, li"));
    const blockLines = blockNodes
      .map((node) => (node.innerText || node.textContent || "").trim())
      .filter(Boolean);

    const textContent = doc.body.textContent || "";
    const rawLines = textContent
      .split("\n")
      .map(line => line.trim())
      .filter(line => line.length > 0);

    const lines = blockLines.length > 0 ? blockLines : rawLines;
  
    // 4. Xử lý các dòng dính nhau (Câu hỏi + đáp án trên 1 dòng)
    const processedLines = [];
    lines.forEach(line => {
      if (/Câu\s+\d+[:.)]/i.test(line) && /[A-D][.)]/i.test(line)) {
        const questionMatch = line.match(/^(Câu\s+\d+[:.)]\s*.*?)(?=[A-D][.)]|$)/i);
        if (questionMatch) {
          processedLines.push(questionMatch[0].trim());
          const remaining = line.substring(questionMatch[0].length).trim();
          
          if (remaining) {
            const options = remaining.split(/(?=[A-D][.)])/);
            options.forEach(opt => {
              if (opt.trim()) processedLines.push(opt.trim());
            });
          }
        } else {
          processedLines.push(line);
        }
      } else {
        processedLines.push(line);
      }
    });
  
    // 5. HÀM KIỂM TRA ĐÁP ÁN ĐÚNG - SỬA LẠI HOÀN TOÀN
    const checkCorrectAnswer = (optionText) => {
      if (!optionText || !originalHtml) return false;
      
      // Chuẩn hóa text đáp án để tìm kiếm
      const cleanOption = optionText
        .replace(/^[A-D][.)]\s*/, '') // Bỏ "A. " "B. " ...
        .trim()
        .replace(/\s+/g, ' ');
      
      // CÁCH 1: Kiểm tra thẻ <strong>, <b>
      const strongRegex = new RegExp(`<(?:strong|b)[^>]*>([^<]*${cleanOption.substring(0, 20)}[^<]*)</(?:strong|b)>`, 'i');
      if (strongRegex.test(originalHtml)) return true;
      
      // CÁCH 2: Kiểm tra thẻ <em>, <i>
      const emRegex = new RegExp(`<(?:em|i)[^>]*>([^<]*${cleanOption.substring(0, 20)}[^<]*)</(?:em|i)>`, 'i');
      if (emRegex.test(originalHtml)) return true;
      
      // CÁCH 3: Kiểm tra thẻ <u>
      const uRegex = new RegExp(`<u[^>]*>([^<]*${cleanOption.substring(0, 20)}[^<]*)</u>`, 'i');
      if (uRegex.test(originalHtml)) return true;
      
      // CÁCH 4: Kiểm tra style inline
      const styleRegex = new RegExp(`<[^>]*(?:font-weight\\s*:\\s*bold|font-style\\s*:\\s*italic|text-decoration\\s*:\\s*underline)[^>]*>([^<]*${cleanOption.substring(0, 20)}[^<]*)<`, 'i');
      if (styleRegex.test(originalHtml)) return true;
      
      // CÁCH 5: Kiểm tra span với class hoặc style
      const spanRegex = new RegExp(`<span[^>]*(?:class="[^"]*(?:bold|italic|underline)[^"]*"|style="[^"]*(?:font-weight|font-style|text-decoration)[^"]*")[^>]*>([^<]*${cleanOption.substring(0, 20)}[^<]*)</span>`, 'i');
      if (spanRegex.test(originalHtml)) return true;
      
      return false;
    };
  
    const extractShortAnswerFromLine = (lineText) => {
      if (!lineText) return null;
      const line = String(lineText).trim();
      if (!line) return null;
      if (/[A-D][.)]\s*/i.test(line)) return null;

      const patterns = [
        /^\s*Câu\s*\d+[\.:)\-–—]\s*(.+?)\s*[:：]\s*(.+)$/i,
        /^\s*\d+[\.)-–—]\s*(.+?)\s*[:：]\s*(.+)$/,
        /^\s*\d+[\.)-–—]\s*(.+?)\s*[=≡→=>]\s*(.+)$/,
        /^\s*Câu\s*\d+[\.:)\-–—]\s*(.+?)\s+là\s*[:：]?\s*(.+)$/i,
        /^\s*\d+[\.)-–—]\s*(.+?)\s+là\s*[:：]?\s*(.+)$/i,
        /^(.+?)\s*[:：]\s*(.+)$/
      ];

      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match) {
          const questionText = String(match[1] || '').trim();
          const answerText = String(match[2] || '').trim();
          if (questionText && answerText) {
            return { questionText, answerText };
          }
        }
      }
      return null;
    };

    // 6. Phân tích các dòng đã xử lý
    const results = [];
    let currentQuestion = null;
  
    for (let i = 0; i < processedLines.length; i++) {
      const line = processedLines[i];
      
      // PHÁT HIỆN CÂU TRẢ LỜI NGẮN (có đáp án sau dấu ":" hoặc "=")
      const shortAnswer = extractShortAnswerFromLine(line);
      if (shortAnswer && !/^[A-D][.)]\s*/i.test(line)) {
        if (currentQuestion) {
          results.push(currentQuestion);
          currentQuestion = null;
        }
        results.push({
          question: shortAnswer.questionText,
          type: "short_answer",
          options: [],
          correctAnswer: -1,
          correctText: shortAnswer.answerText
        });
        continue;
      }

      // PHÁT HIỆN CÂU HỎI MỚI
      const questionMatch = line.match(/^Câu\s*(\d+)[:.)]\s*(.+)/i);
        if (questionMatch) {
          if (currentQuestion) {
            results.push(currentQuestion);
          }
          
          currentQuestion = {
            question: questionMatch[2].trim(),
            type: "multiple_choice",
            options: ["", "", "", ""],
            correctAnswer: 0,
            correctText: "",
          };
          continue;
        }
      
      // PHÁT HIỆN ĐÁP ÁN
      else if (currentQuestion && /^[A-D][.)]\s*(.+)/i.test(line)) {
        const optionMatch = line.match(/^([A-D])[.)]\s*(.+)/i);
        if (optionMatch) {
          const label = optionMatch[1].toUpperCase();
          const index = label.charCodeAt(0) - 65;
          const optionText = optionMatch[2].trim();
          
          if (index >= 0 && index <= 3) {
            currentQuestion.options[index] = optionText;
            
            // KIỂM TRA ĐỊNH DẠNG TRỰC TIẾP
            if (checkCorrectAnswer(line)) {
              currentQuestion.correctAnswer = index;
            }
          }
        }
      }
    }
    
    if (currentQuestion) {
      results.push(currentQuestion);
    }
    
    return results;
  };

  

  // ============================================================
  // 2. LOGIC XỬ LÝ JSON (GIỮ NGUYÊN ĐỂ HỖ TRỢ CŨ)
  // ============================================================
  const handleJsonUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.title) setTitle(data.title);
        if (data.subject) setSubject(data.subject);
        if (data.time) setTime(data.time);
        if (data.description) setDescription(data.description);

        const rawQuestions = Array.isArray(data) ? data : data.questions || [];
        if (rawQuestions.length === 0) return alert("File JSON rỗng!");

        const mappedQuestions = rawQuestions.map((q, idx) => {
          const normalizedType =
            q.type === "short_answer" || q.type === "essay"
              ? "short_answer"
              : q.type === "checkbox"
              ? "checkbox"
              : "multiple_choice";
          return {
            id: Date.now() + idx,
            question: q.question || "",
            type: normalizedType,
            options:
              normalizedType === "short_answer"
                ? []
                : Array.isArray(q.options)
                ? [0, 1, 2, 3].map((i) => q.options[i] || "")
                : ["", "", "", ""],
            correctAnswer:
              normalizedType === "short_answer" || normalizedType === "checkbox"
                ? -1
                : typeof q.answer === "number"
                ? q.answer
                : 0,
            correctText:
              normalizedType === "short_answer"
                ? String(q.answer ?? "").trim()
                : "",
            correctAnswers:
              normalizedType === "checkbox" && Array.isArray(q.correctAnswers)
                ? q.correctAnswers
                : [],
            points: q.points || 1,
          };
        });

        setQuestions(mappedQuestions);
        setActiveQuestionIndex(0);
        alert(`✅ Đã nhập ${mappedQuestions.length} câu hỏi từ JSON!`);
      } catch (error) {
        alert("File JSON lỗi định dạng!");
      }
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  // ============================================================
  // 3. CÁC HÀM TƯƠNG TÁC GIAO DIỆN (NHẬP TAY)
  // ============================================================
  const handleAddQuestion = () => {
    const lastType = questions[questions.length - 1]?.type || "multiple_choice";
    const newQuestion =
      lastType === "short_answer"
        ? {
            id: Date.now(),
            question: "",
            type: "short_answer",
            options: [],
            correctAnswer: -1,
            correctText: "",
            correctAnswers: [],
            points: 1,
          }
        : lastType === "checkbox"
        ? {
            id: Date.now(),
            question: "",
            type: "checkbox",
            options: ["", "", "", ""],
            correctAnswer: -1,
            correctText: "",
            correctAnswers: [],
            points: 1,
          }
        : {
            id: Date.now(),
            question: "",
            type: "multiple_choice",
            options: ["", "", "", ""],
            correctAnswer: 0,
            correctText: "",
            correctAnswers: [],
            points: 1,
          };
    setQuestions([...questions, newQuestion]);
    setActiveQuestionIndex(questions.length);
    // Cuộn xuống cuối
    setTimeout(
      () =>
        document
          .getElementById("end-list")
          ?.scrollIntoView({ behavior: "smooth" }),
      100
    );
  };

  const handleDeleteQuestion = (index) => {
    if (questions.length === 1) return alert("Đề thi cần ít nhất 1 câu hỏi!");
    setQuestions(questions.filter((_, i) => i !== index));
    if (activeQuestionIndex >= questions.length - 1) {
      setActiveQuestionIndex(Math.max(0, questions.length - 2));
    }
  };

  const handleDuplicateQuestion = (index) => {
    const questionToDuplicate = { ...questions[index], id: Date.now() };
    const newQuestions = [...questions];
    newQuestions.splice(index + 1, 0, questionToDuplicate);
    setQuestions(newQuestions);
    setActiveQuestionIndex(index + 1);
  };

  const handleQuestionChange = (index, val) => {
    const newQs = [...questions];
    newQs[index].question = val;
    setQuestions(newQs);
  };

  const handleOptionChange = (qIndex, optIndex, val) => {
    const newQs = [...questions];
    if (
      !Array.isArray(newQs[qIndex].options) ||
      newQs[qIndex].options.length !== 4
    ) {
      newQs[qIndex].options = ["", "", "", ""];
    }
    newQs[qIndex].options[optIndex] = val;
    setQuestions(newQs);
  };

  const handleCorrectAnswerChange = (qIndex, optIndex) => {
    const newQs = [...questions];
    newQs[qIndex].correctAnswer = optIndex;
    setQuestions(newQs);
  };

  const handleCorrectCheckboxChange = (qIndex, optIndex, checked) => {
    const newQs = [...questions];
    if (!Array.isArray(newQs[qIndex].correctAnswers)) {
      newQs[qIndex].correctAnswers = [];
    }
    if (checked) {
      if (!newQs[qIndex].correctAnswers.includes(optIndex)) {
        newQs[qIndex].correctAnswers.push(optIndex);
      }
    } else {
      newQs[qIndex].correctAnswers = newQs[qIndex].correctAnswers.filter(
        (i) => i !== optIndex
      );
    }
    setQuestions(newQs);
  };

  const handleShortAnswerChange = (qIndex, val) => {
    const newQs = [...questions];
    newQs[qIndex].correctText = val;
    setQuestions(newQs);
  };

  const handleQuestionTypeChange = (qIndex, nextType) => {
    const newQs = [...questions];
    newQs[qIndex].type = nextType;
    if (nextType === "short_answer") {
      newQs[qIndex].options = [];
      newQs[qIndex].correctAnswer = -1;
      newQs[qIndex].correctAnswers = [];
      if (typeof newQs[qIndex].correctText !== "string") {
        newQs[qIndex].correctText = "";
      }
    } else if (nextType === "checkbox") {
      if (
        !Array.isArray(newQs[qIndex].options) ||
        newQs[qIndex].options.length !== 4
      ) {
        newQs[qIndex].options = ["", "", "", ""];
      }
      newQs[qIndex].correctAnswer = -1;
      if (!Array.isArray(newQs[qIndex].correctAnswers)) {
        newQs[qIndex].correctAnswers = [];
      }
      newQs[qIndex].correctText = "";
    } else {
      if (
        !Array.isArray(newQs[qIndex].options) ||
        newQs[qIndex].options.length !== 4
      ) {
        newQs[qIndex].options = ["", "", "", ""];
      }
      if (
        !Number.isInteger(newQs[qIndex].correctAnswer) ||
        newQs[qIndex].correctAnswer < 0
      ) {
        newQs[qIndex].correctAnswer = 0;
      }
      newQs[qIndex].correctAnswers = [];
      newQs[qIndex].correctText = "";
    }
    setQuestions(newQs);
  };

  const handlePointsChange = (qIndex, points) => {
    const newQs = [...questions];
    newQs[qIndex].points = points;
    setQuestions(newQs);
  };

  // ============================================================
  // 4. LƯU ĐỀ THI
  // ============================================================
  const handleSave = () => {
    if (!title.trim()) return alert("Vui lòng nhập tên đề thi!");

    // Kiểm tra dữ liệu trống
    const hasEmpty = questions.some((q) => {
      if (!q.question.trim()) return true;
      if (q.type === "short_answer")
        return !String(q.correctText || "").trim();
      if (q.type === "checkbox")
        return (
          !Array.isArray(q.options) ||
          q.options.some((o) => !o.trim()) ||
          !q.correctAnswers ||
          q.correctAnswers.length === 0
        );
      return !Array.isArray(q.options) || q.options.some((o) => !o.trim());
    });
    if (hasEmpty) {
      if (
        !confirm(
          "⚠️ Một số câu hỏi hoặc đáp án đang để trống. Bạn có chắc chắn muốn lưu không?"
        )
      )
        return;
    }

    const newExam = {
      id: Date.now().toString(),
      examId: Date.now().toString(),
      title,
      subject,
      time: parseInt(time),
      description,
      questions: questions.map((q) => ({
        question: q.question,
        type: q.type || "multiple_choice",
        options: q.type === "short_answer" ? [] : q.options,
        answer:
          q.type === "short_answer"
            ? String(q.correctText || "").trim()
            : q.type === "checkbox"
            ? q.correctAnswers || []
            : q.correctAnswer,
        points: q.points || 1,
      })),
      limit: questions.length,
      isStatic: false,
    };

    onSuccess(newExam);
  };

  // ============================================================
  // RENDER GIAO DIỆN - GOOGLE FORMS STYLE
  // ============================================================
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 z-50 flex flex-col">
      {/* INPUT ẨN */}
      <input
        type="file"
        accept=".json"
        className="hidden"
        ref={jsonInputRef}
        onChange={handleJsonUpload}
      />
      <input
        type="file"
        accept=".docx"
        className="hidden"
        ref={wordInputRef}
        onChange={handleWordUpload}
      />

      {/* HEADER - Fixed Top Bar */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
              <FileText className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                Tạo đề thi mới
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {questions.length} câu hỏi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg shadow-lg shadow-blue-200 dark:shadow-blue-900/30 flex items-center gap-2 transition-all"
            >
              <Save size={18} /> Lưu đề thi
            </button>
          </div>
        </div>
      </header>

      {/* BODY - Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
          {/* EXAM INFO CARD */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Color Bar */}
            <div className="h-2 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600"></div>

            <div className="p-8 space-y-6">
              {/* Title Input */}
              <div>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Tiêu đề đề thi"
                  className="w-full text-3xl font-bold bg-transparent border-b-2 border-transparent hover:border-gray-200 focus:border-blue-500 dark:hover:border-gray-600 dark:focus:border-blue-400 outline-none pb-2 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-colors"
                />
              </div>

              {/* Description */}
              <div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Mô tả đề thi (tùy chọn)"
                  className="w-full bg-transparent border-b-2 border-transparent hover:border-gray-200 focus:border-blue-500 dark:hover:border-gray-600 dark:focus:border-blue-400 outline-none pb-2 text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 resize-none transition-colors"
                  rows="2"
                />
              </div>

              {/* Exam Settings Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                {/* Subject */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-400">
                    <BookOpen size={16} /> Môn học
                  </label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-800 dark:text-gray-100 font-medium outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  >
                    {[
                      "Pháp luật",
                      "Tâm lý",
                      "Triết học",
                      "Chủ nghĩa xã hội",
                      "Tâm lý học giáo dục",
                      "Kinh tế chính trị",
                      "Cơ sở Toán",
                      "Lập trình cơ bản",
                    ].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Time */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-400">
                    <Clock size={16} /> Thời gian (phút)
                  </label>
                  <input
                    type="number"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-800 dark:text-gray-100 font-medium outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* IMPORT GUIDE */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                <AlertCircle size={18} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 text-sm text-blue-800 dark:text-blue-200">
                <p className="font-semibold mb-1">💡 Mẹo nhập nhanh:</p>
                <ul className="list-disc pl-4 space-y-1 text-blue-700 dark:text-blue-300">
                  <li>
                    Nhập từ <b>Word</b>: Bôi đậm/nghiêng/gạch chân đáp án đúng
                  </li>
                  <li>
                    Nhập từ <b>JSON</b>: Hỗ trợ format cũ và mới
                  </li>
                  <li>
                    Sử dụng toolbar bên phải (desktop) để thêm câu hỏi nhanh
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* QUESTIONS LIST */}
          <div className="space-y-4">
            {questions.map((q, index) => (
              <QuestionCard
                key={q.id}
                question={q}
                index={index}
                isActive={activeQuestionIndex === index}
                onFocus={() => setActiveQuestionIndex(index)}
                onQuestionChange={(val) => handleQuestionChange(index, val)}
                onTypeChange={(type) => handleQuestionTypeChange(index, type)}
                onOptionChange={(optIdx, val) =>
                  handleOptionChange(index, optIdx, val)
                }
                onCorrectAnswerChange={(optIdx) =>
                  handleCorrectAnswerChange(index, optIdx)
                }
                onShortAnswerChange={(val) =>
                  handleShortAnswerChange(index, val)
                }
                onDelete={() => handleDeleteQuestion(index)}
                onDuplicate={() => handleDuplicateQuestion(index)}
                onPointsChange={(points) => handlePointsChange(index, points)}
                onCorrectCheckboxChange={(optIdx, checked) =>
                  handleCorrectCheckboxChange(index, optIdx, checked)
                }
              />
            ))}

            {/* Add Question Button */}
            <button
              onClick={handleAddQuestion}
              className="w-full py-4 border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl font-semibold transition-all"
              id="end-list"
            >
              + Thêm câu hỏi
            </button>
          </div>

          {/* Bottom Spacer */}
          <div className="h-20"></div>
        </div>
      </div>

      {/* FLOATING TOOLBAR (Desktop Only) */}
      <ExamToolbar
        onAddQuestion={handleAddQuestion}
        onImportJSON={() => jsonInputRef.current?.click()}
        onImportWord={() => wordInputRef.current?.click()}
      />
    </div>
  );
};
