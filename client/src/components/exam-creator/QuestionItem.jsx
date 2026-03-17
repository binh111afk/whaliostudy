import React, { memo, useMemo, useRef } from "react";
import { Copy, Trash2 } from "lucide-react";

const letters = ["A", "B", "C", "D"];

const sharedInputClass =
  "w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:shadow-[0_0_0_4px_rgba(59,130,246,0.18)]";

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
      className={`${sharedInputClass} resize-none leading-relaxed`}
      style={{ fontFamily: "'Plus Jakarta Sans', 'Google Sans', sans-serif" }}
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
}) => {
  const isEssay = question.type === "essay";
  const isShortAnswer = question.type === "short_answer";

  const optionList = useMemo(() => question.options || ["", "", "", ""], [question.options]);

  return (
    <article className="rounded-3xl border border-slate-200 bg-white/85 p-5 shadow-sm backdrop-blur">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Câu {index + 1}</p>

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
              className={sharedInputClass}
              style={{ fontFamily: "'Plus Jakarta Sans', 'Google Sans', sans-serif" }}
            />
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onDuplicate}
            className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-indigo-600"
          >
            <Copy size={16} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-xl p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_120px]">
        <select
          value={question.type}
          onChange={(e) => onTypeChange(e.target.value)}
          className={sharedInputClass}
          style={{ fontFamily: "'Plus Jakarta Sans', 'Google Sans', sans-serif" }}
        >
          <option value="multiple_choice">Trắc nghiệm (1 đáp án)</option>
          <option value="checkbox">Trắc nghiệm (nhiều đáp án)</option>
          <option value="short_answer">Trả lời ngắn</option>
          <option value="essay">Tự luận</option>
        </select>

        <input
          type="number"
          min={1}
          max={100}
          value={question.points}
          onChange={(e) => onPointsChange(Math.max(1, Number(e.target.value) || 1))}
          className={sharedInputClass}
          style={{ fontFamily: "'Plus Jakarta Sans', 'Google Sans', sans-serif" }}
        />
      </div>

      {(isShortAnswer || isEssay) && (
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500">Đáp án mẫu</label>
          <input
            value={question.correctText || ""}
            onChange={(e) => onShortAnswerChange(e.target.value)}
            placeholder={isEssay ? "Tiêu chí chấm ngắn gọn" : "Đáp án ngắn"}
            className={sharedInputClass}
            style={{ fontFamily: "'Plus Jakarta Sans', 'Google Sans', sans-serif" }}
          />
        </div>
      )}

      {!isShortAnswer && !isEssay && (
        <div className="space-y-2.5">
          {optionList.map((option, optIndex) => {
            const isCheckbox = question.type === "checkbox";
            const checked = isCheckbox
              ? question.correctAnswers?.includes(optIndex)
              : question.correctAnswer === optIndex;

            return (
              <div key={`${question.id}-${optIndex}`} className="flex items-center gap-3">
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
                  className="h-4 w-4 border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="w-5 text-xs font-semibold text-slate-500">{letters[optIndex]}</span>
                <input
                  value={option}
                  onChange={(e) => onOptionChange(optIndex, e.target.value)}
                  placeholder={`Đáp án ${letters[optIndex]}`}
                  className={`${sharedInputClass} ${checked ? "border-emerald-300 bg-emerald-50" : ""}`}
                  style={{ fontFamily: "'Plus Jakarta Sans', 'Google Sans', sans-serif" }}
                />
              </div>
            );
          })}
        </div>
      )}
    </article>
  );
};

export const QuestionItem = memo(QuestionItemBase);
