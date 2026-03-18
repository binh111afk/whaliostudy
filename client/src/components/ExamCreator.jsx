import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  BookOpen,
  ChevronDown,
  Clock,
  FileType,
  Lightbulb,
  Sparkles,
  Upload,
} from "lucide-react";
import mammoth from "mammoth";
import * as aiModule from "../services/ai";
import { documentService } from "../services/documentService";
import { ExamHeader } from "./exam-creator/ExamHeader";
import { QuestionItem } from "./exam-creator/QuestionItem";
import { Toolbar } from "./exam-creator/Toolbar";

const aiService = aiModule.aiService || aiModule.default || null;

const FALLBACK_SUBJECTS = [
  "Pháp luật",
  "Tâm lý",
  "Triết học",
  "Chủ nghĩa xã hội",
  "Tâm lý học giáo dục",
  "Kinh tế chính trị",
  "Cơ sở Toán",
  "Lập trình cơ bản",
];

const createQuestion = (type = "multiple_choice") => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  question: "",
  type,
  options: type === "short_answer" || type === "essay" ? [] : ["", "", "", ""],
  correctAnswer: 0,
  correctAnswers: [],
  correctText: "",
  points: 1,
});

const normalizeType = (type) => {
  const val = String(type || "").trim().toLowerCase();
  if (val === "checkbox") return "checkbox";
  if (val === "short_answer") return "short_answer";
  if (val === "essay") return "essay";
  return "multiple_choice";
};

const toEditorQuestion = (input, idx) => {
  const type = normalizeType(input.type);
  const options = Array.isArray(input.options) ? input.options : [];
  return {
    ...createQuestion(type),
    id: `${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 8)}`,
    question: String(input.question || "").trim(),
    type,
    options:
      type === "short_answer" || type === "essay"
        ? []
        : [0, 1, 2, 3].map((i) => String(options[i] || "").trim()),
    correctAnswer: Number.isInteger(input.correctAnswer) ? input.correctAnswer : 0,
    correctAnswers: Array.isArray(input.correctAnswers)
      ? input.correctAnswers.filter((v) => Number.isInteger(v))
      : [],
    correctText: String(input.correctText || "").trim(),
    points: Math.max(1, Number(input.points) || 1),
  };
};

const sharedInputClass =
  "w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10";

const SubjectSelect = ({ value, onChange, options }) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const onDocumentClick = (event) => {
      if (!wrapRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    const onEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onDocumentClick);
    document.addEventListener("keydown", onEscape);

    return () => {
      document.removeEventListener("mousedown", onDocumentClick);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  useEffect(() => {
    // Close menu whenever selected value is committed.
    setOpen(false);
  }, [value]);

  return (
    <div ref={wrapRef} className="relative z-20">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        disabled={options.length === 0}
        className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/85 px-4 py-3 text-left text-slate-700 outline-none transition hover:bg-white focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60"
        style={{ fontFamily: "'Plus Jakarta Sans', 'Google Sans', sans-serif" }}
      >
        <span className="truncate">{value || "Chưa có môn học"}</span>
        <ChevronDown size={16} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && options.length > 0 && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-50 max-h-[132px] w-full overflow-y-auto rounded-2xl border border-slate-200/70 bg-white/90 p-1.5 shadow-xl backdrop-blur-md">
          {options.map((item) => {
            const active = item === value;
            return (
              <button
                key={item}
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setOpen(false);
                  onChange(item);
                }}
                className={`w-full rounded-xl px-3 py-2.5 text-left text-sm transition ${
                  active
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                    : "text-slate-700 hover:bg-blue-50"
                }`}
                style={{ fontFamily: "'Plus Jakarta Sans', 'Google Sans', sans-serif" }}
              >
                {item}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const initQuestionsFromBank = (questionBank) => {
  if (!Array.isArray(questionBank) || questionBank.length === 0) return [createQuestion()];
  return questionBank.map((item, idx) =>
    toEditorQuestion(
      {
        question: item.question,
        type: item.type,
        options: item.options,
        correctAnswer: typeof item.answer === "number" ? item.answer : 0,
        correctAnswers: Array.isArray(item.answer) ? item.answer : (item.correctAnswers || []),
        correctText: typeof item.answer === "string" ? item.answer : (item.correctText || ""),
        points: item.points,
      },
      idx
    )
  );
};

export const ExamCreator = ({ onClose, onSuccess, initialData = null }) => {
  const isEditMode = Boolean(initialData);
  const defaultTime = 45;

  const [step, setStep] = useState(0);
  const [title, setTitle] = useState(() => initialData?.title || "");
  const [subject, setSubject] = useState(() => initialData?.subject || FALLBACK_SUBJECTS[0]);
  const [subjectOptions, setSubjectOptions] = useState(FALLBACK_SUBJECTS);
  const [timeInput, setTimeInput] = useState(() => {
    const initialTime = Math.max(1, Number(initialData?.time) || defaultTime);
    return String(initialTime);
  });
  const [description, setDescription] = useState(() => initialData?.description || "");
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [parserWarning, setParserWarning] = useState("");
  const [questions, setQuestions] = useState(() => initQuestionsFromBank(initialData?.questionBank));
  const [autoScore, setAutoScore] = useState(false);

  // Auto-distribute points (total = 10) when autoScore is enabled or question count changes
  useEffect(() => {
    if (!autoScore || questions.length === 0) return;
    const pts = Math.round((10 / questions.length) * 100) / 100;
    setQuestions((prev) => prev.map((q) => ({ ...q, points: pts })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoScore, questions.length]);

  useEffect(() => {
    let cancelled = false;

    const loadSubjectOptions = async () => {
      const apiSubjects = await documentService.getSubjects();
      if (cancelled) return;

      const names = Array.isArray(apiSubjects)
        ? apiSubjects
            .map((item) => String(item?.name || "").trim())
            .filter(Boolean)
        : [];

      const source = names.length ? names : FALLBACK_SUBJECTS;
      const merged = [...new Set([
        ...source,
        String(initialData?.subject || "").trim(),
      ].filter(Boolean))];

      setSubjectOptions(merged);
      setSubject((prev) => (merged.includes(prev) ? prev : merged[0] || ""));
    };

    loadSubjectOptions();
    return () => {
      cancelled = true;
    };
  }, [initialData?.subject]);

  const jsonInputRef = useRef(null);
  const wordInputRef = useRef(null);

  const totalPoints = useMemo(
    () => questions.reduce((sum, q) => sum + (Number(q.points) || 1), 0),
    [questions]
  );

  const parsedTime = Number(timeInput);
  const finalTime = Number.isFinite(parsedTime) && parsedTime > 0 ? parsedTime : defaultTime;

  const animateToStep = (nextStep) => {
    setStep(Math.max(0, Math.min(2, nextStep)));
  };

  const normalizeQuestionByType = (question, nextType) => {
    if (nextType === "short_answer" || nextType === "essay") {
      return {
        ...question,
        type: nextType,
        options: [],
        correctAnswer: 0,
        correctAnswers: [],
        correctText: String(question.correctText || ""),
      };
    }

    if (nextType === "checkbox") {
      return {
        ...question,
        type: nextType,
        options: Array.isArray(question.options) && question.options.length === 4 ? question.options : ["", "", "", ""],
        correctAnswer: 0,
        correctAnswers: Array.isArray(question.correctAnswers) ? question.correctAnswers : [],
        correctText: "",
      };
    }

    return {
      ...question,
      type: "multiple_choice",
      options: Array.isArray(question.options) && question.options.length === 4 ? question.options : ["", "", "", ""],
      correctAnswer: Number.isInteger(question.correctAnswer) ? question.correctAnswer : 0,
      correctAnswers: [],
      correctText: "",
    };
  };

  const updateQuestion = (questionId, updater) => {
    setQuestions((prev) =>
      prev.map((item) => (item.id === questionId ? updater(item) : item))
    );
  };

  const addQuestion = () => {
    const lastType = questions[questions.length - 1]?.type || "multiple_choice";
    setQuestions((prev) => [...prev, createQuestion(lastType)]);
  };

  const duplicateQuestion = (questionId) => {
    setQuestions((prev) => {
      const index = prev.findIndex((item) => item.id === questionId);
      if (index < 0) return prev;
      const cloned = {
        ...prev[index],
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        options: Array.isArray(prev[index].options)
          ? [...prev[index].options]
          : [],
        correctAnswers: Array.isArray(prev[index].correctAnswers)
          ? [...prev[index].correctAnswers]
          : [],
      };
      const next = [...prev];
      next.splice(index + 1, 0, cloned);
      return next;
    });
  };

  const deleteQuestion = (questionId) => {
    setQuestions((prev) => (prev.length <= 1 ? prev : prev.filter((item) => item.id !== questionId)));
  };

  const parseWordQuestions = (html) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const lines = [];

    doc.querySelectorAll("p, li, div").forEach((node) => {
      const text = String(node.textContent || "").trim();
      if (!text) return;
      lines.push({
        text,
        html: String(node.innerHTML || ""),
      });
    });

    if (lines.length === 0) {
      String(doc.body?.textContent || "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .forEach((text) => lines.push({ text, html: text }));
    }

    const result = [];
    const fallbackWarnings = [];
    let current = null;

    const pushCurrent = () => {
      if (!current) return;

      if (current.options.every((opt) => !opt.trim())) {
        current.type = "short_answer";
        current.options = [];
        current.correctText = "";
      }

      if (current.type === "multiple_choice" && current.markedCorrectCount === 0) {
        current.correctAnswer = 0;
        fallbackWarnings.push(`Câu ${result.length + 1}: không nhận diện đáp án, mặc định chọn A`);
      }

      result.push({
        question: current.question,
        type: current.type,
        options: current.options,
        correctAnswer: current.correctAnswer,
        correctAnswers: current.correctAnswers,
        correctText: current.correctText,
        points: 1,
      });

      current = null;
    };

    const hasStyleMarker = (lineHtml, plainText) => {
      const htmlText = String(lineHtml || "");
      const text = String(plainText || "");

      const hasFormatting =
        /<(strong|b|u)>/i.test(htmlText) ||
        /font-weight\s*:\s*(bold|700|800|900)/i.test(htmlText) ||
        /text-decoration\s*:\s*underline/i.test(htmlText);

      const hasSymbol = /^\s*(\[x\]|\*|✓|✔)/i.test(text);
      return hasFormatting || hasSymbol;
    };

    lines.forEach((line) => {
      const questionMatch = line.text.match(/^(?:Câu\s*\d+|\d+)[\).:\-]\s*(.+)$/i);
      if (questionMatch) {
        pushCurrent();
        current = {
          question: questionMatch[1].trim(),
          type: "multiple_choice",
          options: ["", "", "", ""],
          correctAnswer: 0,
          correctAnswers: [],
          correctText: "",
          markedCorrectCount: 0,
        };
        return;
      }

      const optionMatch = line.text.match(/^([A-D])[\).:\-]\s*(.+)$/i);
      if (optionMatch) {
        if (!current) {
          current = {
            question: "",
            type: "multiple_choice",
            options: ["", "", "", ""],
            correctAnswer: 0,
            correctAnswers: [],
            correctText: "",
            markedCorrectCount: 0,
          };
        }

        const optionIndex = optionMatch[1].toUpperCase().charCodeAt(0) - 65;
        const optionText = optionMatch[2].replace(/^\s*(\[x\]|\*|✓|✔)\s*/i, "").trim();
        current.options[optionIndex] = optionText;

        if (hasStyleMarker(line.html, optionMatch[2])) {
          current.correctAnswer = optionIndex;
          current.markedCorrectCount += 1;
        }
        return;
      }

      const shortAnswerMatch = line.text.match(/^(.+?)\s*(?:[:=]|->|=>)\s*(.+)$/);
      if (shortAnswerMatch && !current) {
        result.push({
          question: shortAnswerMatch[1].trim(),
          type: "short_answer",
          options: [],
          correctAnswer: 0,
          correctAnswers: [],
          correctText: shortAnswerMatch[2].trim(),
          points: 1,
        });
        return;
      }

      if (current && current.question) {
        current.question = `${current.question} ${line.text}`.trim();
      } else if (!current) {
        current = {
          question: line.text,
          type: "essay",
          options: [],
          correctAnswer: 0,
          correctAnswers: [],
          correctText: "",
          markedCorrectCount: 1,
        };
      }
    });

    pushCurrent();

    return {
      questions: result,
      warningText: fallbackWarnings.length
        ? `Có ${fallbackWarnings.length} câu không nhận diện được đáp án định dạng. Hệ thống đã mặc định đáp án A, vui lòng kiểm tra lại.`
        : "",
    };
  };

  const handleWordUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const { value } = await mammoth.convertToHtml({ arrayBuffer });
      const parsed = parseWordQuestions(value);

      if (!parsed.questions.length) {
        window.alert("Không đọc được câu hỏi từ file Word. Hãy kiểm tra lại format.");
        return;
      }

      setQuestions(parsed.questions.map((item, idx) => toEditorQuestion(item, idx)));
      setParserWarning(parsed.warningText);
      animateToStep(1);
    } catch (error) {
      console.error("Word parser failed:", error);
      window.alert("Lỗi đọc file .docx. Hãy thử lại với file khác.");
    } finally {
      event.target.value = "";
    }
  };

  const handleJsonUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (parsed.title) setTitle(parsed.title);
      if (parsed.subject) setSubject(parsed.subject);
      if (parsed.time) setTimeInput(String(Math.max(1, Number(parsed.time) || defaultTime)));
      if (parsed.description) setDescription(parsed.description);

      const rawQuestions = Array.isArray(parsed) ? parsed : parsed.questions;
      if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
        window.alert("File JSON không có danh sách câu hỏi.");
        return;
      }

      setQuestions(
        rawQuestions.map((item, idx) =>
          toEditorQuestion(
            {
              question: item.question,
              type: item.type,
              options: item.options,
              correctAnswer: item.answer,
              correctAnswers: item.correctAnswers || item.answer,
              correctText: item.answer,
              points: item.points,
            },
            idx
          )
        )
      );
      setParserWarning("");
      animateToStep(1);
    } catch (error) {
      window.alert("JSON không hợp lệ.");
    } finally {
      event.target.value = "";
    }
  };

  const applyAiExamResult = (payload) => {
    if (!payload || typeof payload !== "object") {
      throw new Error("Kết quả AI không hợp lệ");
    }

    if (payload.title) setTitle(String(payload.title));
    if (payload.subject) setSubject(String(payload.subject));
    if (payload.time) setTimeInput(String(Math.max(1, Number(payload.time) || defaultTime)));
    if (payload.description) setDescription(String(payload.description));

    const generatedQuestions = Array.isArray(payload.questions) ? payload.questions : [];
    if (!generatedQuestions.length) {
      throw new Error("AI chưa tạo được câu hỏi");
    }

    setQuestions(generatedQuestions.map((item, idx) => toEditorQuestion(item, idx)));
    setParserWarning("");
    animateToStep(1);
  };

  const handleGenerateByAi = async () => {
    if (!aiPrompt.trim()) {
      window.alert("Hãy nhập prompt để AI tạo đề thi.");
      return;
    }

    if (!aiService || typeof aiService.generateExamFromPrompt !== "function") {
      window.alert("Module AI chưa sẵn sàng. Hãy reload trang và thử lại.");
      return;
    }

    setIsGeneratingAi(true);
    try {
      const response = await aiService.generateExamFromPrompt(aiPrompt);
      applyAiExamResult(response);
    } catch (error) {
      console.error("AI exam generation failed:", error);
      window.alert(error.message || "Không thể tạo đề thi bằng AI ở thời điểm này.");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const canSave = title.trim().length > 0 && questions.length > 0;

  const validateBeforeSave = () => {
    if (!title.trim()) {
      window.alert("Vui lòng nhập tiêu đề đề thi.");
      return false;
    }

    const hasInvalidQuestion = questions.some((q) => {
      if (!String(q.question || "").trim()) return true;

      if (q.type === "short_answer" || q.type === "essay") {
        return !String(q.correctText || "").trim();
      }

      if (!Array.isArray(q.options) || q.options.some((opt) => !String(opt || "").trim())) {
        return true;
      }

      if (q.type === "checkbox") {
        return !Array.isArray(q.correctAnswers) || q.correctAnswers.length === 0;
      }

      return !Number.isInteger(q.correctAnswer);
    });

    if (hasInvalidQuestion) {
      return window.confirm(
        "Một số câu hỏi còn thiếu nội dung/đáp án. Bạn vẫn muốn lưu đề thi không?"
      );
    }

    return true;
  };

  const handleSave = () => {
    if (!validateBeforeSave()) return;

    const newId = Date.now().toString();
    const payload = {
      id: isEditMode ? (initialData.examId || initialData.id) : newId,
      examId: isEditMode ? (initialData.examId || initialData.id) : newId,
      title: title.trim(),
      subject,
      time: finalTime,
      description: description.trim(),
      questions: questions.map((q) => ({
        question: String(q.question || "").trim(),
        type: q.type,
        options: q.type === "short_answer" || q.type === "essay" ? [] : q.options,
        answer:
          q.type === "short_answer" || q.type === "essay"
            ? String(q.correctText || "").trim()
            : q.type === "checkbox"
            ? q.correctAnswers
            : q.correctAnswer,
        points: Number(q.points) || 1,
      })),
      limit: questions.length,
      isStatic: false,
    };

    onSuccess(payload);
  };

  const stepContent = [
    <section key="general" className="space-y-5">
      <div className="relative overflow-visible rounded-[2rem] border border-white/70 border-t-blue-500/10 bg-white/80 shadow-xl shadow-slate-200/40 backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-x-8 -top-3 h-6 rounded-full bg-gradient-to-r from-blue-500/20 to-indigo-500/20 blur-md" />
        <div className="space-y-5 p-6 sm:p-8">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Tiêu đề đề thi"
            className={`${sharedInputClass} text-3xl font-bold text-slate-800`}
            style={{ fontFamily: "'Plus Jakarta Sans', 'Google Sans', sans-serif" }}
          />

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Mô tả đề thi"
            rows={3}
            className={`${sharedInputClass} resize-none`}
            style={{ fontFamily: "'Plus Jakarta Sans', 'Google Sans', sans-serif" }}
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                <BookOpen size={16} /> Môn học
              </span>
              <SubjectSelect value={subject} onChange={setSubject} options={subjectOptions} />
            </div>

            <label className="space-y-2">
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                <Clock size={16} /> Thời gian (phút)
              </span>
              <input
                type="number"
                min={1}
                value={timeInput}
                onChange={(e) => {
                  const nextValue = e.target.value;
                  if (nextValue === "" || /^\d+$/.test(nextValue)) {
                    setTimeInput(nextValue);
                  }
                }}
                onBlur={() => {
                  if (timeInput.trim() === "") {
                    setTimeInput(String(defaultTime));
                    return;
                  }
                  setTimeInput(String(Math.max(1, Number(timeInput) || defaultTime)));
                }}
                className={sharedInputClass}
                style={{ fontFamily: "'Plus Jakarta Sans', 'Google Sans', sans-serif" }}
              />
            </label>
          </div>
        </div>
      </div>
    </section>,

    <section key="content" className="space-y-5">
      <div className="rounded-3xl border border-blue-100 bg-gradient-to-r from-cyan-50 to-blue-50 p-4">
        <div className="flex items-start gap-3">
          <div className="relative mt-1 rounded-xl bg-white p-2 text-blue-600 shadow">
            <Lightbulb size={18} />
            <span className="absolute inset-0 rounded-xl bg-blue-300/30 blur-md" />
          </div>
          <div className="text-sm text-slate-700">
            <p className="font-semibold text-slate-900">Mẹo nhập nhanh</p>
            <p>
              File `.docx` sẽ tự nhận đáp án đúng qua in đậm, gạch chân, ký hiệu `[x]` hoặc `*`. Nếu không nhận diện được, hệ thống mặc định A và hiển thị cảnh báo.
            </p>
          </div>
        </div>
      </div>

      {parserWarning && (
        <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle size={16} className="mt-0.5" /> {parserWarning}
        </div>
      )}

      <div className="rounded-3xl border border-slate-200 bg-white/85 p-4 shadow-sm backdrop-blur">
        <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <button
            type="button"
            onClick={() => jsonInputRef.current?.click()}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Upload size={16} /> Import JSON
          </button>
          <button
            type="button"
            onClick={() => wordInputRef.current?.click()}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <FileType size={16} /> Import DOCX
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-600">Tạo đề bằng AI</label>
          <textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            rows={3}
            placeholder="Ví dụ: Tạo đề 20 câu về Triết học Mác-Lênin, độ khó trung bình, gồm 15 trắc nghiệm + 5 tự luận ngắn"
            className={`${sharedInputClass} resize-none`}
            style={{ fontFamily: "'Plus Jakarta Sans', 'Google Sans', sans-serif" }}
          />
          <button
            type="button"
            onClick={handleGenerateByAi}
            disabled={isGeneratingAi}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-2.5 font-semibold text-white shadow-md shadow-blue-500/20 transition hover:brightness-105 disabled:opacity-60"
          >
            <Sparkles size={16} /> {isGeneratingAi ? "Đang tạo..." : "Tạo đề bằng AI"}
          </button>
        </div>
      </div>

      {/* Auto-score toolbar */}
      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-2.5">
        <label className="flex cursor-pointer items-center gap-2.5 select-none">
          <div className="relative">
            <input
              type="checkbox"
              checked={autoScore}
              onChange={(e) => setAutoScore(e.target.checked)}
              className="peer sr-only"
            />
            <div className="h-5 w-9 rounded-full bg-slate-200 transition-colors peer-checked:bg-blue-500" />
            <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4" />
          </div>
          <span className="text-sm font-medium text-slate-700">Tự động chia điểm (tổng = 10đ)</span>
        </label>
        {autoScore && (
          <span className="text-xs font-semibold text-blue-600">
            {Math.round((10 / questions.length) * 100) / 100}đ / câu
          </span>
        )}
      </div>

      <motion.div layout className="space-y-3">
        <AnimatePresence initial={false}>
          {questions.map((question, index) => (
            <motion.div
              key={question.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.98 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <QuestionItem
                question={question}
                index={index}
                pointsDisabled={autoScore}
                onQuestionChange={(value) =>
                  updateQuestion(question.id, (prev) => ({ ...prev, question: value }))
                }
                onTypeChange={(nextType) =>
                  updateQuestion(question.id, (prev) => normalizeQuestionByType(prev, nextType))
                }
                onOptionChange={(optIndex, value) =>
                  updateQuestion(question.id, (prev) => {
                    const nextOptions = Array.isArray(prev.options) ? [...prev.options] : ["", "", "", ""];
                    nextOptions[optIndex] = value;
                    return { ...prev, options: nextOptions };
                  })
                }
                onCorrectAnswerChange={(optIndex) =>
                  updateQuestion(question.id, (prev) => ({ ...prev, correctAnswer: optIndex }))
                }
                onCorrectCheckboxChange={(optIndex, checked) =>
                  updateQuestion(question.id, (prev) => {
                    const current = new Set(Array.isArray(prev.correctAnswers) ? prev.correctAnswers : []);
                    if (checked) current.add(optIndex);
                    else current.delete(optIndex);
                    return { ...prev, correctAnswers: Array.from(current).sort((a, b) => a - b) };
                  })
                }
                onShortAnswerChange={(value) =>
                  updateQuestion(question.id, (prev) => ({ ...prev, correctText: value }))
                }
                onPointsChange={(value) => {
                  if (autoScore) return; // locked while auto-score is on
                  updateQuestion(question.id, (prev) => ({ ...prev, points: Math.max(0.1, Number(value) || 1) }));
                }}
                onDelete={() => deleteQuestion(question.id)}
                onDuplicate={() => duplicateQuestion(question.id)}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        <button
          type="button"
          onClick={addQuestion}
          className="w-full rounded-2xl border border-dashed border-blue-300 bg-blue-50/60 px-4 py-3 font-semibold text-blue-700 transition hover:bg-blue-100"
        >
          + Thêm câu hỏi
        </button>
      </motion.div>
    </section>,

    <section key="preview" className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Số câu</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{questions.length}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tổng điểm</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{totalPoints}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Thời gian</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{finalTime} phút</p>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5">
        <h3 className="text-xl font-bold text-slate-900">{title || "Chưa có tiêu đề"}</h3>
        <p className="mt-1 text-sm text-slate-600">{subject}</p>
        <p className="mt-3 text-sm text-slate-500">{description || "Không có mô tả"}</p>

        <div className="mt-4 space-y-2">
          {questions.slice(0, 6).map((q, idx) => (
            <div key={q.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-sm font-semibold text-slate-800">
                {idx + 1}. {q.question || "(Câu hỏi trống)"}
              </p>
              <p className="mt-1 text-xs text-slate-500">Loại: {q.type}</p>
            </div>
          ))}
          {questions.length > 6 && (
            <p className="text-xs text-slate-500">... và {questions.length - 6} câu khác</p>
          )}
        </div>
      </div>
    </section>,
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-slate-50">
      <div className="pointer-events-none absolute left-[-120px] top-[-90px] h-72 w-72 rounded-full bg-blue-200/35 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-140px] right-[-80px] h-80 w-80 rounded-full bg-violet-200/30 blur-3xl" />
      <input
        ref={jsonInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleJsonUpload}
      />
      <input
        ref={wordInputRef}
        type="file"
        accept=".docx"
        className="hidden"
        onChange={handleWordUpload}
      />

      <ExamHeader
        questionCount={questions.length}
        currentStep={step}
        onClose={onClose}
        onSave={handleSave}
        canSave={canSave}
        isEditMode={isEditMode}
      />

      <div className="relative z-10 mx-auto w-full max-w-6xl flex-1 overflow-y-auto px-4 py-8 sm:px-6">
        <nav className="mb-8 grid grid-cols-3 gap-2 rounded-2xl border border-slate-200 bg-white p-2">
          {["Thiết lập chung", "Nội dung câu hỏi", "Xem trước & Lưu"].map((label, idx) => (
            <button
              key={label}
              type="button"
              onClick={() => animateToStep(idx)}
              className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                step === idx
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {idx + 1}. {label}
            </button>
          ))}
        </nav>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="pb-16"
          >
            {stepContent[step]}
          </motion.div>
        </AnimatePresence>

      </div>

      <Toolbar
        onAddQuestion={addQuestion}
        onImportJson={() => jsonInputRef.current?.click()}
        onImportWord={() => wordInputRef.current?.click()}
        onGenerateAi={handleGenerateByAi}
        onPreview={() => animateToStep(2)}
        onPrevStep={() => animateToStep(step - 1)}
        onNextStep={() => animateToStep(step + 1)}
        canPrev={step > 0}
        canNext={step < 2}
      />
    </div>
  );
};
