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

const DockButton = ({ icon: Icon, label, onClick, active }) => (
  <button
    type="button"
    onClick={onClick}
    title={label}
    className={`group flex h-11 w-11 items-center justify-center rounded-2xl transition ${
      active
        ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
        : "text-slate-600 hover:bg-slate-100"
    }`}
  >
    <Icon size={18} className="transition group-hover:scale-105" />
  </button>
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
      <div className="rounded-[1.75rem] border border-white/60 bg-white/70 p-2.5 shadow-2xl shadow-slate-300/30 backdrop-blur-xl">
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
            active={!canPrev}
          />
          <DockButton
            icon={ChevronRight}
            label="Bước sau"
            onClick={onNextStep}
            active={!canNext}
          />
        </div>
      </div>
    </aside>
  );
};
