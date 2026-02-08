import React, { useState, useRef } from "react";
import {
  Plus,
  Trash2,
  Save,
  FileText,
  Upload,
  AlertCircle,
  FileJson,
  FileType,
  X,
  CheckCircle,
} from "lucide-react";
import mammoth from "mammoth";

export const ExamCreator = ({ onClose, onSuccess }) => {
  // --- STATE QUẢN LÝ DỮ LIỆU ---
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("Pháp luật");
  const [time, setTime] = useState(45);

  // Mặc định có 1 câu hỏi rỗng để không bị lỗi UI
  const [questions, setQuestions] = useState([
    { question: "", options: ["", "", "", ""], correctAnswer: 0 },
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
          setQuestions(parsedQuestions);
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
    
    // 3. Lấy tất cả text content và chia thành dòng
    const textContent = doc.body.textContent || "";
    const lines = textContent
      .split("\n")
      .map(line => line.trim())
      .filter(line => line.length > 0);
  
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
  
    // 6. Phân tích các dòng đã xử lý
    const results = [];
    let currentQuestion = null;
  
    for (let i = 0; i < processedLines.length; i++) {
      const line = processedLines[i];
      
      // PHÁT HIỆN CÂU HỎI MỚI
      const questionMatch = line.match(/^Câu\s*(\d+)[:.)]\s*(.+)/i);
      if (questionMatch) {
        if (currentQuestion) {
          results.push(currentQuestion);
        }
        
        currentQuestion = {
          question: questionMatch[2].trim(),
          options: ["", "", "", ""],
          correctAnswer: 0,
        };
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

        const rawQuestions = Array.isArray(data) ? data : data.questions || [];
        if (rawQuestions.length === 0) return alert("File JSON rỗng!");

        const mappedQuestions = rawQuestions.map((q) => ({
          question: q.question || "",
          options: Array.isArray(q.options)
            ? [0, 1, 2, 3].map((i) => q.options[i] || "")
            : ["", "", "", ""],
          correctAnswer: typeof q.answer === "number" ? q.answer : 0,
        }));

        setQuestions(mappedQuestions);
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
    setQuestions([
      ...questions,
      { question: "", options: ["", "", "", ""], correctAnswer: 0 },
    ]);
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
  };

  const handleQuestionChange = (index, val) => {
    const newQs = [...questions];
    newQs[index].question = val;
    setQuestions(newQs);
  };

  const handleOptionChange = (qIndex, optIndex, val) => {
    const newQs = [...questions];
    newQs[qIndex].options[optIndex] = val;
    setQuestions(newQs);
  };

  const handleCorrectAnswerChange = (qIndex, optIndex) => {
    const newQs = [...questions];
    newQs[qIndex].correctAnswer = optIndex;
    setQuestions(newQs);
  };

  // ============================================================
  // 4. LƯU ĐỀ THI
  // ============================================================
  const handleSave = () => {
    if (!title.trim()) return alert("Vui lòng nhập tên đề thi!");

    // Kiểm tra dữ liệu trống
    const hasEmpty = questions.some(
      (q) => !q.question.trim() || q.options.some((o) => !o.trim())
    );
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
      questions: questions.map((q) => ({
        question: q.question,
        options: q.options,
        answer: q.correctAnswer,
      })),
      limit: questions.length,
      isStatic: false,
    };

    onSuccess(newExam);
  };

  // ============================================================
  // RENDER GIAO DIỆN
  // ============================================================
  return (
    <div className="fixed inset-0 bg-gray-100 z-50 flex flex-col animate-fade-in">
      {/* HEADER */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex flex-col md:flex-row justify-between items-center shadow-sm shrink-0 gap-4">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <FileText className="text-blue-600" /> Tạo đề thi
        </h2>

        <div className="flex flex-wrap gap-3 items-center justify-center">
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

          {/* BUTTONS */}
          <button
            onClick={() => jsonInputRef.current.click()}
            className="px-3 py-2 text-gray-700 font-bold bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2 text-sm transition-all"
            title="Nhập từ file JSON cũ"
          >
            <FileJson size={18} />{" "}
            <span className="hidden sm:inline">JSON</span>
          </button>

          <button
            onClick={() => wordInputRef.current.click()}
            className="px-3 py-2 text-blue-700 font-bold bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg flex items-center gap-2 text-sm transition-all shadow-sm"
            title="Nhập từ file Word (.docx)"
          >
            <FileType size={18} /> Nhập Word
          </button>

          <div className="h-8 w-[1px] bg-gray-300 mx-1 hidden sm:block"></div>

          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-lg"
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 flex items-center gap-2"
          >
            <Save size={18} /> Lưu đề
          </button>
        </div>
      </div>

      {/* BODY */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* CẤU HÌNH CHUNG */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-4 text-lg border-b pb-2">
              Cấu hình chung
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tên đề thi
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border rounded-xl font-bold focus:ring-2 focus:ring-blue-100 outline-none"
                  placeholder="VD: Kiểm tra 1 tiết..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Môn học
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border rounded-xl outline-none"
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Thời gian (phút)
                </label>
                <input
                  type="number"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border rounded-xl outline-none"
                />
              </div>
            </div>
          </div>

          {/* HƯỚNG DẪN */}
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-sm text-blue-800 flex items-start gap-3">
            <div className="bg-blue-100 p-2 rounded-lg shrink-0">
              <AlertCircle size={18} />
            </div>
            <div>
              <p className="font-bold mb-1">Mẹo nhập file Word:</p>
              <ul className="list-disc pl-4 space-y-1 text-blue-700">
                <li>
                  Hệ thống hỗ trợ cả định dạng <b>Mỗi câu 1 dòng</b> và{" "}
                  <b>Dính chùm (Câu 1... A... B...)</b>.
                </li>
                <li>
                  Để máy tự chọn đáp án đúng: Hãy <b>Bôi đậm</b>,{" "}
                  <i>In nghiêng</i> hoặc <u>Gạch chân</u> đáp án đó trong file
                  Word.
                </li>
                <li>
                  <b>Lưu ý quan trọng:</b> Chỉ bôi đậm nội dung đáp án, không
                  bôi đậm cả dòng chứa nhiều đáp án.
                </li>
              </ul>
            </div>
          </div>

          {/* DANH SÁCH CÂU HỎI */}
          <div className="space-y-4">
            <div className="flex justify-between items-center sticky top-0 bg-gray-50 py-2 z-10 backdrop-blur-sm bg-opacity-90">
              <h3 className="font-bold text-gray-700">
                Danh sách câu hỏi ({questions.length})
              </h3>
              <button
                onClick={handleAddQuestion}
                className="text-blue-600 font-bold text-sm bg-white border border-blue-200 hover:bg-blue-50 px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-sm transition-all"
              >
                <Plus size={16} /> Thêm câu
              </button>
            </div>

            {questions.map((q, qIdx) => (
              <div
                key={qIdx}
                className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative group transition-all hover:shadow-md"
              >
                {/* Header Question */}
                <div className="flex justify-between items-start mb-3">
                  <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded">
                    Câu {qIdx + 1}
                  </span>
                  <button
                    onClick={() => handleDeleteQuestion(qIdx)}
                    className="text-gray-300 hover:text-red-500 p-1 transition-colors"
                    title="Xóa câu này"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                {/* Nội dung câu hỏi */}
                <textarea
                  value={q.question}
                  onChange={(e) => handleQuestionChange(qIdx, e.target.value)}
                  placeholder="Nhập nội dung câu hỏi..."
                  className="w-full p-3 bg-gray-50 border rounded-xl mb-4 font-medium min-h-[80px] focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none"
                />

                {/* 4 Đáp án */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {q.options.map((opt, optIdx) => (
                    <div
                      key={optIdx}
                      className={`flex items-center gap-3 p-2 rounded-xl border transition-all ${
                        q.correctAnswer === optIdx
                          ? "border-green-500 bg-green-50 ring-1 ring-green-200"
                          : "border-gray-200 hover:border-blue-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`correct-${qIdx}`}
                        checked={q.correctAnswer === optIdx}
                        onChange={() => handleCorrectAnswerChange(qIdx, optIdx)}
                        className="w-5 h-5 accent-green-600 cursor-pointer shrink-0"
                        title="Chọn làm đáp án đúng"
                      />
                      <input
                        value={opt}
                        onChange={(e) =>
                          handleOptionChange(qIdx, optIdx, e.target.value)
                        }
                        className={`flex-1 bg-transparent outline-none text-sm ${
                          q.correctAnswer === optIdx
                            ? "text-green-800 font-bold"
                            : "text-gray-700"
                        }`}
                        placeholder={`Đáp án ${String.fromCharCode(
                          65 + optIdx
                        )}`}
                      />
                      <span className="text-xs font-bold text-gray-400 select-none w-5 text-center">
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Nút thêm câu hỏi lớn ở dưới */}
            <button
              onClick={handleAddQuestion}
              className="w-full py-3 border-2 border-dashed border-gray-300 text-gray-500 rounded-xl font-bold hover:border-blue-500 hover:text-blue-600 transition-all flex justify-center items-center gap-2"
              id="end-list"
            >
              <Plus size={20} /> Thêm câu hỏi tiếp theo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
