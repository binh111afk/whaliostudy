import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import hljs from 'highlight.js';
import {
  CalendarDays,
  ChevronLeft,
  Copy,
  Download,
  FileCode2,
  Moon,
  Plus,
  Sun,
  Trash2,
  X,
} from 'lucide-react';
import { codeSnippetService } from '../services/codeSnippetService';

const INITIAL_FORM = {
  cardTitle: '',
  subjectName: '',
  assignmentName: '',
  assignmentDescription: '',
};

const LANGUAGE_OPTIONS = [
  { value: 'plaintext', label: 'Plain Text' },
  { value: 'cpp', label: 'C++' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'sql', label: 'SQL' },
  { value: 'json', label: 'JSON' },
];

const resolveUsername = (user) => {
  if (user?.username) return String(user.username).trim();

  try {
    const raw = localStorage.getItem('user');
    if (!raw) return '';
    const parsed = JSON.parse(raw);
    return String(parsed?.username || '').trim();
  } catch {
    return '';
  }
};

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--/--/----';
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const inferLanguageFromSubject = (subjectName = '') => {
  const text = String(subjectName || '').toLowerCase();

  if (text.includes('c++') || text.includes('cpp')) return 'cpp';
  if (text.includes('python')) return 'python';
  if (text.includes('java')) return 'java';
  if (text.includes('javascript') || text.includes('js')) return 'javascript';
  if (text.includes('typescript') || text.includes('ts')) return 'typescript';
  if (text.includes('html')) return 'html';
  if (text.includes('css')) return 'css';
  if (text.includes('sql')) return 'sql';
  if (text.includes('json')) return 'json';
  if (text.includes('web')) return 'javascript';

  return 'plaintext';
};

const getExtension = (language = 'plaintext') => {
  const map = {
    cpp: 'cpp',
    javascript: 'js',
    typescript: 'ts',
    python: 'py',
    java: 'java',
    html: 'html',
    css: 'css',
    sql: 'sql',
    json: 'json',
    plaintext: 'txt',
  };
  return map[language] || 'txt';
};

const sanitizeFileName = (name) => {
  return String(name || 'code-snippet')
    .trim()
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

const HIGHLIGHT_EDITOR_CSS = `
.code-editor-shell .hljs {
  background: transparent;
  color: inherit;
  padding: 0;
}
.code-editor-light .hljs-keyword,
.code-editor-light .hljs-selector-tag,
.code-editor-light .hljs-title,
.code-editor-light .hljs-section {
  color: #1d4ed8;
}
.code-editor-light .hljs-string,
.code-editor-light .hljs-attr {
  color: #065f46;
}
.code-editor-light .hljs-number,
.code-editor-light .hljs-literal,
.code-editor-light .hljs-symbol {
  color: #b45309;
}
.code-editor-light .hljs-comment,
.code-editor-light .hljs-quote {
  color: #6b7280;
}
.code-editor-dark .hljs-keyword,
.code-editor-dark .hljs-selector-tag,
.code-editor-dark .hljs-title,
.code-editor-dark .hljs-section {
  color: #93c5fd;
}
.code-editor-dark .hljs-string,
.code-editor-dark .hljs-attr {
  color: #86efac;
}
.code-editor-dark .hljs-number,
.code-editor-dark .hljs-literal,
.code-editor-dark .hljs-symbol {
  color: #fbbf24;
}
.code-editor-dark .hljs-comment,
.code-editor-dark .hljs-quote {
  color: #94a3b8;
}
`;

const escapeHtml = (value) => {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

const getHighlightLanguage = (language) => {
  if (!language || language === 'plaintext') return '';
  if (language === 'cpp') return 'cpp';
  return language;
};

const HighlightCodeEditor = ({ value, onChange, language, theme }) => {
  const previewRef = useRef(null);
  const inputRef = useRef(null);

  const highlighted = useMemo(() => {
    const normalizedValue = String(value || '');
    if (!normalizedValue) return ' ';

    const selectedLanguage = getHighlightLanguage(language);
    if (!selectedLanguage) {
      return escapeHtml(normalizedValue);
    }

    try {
      return hljs.highlight(normalizedValue, { language: selectedLanguage }).value;
    } catch {
      return hljs.highlightAuto(normalizedValue).value;
    }
  }, [value, language]);

  const syncScroll = (element) => {
    if (!previewRef.current || !element) return;
    previewRef.current.scrollTop = element.scrollTop;
    previewRef.current.scrollLeft = element.scrollLeft;
  };

  const handleChange = (event) => {
    onChange(event.target.value);
    syncScroll(event.target);
  };

  const handleKeyDown = (event) => {
    if (event.key !== 'Tab') return;

    event.preventDefault();
    const target = event.currentTarget;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    const nextValue = `${value.slice(0, start)}  ${value.slice(end)}`;

    onChange(nextValue);
    window.requestAnimationFrame(() => {
      target.selectionStart = start + 2;
      target.selectionEnd = start + 2;
      syncScroll(target);
    });
  };

  return (
    <div
      className={`code-editor-shell ${theme === 'dark' ? 'code-editor-dark' : 'code-editor-light'} relative h-full`}
    >
      <style>{HIGHLIGHT_EDITOR_CSS}</style>
      <pre
        ref={previewRef}
        className={`h-full overflow-auto p-4 font-mono text-sm leading-6 ${
          theme === 'dark'
            ? 'bg-slate-950 text-slate-100'
            : 'bg-slate-50 text-slate-900'
        }`}
      >
        <code
          className="hljs block min-h-full whitespace-pre"
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      </pre>
      <textarea
        ref={inputRef}
        value={value}
        spellCheck={false}
        onChange={handleChange}
        onScroll={(event) => syncScroll(event.currentTarget)}
        onKeyDown={handleKeyDown}
        className={`absolute inset-0 h-full w-full resize-none border-0 bg-transparent p-4 font-mono text-sm leading-6 outline-none ${
          theme === 'dark'
            ? 'caret-slate-100 selection:bg-blue-400/30'
            : 'caret-slate-900 selection:bg-blue-500/25'
        }`}
        style={{ color: 'transparent' }}
        aria-label="Code editor"
      />
    </div>
  );
};

const CreateSnippetModal = ({ isOpen, form, onChange, onClose, onCreate, creating }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-3xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-gray-700 dark:bg-gray-800"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-black text-gray-900 dark:text-white">Thêm code</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Đóng form thêm code"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Tên card *
            </label>
            <input
              value={form.cardTitle}
              onChange={(event) => onChange('cardTitle', event.target.value)}
              placeholder="Ví dụ: BFS đồ thị vô hướng"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Tên môn học
            </label>
            <input
              value={form.subjectName}
              onChange={(event) => onChange('subjectName', event.target.value)}
              placeholder="Ví dụ: C++, Toán rời rạc, Web"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Tên bài tập
            </label>
            <input
              value={form.assignmentName}
              onChange={(event) => onChange('assignmentName', event.target.value)}
              placeholder="Ví dụ: Bài 3 - DFS + BFS"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Nội dung / Mô tả bài tập
            </label>
            <textarea
              value={form.assignmentDescription}
              onChange={(event) => onChange('assignmentDescription', event.target.value)}
              rows={4}
              placeholder="Mô tả ngắn nội dung yêu cầu của bài tập"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 dark:border-gray-600 dark:text-gray-200"
          >
            Hủy
          </button>
          <button
            onClick={onCreate}
            disabled={creating}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {creating ? 'Đang tạo...' : 'Lưu card'}
          </button>
        </div>
      </div>
    </div>
  );
};

const CodeSnippetManager = ({ user, onFullscreenChange = () => {} }) => {
  const [snippets, setSnippets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(INITIAL_FORM);
  const [creating, setCreating] = useState(false);
  const [selectedSnippet, setSelectedSnippet] = useState(null);
  const [editorCode, setEditorCode] = useState('');
  const [editorLanguage, setEditorLanguage] = useState('plaintext');
  const [editorTheme, setEditorTheme] = useState('light');
  const [closingDetail, setClosingDetail] = useState(false);

  const username = useMemo(() => resolveUsername(user), [user]);

  const usernameRef = useRef(username);
  const snippetRef = useRef(selectedSnippet);
  const codeRef = useRef(editorCode);
  const languageRef = useRef(editorLanguage);

  useEffect(() => {
    usernameRef.current = username;
  }, [username]);

  useEffect(() => {
    snippetRef.current = selectedSnippet;
  }, [selectedSnippet]);

  useEffect(() => {
    codeRef.current = editorCode;
  }, [editorCode]);

  useEffect(() => {
    languageRef.current = editorLanguage;
  }, [editorLanguage]);

  const loadSnippets = useCallback(async () => {
    if (!username) {
      setSnippets([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const result = await codeSnippetService.getSnippets(username);
    if (!result.success) {
      toast.error(result.message || 'Không tải được kho code');
      setSnippets([]);
      setLoading(false);
      return;
    }

    setSnippets(Array.isArray(result.snippets) ? result.snippets : []);
    setLoading(false);
  }, [username]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSnippets();
  }, [loadSnippets]);

  useEffect(() => {
    onFullscreenChange(Boolean(selectedSnippet));
  }, [selectedSnippet, onFullscreenChange]);

  const hasDraftChanged = useCallback((snippet, draftCode, draftLanguage) => {
    if (!snippet) return false;
    return (
      String(snippet.code || '') !== String(draftCode || '') ||
      String(snippet.language || 'plaintext') !== String(draftLanguage || 'plaintext')
    );
  }, []);

  const persistDraft = useCallback(
    async ({ silent = false, keepalive = false, skipStateSync = false } = {}) => {
      const activeSnippet = snippetRef.current;
      const activeUsername = usernameRef.current;
      const draftCode = codeRef.current;
      const draftLanguage = languageRef.current;

      if (!activeSnippet || !activeUsername) return true;
      if (!hasDraftChanged(activeSnippet, draftCode, draftLanguage)) return true;

      const snippetId = activeSnippet.id || activeSnippet._id;
      const result = await codeSnippetService.updateSnippet(
        snippetId,
        {
          username: activeUsername,
          code: draftCode,
          language: draftLanguage,
        },
        { keepalive }
      );

      if (!result.success) {
        if (!silent) {
          toast.error(result.message || 'Auto-save thất bại');
        }
        return false;
      }

      const nextSnippet = result.snippet || {
        ...activeSnippet,
        code: draftCode,
        language: draftLanguage,
        updatedAt: new Date().toISOString(),
      };

      if (!skipStateSync) {
        setSnippets((prev) =>
          prev.map((item) => {
            const itemId = item.id || item._id;
            return itemId === snippetId ? nextSnippet : item;
          })
        );
        setSelectedSnippet((prev) => {
          if (!prev) return prev;
          const prevId = prev.id || prev._id;
          return prevId === snippetId ? nextSnippet : prev;
        });
      }

      if (!silent) {
        toast.success('Đã auto-save phiên bản mới nhất');
      }
      return true;
    },
    [hasDraftChanged]
  );

  useEffect(() => {
    return () => {
      void persistDraft({ silent: true, keepalive: true, skipStateSync: true });
      onFullscreenChange(false);
    };
  }, [persistDraft, onFullscreenChange]);

  const handleCreateFormChange = (field, value) => {
    setCreateForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateSnippet = async () => {
    if (!username) {
      toast.error('Bạn cần đăng nhập để lưu code');
      return;
    }

    const cardTitle = String(createForm.cardTitle || '').trim();
    if (!cardTitle) {
      toast.error('Tên card là bắt buộc');
      return;
    }

    const payload = {
      username,
      cardTitle,
      subjectName: String(createForm.subjectName || '').trim(),
      assignmentName: String(createForm.assignmentName || '').trim(),
      assignmentDescription: String(createForm.assignmentDescription || '').trim(),
      language: inferLanguageFromSubject(createForm.subjectName),
      code: '',
    };

    setCreating(true);
    const result = await codeSnippetService.createSnippet(payload);
    setCreating(false);

    if (!result.success) {
      toast.error(result.message || 'Không thể tạo card code');
      return;
    }

    if (result.snippet) {
      setSnippets((prev) => [result.snippet, ...prev]);
    } else {
      await loadSnippets();
    }

    setCreateForm(INITIAL_FORM);
    setIsCreateOpen(false);
    toast.success('Đã tạo card code mới');
  };

  const handleOpenDetail = (snippet) => {
    setSelectedSnippet(snippet);
    setEditorCode(String(snippet.code || ''));
    setEditorLanguage(String(snippet.language || inferLanguageFromSubject(snippet.subjectName)));
  };

  const handleCloseDetail = async () => {
    setClosingDetail(true);
    await persistDraft({ silent: false });
    setClosingDetail(false);
    setSelectedSnippet(null);
  };

  const handleDelete = async (snippetId) => {
    if (!username) return;
    const confirmed = window.confirm('Bạn có chắc muốn xóa card code này không?');
    if (!confirmed) return;

    const result = await codeSnippetService.deleteSnippet(snippetId, username);
    if (!result.success) {
      toast.error(result.message || 'Không thể xóa card');
      return;
    }

    setSnippets((prev) => prev.filter((item) => (item.id || item._id) !== snippetId));
    if ((selectedSnippet?.id || selectedSnippet?._id) === snippetId) {
      setSelectedSnippet(null);
    }
    toast.success('Đã xóa card code');
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(editorCode || '');
      toast.success('Đã copy toàn bộ code');
    } catch {
      toast.error('Không thể copy code');
    }
  };

  const handleDownloadCode = () => {
    const fileNameBase = sanitizeFileName(
      selectedSnippet?.assignmentName || selectedSnippet?.cardTitle || 'code-snippet'
    );
    const extension = getExtension(editorLanguage);
    const blob = new Blob([editorCode || ''], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${fileNameBase}.${extension}`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-wrap items-center gap-2">
          <div className="mr-auto flex items-center gap-2 text-lg font-black text-gray-900 dark:text-white">
            <FileCode2 size={20} className="text-blue-600" />
            Kho Code
          </div>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-2 text-sm font-bold text-white hover:bg-blue-700"
          >
            <Plus size={16} />
            Thêm code
          </button>
        </div>
      </div>

      {!username && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          Bạn cần đăng nhập để sử dụng Kho Code.
        </div>
      )}

      {loading && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
          Đang tải dữ liệu kho code...
        </div>
      )}

      {!loading && username && snippets.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-800">
          Chưa có card code nào. Hãy bấm "Thêm code" để bắt đầu.
        </div>
      )}

      {!loading && username && snippets.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {snippets.map((snippet) => {
            const snippetId = snippet.id || snippet._id;
            return (
              <div
                key={snippetId}
                className="group rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => handleOpenDetail(snippet)}
                    className="flex min-w-0 flex-1 items-start gap-3 text-left"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-cyan-100 text-blue-700 dark:from-blue-900/50 dark:to-cyan-900/40 dark:text-blue-300">
                      <FileCode2 size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                        {snippet.subjectName || 'Chưa phân môn'}
                      </p>
                      <h3 className="mt-1 truncate text-base font-black text-gray-900 dark:text-gray-100">
                        {snippet.cardTitle}
                      </h3>
                      <p className="mt-1 truncate text-sm text-gray-600 dark:text-gray-300">
                        {snippet.assignmentDescription ||
                          snippet.assignmentName ||
                          'Chưa có mô tả bài tập'}
                      </p>
                    </div>
                  </button>
                  <button
                    onClick={() => handleDelete(snippetId)}
                    className="rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                    title="Xóa card code"
                    aria-label="Xóa card code"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-200">
                  <CalendarDays size={12} />
                  {formatDate(snippet.createdAt)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CreateSnippetModal
        isOpen={isCreateOpen}
        form={createForm}
        onChange={handleCreateFormChange}
        onClose={() => {
          setIsCreateOpen(false);
          setCreateForm(INITIAL_FORM);
        }}
        onCreate={handleCreateSnippet}
        creating={creating}
      />

      {selectedSnippet && (
        <div className="fixed inset-x-0 bottom-0 top-14 z-[80] bg-white dark:bg-gray-900 min-[1025px]:top-16">
          <div className="flex h-full flex-col">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-4 py-3 dark:border-gray-700">
              <button
                onClick={handleCloseDetail}
                disabled={closingDetail}
                className="inline-flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-60 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                <ChevronLeft size={16} />
                {closingDetail ? 'Đang auto-save...' : 'Ẩn sidebar'}
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={editorLanguage}
                  onChange={(event) => setEditorLanguage(event.target.value)}
                  className="rounded-xl border border-gray-200 px-2.5 py-2 text-sm font-semibold text-gray-700 outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                  title="Chọn ngôn ngữ highlight"
                >
                  {LANGUAGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => setEditorTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
                  className="inline-flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  {editorTheme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
                  {editorTheme === 'light' ? 'Dark code' : 'Light code'}
                </button>

                <button
                  onClick={handleCopyCode}
                  className="inline-flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  <Copy size={16} />
                  Copy
                </button>

                <button
                  onClick={handleDownloadCode}
                  className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-2 text-sm font-bold text-white hover:bg-blue-700"
                >
                  <Download size={16} />
                  Tải về
                </button>
              </div>
            </div>

            <div className="space-y-3 border-b border-gray-200 bg-gray-50/80 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/60">
              <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Tên môn học
                </p>
                <p className="mt-1 text-sm font-black text-blue-600 dark:text-blue-400">
                  {selectedSnippet.subjectName || 'Chưa cập nhật'}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Tên bài tập
                </p>
                <p className="mt-1 text-sm font-bold text-gray-900 dark:text-gray-100">
                  {selectedSnippet.assignmentName || selectedSnippet.cardTitle || 'Chưa cập nhật'}
                </p>
              </div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Nội dung bài tập
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-200">
                  {selectedSnippet.assignmentDescription || 'Chưa có mô tả'}
                </p>
              </div>
            </div>

            <div className="min-h-0 flex-1 p-4">
              <div className="h-full overflow-hidden rounded-2xl border border-gray-200 shadow-sm dark:border-gray-700">
                <HighlightCodeEditor
                  language={editorLanguage}
                  theme={editorTheme}
                  value={editorCode}
                  onChange={setEditorCode}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CodeSnippetManager;
