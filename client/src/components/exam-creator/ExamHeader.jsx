import React from "react";
import { FileText, Pencil, Save, X } from "lucide-react";

export const ExamHeader = ({
  questionCount,
  currentStep,
  onClose,
  onSave,
  canSave,
  isEditMode = false,
}) => {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-cyan-500 text-white shadow-lg shadow-indigo-200">
            {isEditMode ? <Pencil size={20} /> : <FileText size={20} />}
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              {isEditMode ? "Chỉnh sửa đề thi" : "Whalio Exam Studio"}
            </h1>
            <p className="text-xs font-medium text-slate-500">
              Step {currentStep + 1}/3 • {questionCount} câu hỏi
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-600 transition hover:bg-slate-50"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={!canSave}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save size={16} /> {isEditMode ? "Cập nhật" : "Lưu đề"}
          </button>
        </div>
      </div>
    </header>
  );
};
