import React from "react";
import {
  Plus,
  FileJson,
  FileType,
  Sparkles,
  Eye,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const DockButton = ({ icon: Icon, label, onClick, active, disabled = false }) => (
  <div className="group relative flex items-center justify-end">
    <span className="pointer-events-none absolute right-[calc(100%+10px)] whitespace-nowrap rounded-lg border border-slate-200 bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-slate-700 opacity-0 shadow-lg backdrop-blur-md transition-all duration-150 group-hover:translate-x-0 group-hover:opacity-100">
      {label}
    </span>
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
        active
          ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
          : "text-slate-600 hover:bg-slate-100"
      } disabled:cursor-not-allowed disabled:opacity-40`}
    >
      <Icon size={16} className="transition group-hover:scale-105" />
    </button>
  </div>
);

export const Toolbar = ({
  onAddQuestion,
  onImportJson,
  onImportWord,
  onGenerateAi,
  onPreview,
  onPrevStep,
  onNextStep,
  canPrev,
  canNext,
}) => {
  return (
    <aside className="fixed right-4 top-1/2 z-40 hidden -translate-y-1/2 xl:block">
      <div className="rounded-full border border-white/60 bg-white/70 p-2 shadow-2xl shadow-slate-300/30 backdrop-blur-xl">
        <div className="flex flex-col gap-1.5">
          <DockButton icon={Plus} label="Thêm câu hỏi" onClick={onAddQuestion} />
          <DockButton icon={FileJson} label="Import JSON" onClick={onImportJson} />
          <DockButton icon={FileType} label="Import DOCX" onClick={onImportWord} />
          <DockButton icon={Sparkles} label="Tạo bằng AI" onClick={onGenerateAi} />
          <DockButton icon={Eye} label="Xem trước" onClick={onPreview} />

          <div className="my-1 h-px bg-slate-200" />

          <DockButton
            icon={ChevronLeft}
            label="Bước trước"
            onClick={onPrevStep}
            disabled={!canPrev}
          />
          <DockButton
            icon={ChevronRight}
            label="Bước sau"
            onClick={onNextStep}
            disabled={!canNext}
          />
        </div>
      </div>
    </aside>
  );
};
