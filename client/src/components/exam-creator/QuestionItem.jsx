import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import { AlignLeft, CheckCircle2, Copy, ListChecks, PenSquare, Trash2 } from "lucide-react";

const letters = ["A", "B", "C", "D"];
const FONT = { fontFamily: "'Plus Jakarta Sans', 'Google Sans', sans-serif" };

const framelessInput =
  "w-full border-0 border-b-2 border-transparent bg-transparent py-1.5 text-base font-medium text-slate-800 placeholder-slate-300 outline-none transition-colors focus:border-blue-500";

const zoneInputClass =
  "flex-1 rounded-xl border-0 bg-white/70 px-3 py-2 text-sm text-slate-700 placeholder-slate-300 outline-none transition focus:bg-white focus:ring-2 focus:ring-blue-400/30";

const QUESTION_TYPE_OPTIONS = [
  {
    value: "multiple_choice",
    label: "Trắc nghiệm (1 đáp án)",
    icon: CheckCircle2,
    hint: "Chọn 1 phương án đúng",
  },
  {
    value: "checkbox",
    label: "Trắc nghiệm (nhiều đáp án)",
    icon: ListChecks,
    hint: "Chọn nhiều phương án",
  },
  {
    value: "short_answer",
    label: "Trả lời ngắn",
    icon: AlignLeft,
    hint: "Điền nội dung ngắn",
  },
  {
    value: "essay",
    label: "Tự luận",
    icon: PenSquare,
    hint: "Câu mở rộng",
  },
];

const TypeSelect = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const selected = QUESTION_TYPE_OPTIONS.find((item) => item.value === value) || QUESTION_TYPE_OPTIONS[0];
  const SelectedIcon = selected.icon;

  useEffect(() => {
    const onDocumentClick = (event) => {
      if (!containerRef.current?.contains(event.target)) {
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

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-xl border border-slate-200/70 bg-slate-50 px-3 py-2 text-left text-sm text-slate-700 outline-none transition hover:bg-white focus:ring-2 focus:ring-blue-400/30"
        style={FONT}
      >
        <span className="flex items-center gap-2">
          <SelectedIcon size={15} className="text-blue-500" />
          <span>{selected.label}</span>
        </span>
        <span className={`text-xs text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}>▼</span>
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-20 w-full rounded-xl border border-slate-200/70 bg-white/85 p-1.5 shadow-xl backdrop-blur-md">
          {QUESTION_TYPE_OPTIONS.map((item) => {
            const Icon = item.icon;
            const isActive = item.value === value;

            return (
              <button
                key={item.value}
                type="button"
                onClick={() => {
                  onChange(item.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition ${
                  isActive ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-100"
                }`}
                style={FONT}
              >
                <Icon size={15} className={isActive ? "text-blue-600" : "text-slate-500"} />
                <span className="flex-1 text-sm">{item.label}</span>
                <span className="text-[10px] uppercase tracking-wider text-slate-400">{item.hint}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const AutoGrowTextarea = ({ value, onChange, placeholder }) => {
  const ref = useRef(null);

  const handleChange = (event) => {
    const el = event.target;
    el.style.height = "0px";
    el.style.height = `${Math.max(72, el.scrollHeight)}px`;
    onChange(event.target.value);
  };

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      rows={3}
      className={`${framelessInput} resize-none leading-relaxed`}
      style={FONT}
    />
  );
};

const QuestionItemBase = ({
  question,
  index,
  onQuestionChange,
  onTypeChange,
  onOptionChange,
  onCorrectAnswerChange,
  onCorrectCheckboxChange,
  onShortAnswerChange,
  onPointsChange,
  onDelete,
  onDuplicate,
  pointsDisabled = false,
}) => {
  const isEssay = question.type === "essay";
  const isShortAnswer = question.type === "short_answer";
  const isChoice = !isEssay && !isShortAnswer;

  const optionList = useMemo(() => question.options || ["", "", "", ""], [question.options]);

  return (
    <article className="group relative overflow-visible rounded-3xl border border-slate-100 bg-white shadow-sm transition-all hover:shadow-md focus-within:border-blue-200 focus-within:ring-2 focus-within:ring-blue-100">
      {/* Left accent bar */}
      <div className="absolute inset-y-0 left-0 w-1 rounded-l-3xl bg-blue-300 transition-all duration-200 group-focus-within:w-1.5 group-focus-within:bg-blue-500 group-focus-within:shadow-[0_0_18px_rgba(59,130,246,0.7)]" />

      <div className="px-6 py-5 sm:px-7">
        {/* Header: badge + action buttons */}
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-blue-600">
            Câu {index + 1}
          </span>
          <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              onClick={onDuplicate}
              title="Nhân đôi câu hỏi"
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <Copy size={14} />
            </button>
            <button
              type="button"
              onClick={onDelete}
              title="Xóa câu hỏi"
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Question input — frameless */}
        <div className="mb-5">
          {isEssay ? (
            <AutoGrowTextarea
              value={question.question}
              onChange={onQuestionChange}
              placeholder="Nhập nội dung câu tự luận..."
            />
          ) : (
            <input
              value={question.question}
              onChange={(e) => onQuestionChange(e.target.value)}
              placeholder="Nhập nội dung câu hỏi..."
              className={framelessInput}
              style={FONT}
            />
          )}
        </div>

        {/* Settings row: type + points */}
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-[1fr_130px]">
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Loại câu hỏi</p>
            <TypeSelect value={question.type} onChange={onTypeChange} />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Điểm</p>
            <input
              type="number"
              min={0.1}
              step={0.25}
              max={100}
              value={question.points}
              disabled={pointsDisabled}
              onChange={(e) => onPointsChange(Math.max(0.1, Number(e.target.value) || 1))}
              className="w-full rounded-xl border-0 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none transition focus:bg-white focus:ring-2 focus:ring-blue-400/30 disabled:cursor-not-allowed disabled:opacity-50"
              style={FONT}
            />
          </div>
        </div>

        {/* Answer zone */}
        {isChoice && (
          <div className="rounded-2xl bg-indigo-50/40 p-3.5">
            <p className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Đáp án (tích vào ô tròn để chọn đáp án đúng)</p>
            <div className="space-y-2">
              {optionList.map((option, optIndex) => {
                const isCheckbox = question.type === "checkbox";
                const checked = isCheckbox
                  ? question.correctAnswers?.includes(optIndex)
                  : question.correctAnswer === optIndex;

                return (
                  <div key={`${question.id}-${optIndex}`} className="flex items-center gap-2.5">
                    <input
                      type={isCheckbox ? "checkbox" : "radio"}
                      name={`correct-${question.id}`}
                      checked={Boolean(checked)}
                      onChange={(e) => {
                        if (isCheckbox) {
                          onCorrectCheckboxChange(optIndex, e.target.checked);
                        } else {
                          onCorrectAnswerChange(optIndex);
                        }
                      }}
                      className="h-4 w-4 shrink-0 accent-blue-600"
                    />
                    <span className="w-5 shrink-0 text-xs font-bold text-slate-500">{letters[optIndex]}</span>
                    <input
                      value={option}
                      onChange={(e) => onOptionChange(optIndex, e.target.value)}
                      placeholder={`Nhập đáp án ${letters[optIndex]}...`}
                      className={`${zoneInputClass} ${checked ? "!bg-emerald-50 text-emerald-800 ring-2 ring-emerald-300/50" : ""}`}
                      style={FONT}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {(isShortAnswer || isEssay) && (
          <div className="rounded-2xl bg-indigo-50/40 p-3.5">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Đáp án mẫu</p>
            <input
              value={question.correctText || ""}
              onChange={(e) => onShortAnswerChange(e.target.value)}
              placeholder={isEssay ? "Tiêu chí chấm điểm ngắn gọn..." : "Đáp án mẫu..."}
              className={`w-full ${zoneInputClass}`}
              style={FONT}
            />
          </div>
        )}
      </div>
    </article>
  );
};

export const QuestionItem = memo(QuestionItemBase);
