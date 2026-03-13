import React from "react";
import {
  Trash2,
  Copy,
  GripVertical,
  Image as ImageIcon,
  ChevronDown,
} from "lucide-react";
import Tooltip from "./Tooltip";

export const QuestionCard = ({
  question,
  index,
  isActive,
  onFocus,
  onQuestionChange,
  onTypeChange,
  onOptionChange,
  onCorrectAnswerChange,
  onShortAnswerChange,
  onDelete,
  onDuplicate,
  onPointsChange,
  onCorrectCheckboxChange,
}) => {
  const questionTypes = [
    { value: "multiple_choice", label: "Trắc nghiệm (1 đáp án)" },
    { value: "checkbox", label: "Chọn nhiều đáp án" },
    { value: "short_answer", label: "Trả lời ngắn" },
  ];

  return (
    <div
      onClick={onFocus}
      className={`
        relative bg-white dark:bg-gray-800 rounded-lg shadow-sm
        transition-all duration-200 cursor-pointer
        ${
          isActive
            ? "ring-2 ring-blue-500 shadow-md border-l-4 border-blue-500"
            : "hover:shadow-md border-l-4 border-transparent"
        }
      `}
    >
      {/* Drag Handle */}
      <div className="absolute -left-8 top-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical size={20} className="text-gray-400" />
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Header: Question Number + Type + Points */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 min-w-[60px]">
              Câu {index + 1}
            </span>
            <input
              type="text"
              value={question.question}
              onChange={(e) => onQuestionChange(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              placeholder="Nhập nội dung câu hỏi..."
              className="flex-1 text-base font-medium bg-transparent border-b-2 border-transparent hover:border-gray-300 focus:border-blue-500 outline-none py-2 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-colors"
            />
          </div>

          {/* Image Upload Button */}
          <Tooltip text="Thêm hình ảnh">
            <button
              onClick={(e) => e.stopPropagation()}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ImageIcon size={20} />
            </button>
          </Tooltip>
        </div>

        {/* Question Type & Points */}
        <div className="flex items-center gap-4 mb-6">
          <select
            value={question.type || "multiple_choice"}
            onChange={(e) => onTypeChange(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            {questionTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              max="100"
              value={question.points || 1}
              onChange={(e) => onPointsChange(parseInt(e.target.value) || 1)}
              onClick={(e) => e.stopPropagation()}
              className="w-16 px-2 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-center font-medium text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-500 dark:text-gray-400">
              điểm
            </span>
          </div>
        </div>

        {/* Answer Options */}
        {question.type === "short_answer" ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 py-3 px-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
              <div className="w-8 h-[2px] bg-gray-300 dark:bg-gray-600"></div>
              <span className="text-sm text-gray-500 dark:text-gray-400 italic">
                Câu trả lời ngắn
              </span>
            </div>
            <div className="pl-4">
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                Đáp án mẫu (để chấm điểm tự động)
              </label>
              <input
                type="text"
                value={question.correctText || ""}
                onChange={(e) => onShortAnswerChange(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder="Ví dụ: Hà Nội"
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        ) : question.type === "checkbox" ? (
          <div className="space-y-2">
            {question.options?.map((option, optIndex) => (
              <div
                key={optIndex}
                className="flex items-center gap-3 group/option"
              >
                <Tooltip text="Đánh dấu là đáp án đúng">
                  <input
                    type="checkbox"
                    checked={question.correctAnswers?.includes(optIndex) || false}
                    onChange={(e) => {
                      e.stopPropagation();
                      onCorrectCheckboxChange(optIndex, e.target.checked);
                    }}
                    className="w-5 h-5 rounded border-2 border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  />
                </Tooltip>
                <span className="text-sm text-gray-500 dark:text-gray-400 font-medium w-6">
                  {String.fromCharCode(65 + optIndex)}.
                </span>
                <input
                  type="text"
                  value={option}
                  onChange={(e) => onOptionChange(optIndex, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  placeholder={`Đáp án ${String.fromCharCode(65 + optIndex)}`}
                  className={`flex-1 px-3 py-2 bg-transparent border-b-2 ${
                    question.correctAnswers?.includes(optIndex)
                      ? "border-green-500 text-green-700 dark:text-green-400 font-medium"
                      : "border-gray-200 dark:border-gray-600"
                  } hover:border-gray-300 dark:hover:border-gray-500 focus:border-blue-500 outline-none text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-colors`}
                />
              </div>
            ))}
            <div className="text-xs text-gray-500 dark:text-gray-400 italic pl-9 pt-2">
              Chọn một hoặc nhiều đáp án đúng
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {question.options?.map((option, optIndex) => (
              <div
                key={optIndex}
                className="flex items-center gap-3 group/option"
              >
                <Tooltip text="Chọn làm đáp án đúng">
                  <input
                    type="radio"
                    name={`question-${index}`}
                    checked={question.correctAnswer === optIndex}
                    onChange={(e) => {
                      e.stopPropagation();
                      onCorrectAnswerChange(optIndex);
                    }}
                    className="w-5 h-5 border-2 border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  />
                </Tooltip>
                <span className="text-sm text-gray-500 dark:text-gray-400 font-medium w-6">
                  {String.fromCharCode(65 + optIndex)}.
                </span>
                <input
                  type="text"
                  value={option}
                  onChange={(e) => onOptionChange(optIndex, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  placeholder={`Đáp án ${String.fromCharCode(65 + optIndex)}`}
                  className={`flex-1 px-3 py-2 bg-transparent border-b-2 ${
                    question.correctAnswer === optIndex
                      ? "border-green-500 text-green-700 dark:text-green-400 font-medium"
                      : "border-gray-200 dark:border-gray-600"
                  } hover:border-gray-300 dark:hover:border-gray-500 focus:border-blue-500 outline-none text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-colors`}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      {isActive && (
        <div className="border-t border-gray-100 dark:border-gray-700 px-6 py-3 flex items-center justify-end gap-2">
          <Tooltip text="Nhân bản câu hỏi">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
            >
              <Copy size={18} />
            </button>
          </Tooltip>
          <div className="w-[1px] h-6 bg-gray-200 dark:bg-gray-600"></div>
          <Tooltip text="Xóa câu hỏi">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
            >
              <Trash2 size={18} />
            </button>
          </Tooltip>
        </div>
      )}
    </div>
  );
};
