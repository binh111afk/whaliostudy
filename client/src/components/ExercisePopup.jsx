import React, { useEffect } from 'react';
import { ChevronLeft, ChevronRight, FileCode2, Search, X } from 'lucide-react';

const ExercisePopup = ({
  isOpen,
  searchQuery,
  onSearchChange,
  snippets,
  selectedSnippetId,
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
  onSelectSnippet,
  onClose,
}) => {
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleEsc = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  return (
    <div
      className={`fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm transition-opacity duration-200 ${
        isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
      }`}
      onClick={onClose}
      aria-hidden={!isOpen}
    >
      <div
        className={`w-full max-w-3xl rounded-3xl border border-white/40 bg-white/85 p-4 shadow-2xl backdrop-blur-2xl transition-all duration-200 dark:border-white/10 dark:bg-slate-900/80 sm:p-5 ${
          isOpen ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-3 scale-95 opacity-0'
        }`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Danh sách bài tập"
      >
        <div className="mb-4 flex items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">Danh sách bài tập</h3>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {totalItems} bài tập
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white/75 p-2 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:bg-slate-800/80"
            aria-label="Đóng danh sách bài tập"
          >
            <X size={16} />
          </button>
        </div>

        <div className="relative mb-4">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Tìm theo card, môn học hoặc tên bài tập..."
            className="w-full rounded-xl border border-slate-200 bg-white/85 py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100"
          />
        </div>

        <div className="max-h-[52vh] space-y-2 overflow-y-auto pr-1">
          {snippets.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-4 py-8 text-center text-sm font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">
              Không có bài tập phù hợp với từ khóa hiện tại.
            </div>
          )}

          {snippets.map((snippet) => {
            const snippetId = String(snippet?.id || snippet?._id || '');
            const isActive = snippetId === selectedSnippetId;

            return (
              <button
                key={snippetId}
                onClick={() => onSelectSnippet(snippet)}
                className={`flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                  isActive
                    ? 'border-blue-300 bg-blue-50/80 dark:border-blue-700 dark:bg-blue-900/25'
                    : 'border-slate-200 bg-white/70 hover:border-blue-200 hover:bg-blue-50/50 dark:border-slate-700 dark:bg-slate-900/50 dark:hover:border-blue-700 dark:hover:bg-slate-800/80'
                }`}
              >
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-cyan-100 text-blue-700 dark:from-blue-900/50 dark:to-cyan-900/30 dark:text-blue-300">
                  <FileCode2 size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                    {snippet.subjectName || 'Chưa phân môn'}
                  </p>
                  <p className="mt-1 truncate text-sm font-black text-slate-900 dark:text-slate-100">
                    {snippet.assignmentName || snippet.exerciseName || snippet.cardTitle || 'Chưa có tên bài tập'}
                  </p>
                  <p className="mt-1 truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                    {snippet.cardTitle || 'Card chưa đặt tên'}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-200/80 pt-3 dark:border-slate-700/80">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Trang {totalPages === 0 ? 0 : currentPage}/{totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1 || totalPages === 0}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <ChevronLeft size={14} />
              Trang trước
            </button>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={totalPages === 0 || currentPage >= totalPages}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Trang sau
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExercisePopup;
