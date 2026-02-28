import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import {
  CalendarDays,
  ChevronLeft,
  ChevronDown,
  Copy,
  Download,
  FileCode2,
  Palette,
  Play,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { codeSnippetService } from '../services/codeSnippetService';
import ExercisePopup from '../components/ExercisePopup';
import {
  CODE_EDITOR_THEME_STORAGE_KEY,
  CODE_EDITOR_THEME_OPTIONS,
  DEFAULT_DARK_THEME_KEY,
  getCodeEditorThemeConfig,
  resolveInitialCodeEditorTheme,
  ensureCodeEditorTheme,
} from '../utils/codeEditorThemes';

const INITIAL_FORM = {
  cardTitle: '',
  subjectName: '',
  assignmentName: '',
  assignmentDescription: '',
};

const getSnippetId = (snippet) => String(snippet?.id || snippet?._id || '');

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

const MAIN_PAGE_SIZE = 9;
const POPUP_PAGE_SIZE = 6;

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

const AUTO_PAIR_MAP = {
  '(': ')',
  '[': ']',
  '{': '}',
  '"': '"',
  "'": "'",
  '`': '`',
};
const JS_LIKE_LANGUAGES = new Set(['javascript', 'typescript', 'cpp', 'java']);
const AUTO_FORMAT_LINE_LANGUAGES = new Set(['javascript', 'typescript', 'cpp', 'java']);
const LOCAL_RUN_LANGUAGES = new Set(['plaintext', 'json', 'html', 'css']);
const REMOTE_RUN_LANGUAGES = new Set(['cpp', 'javascript', 'typescript', 'python', 'java', 'sql']);
const AUTO_JUDGE_TOTAL_SCORE = 10;
const AUTO_JUDGE_REVEAL_INITIAL_MS = 450;
const AUTO_JUDGE_REVEAL_STEP_MS = 300;

const roundJudgeScore = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Number(parsed.toFixed(2));
};

const formatJudgeScore = (value) => roundJudgeScore(value).toFixed(2).replace(/\.00$/, '');

const normalizeOutputForJudge = (value) => {
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim();
};

const isExpectedOutputMatched = (actualOutput, expectedOutput) =>
  normalizeOutputForJudge(actualOutput) === normalizeOutputForJudge(expectedOutput);

const isTimeLimitError = (errorText) =>
  /(timeout|time limit|timed out|quá lâu|tle)/i.test(String(errorText || ''));

const isCompilerErrorResult = (payload) =>
  String(payload?.errorType || '').toLowerCase() === 'compiler_error' ||
  payload?.compilerError === true ||
  Boolean(String(payload?.compiler_error || '').trim());

const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

const toSnippetTestCaseList = (snippet) => {
  const rawCases = Array.isArray(snippet?.testCases) ? snippet.testCases : [];
  return rawCases.map((item) => ({
    input: String(item?.input || ''),
    expectedOutput: String(item?.expectedOutput || ''),
    score: roundJudgeScore(item?.score),
  }));
};

const buildPendingJudgeResults = (testCases) =>
  (Array.isArray(testCases) ? testCases : []).map((testCase, index) => ({
    ...testCase,
    index,
    status: 'pending',
    gotOutput: '',
    errorMessage: '',
    executionTimeMs: 0,
  }));

const formatExecutionTime = (ms) => {
  const numericMs = Number(ms);
  if (!Number.isFinite(numericMs) || numericMs <= 0) return '--';
  if (numericMs >= 1000) return `${(numericMs / 1000).toFixed(2)}s`;
  return `${(numericMs / 1000).toFixed(3)}s`;
};

const AutoJudgeStatusIcon = ({ status }) => {
  if (status === 'passed') {
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="#22c55e" />
        <circle cx="17.4" cy="6.8" r="2.2" fill="#14b8a6" />
        <path d="M7 12.5l3.1 3.1L17.5 8.2" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (status === 'failed') {
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="#ef4444" />
        <circle cx="17.2" cy="7.1" r="2.1" fill="#f97316" />
        <path d="M8.2 8.2l7.6 7.6M15.8 8.2l-7.6 7.6" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    );
  }

  if (status === 'tle') {
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="#f59e0b" />
        <circle cx="17.1" cy="7.1" r="2.1" fill="#f97316" />
        <path d="M12 7v6l3.2 1.8" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="1.2" fill="#fff" />
      </svg>
    );
  }

  return <span className="inline-block h-3.5 w-3.5 animate-pulse rounded-full bg-slate-300 dark:bg-slate-600" />;
};

const formatOperatorsInLine = (line) => {
  let nextLine = String(line || '');

  nextLine = nextLine.replace(/\s*(===|!==|==|!=|<=|>=|\+=|-=|\*=|\/=|%=|&&|\|\|)\s*/g, ' $1 ');
  nextLine = nextLine.replace(/([A-Za-z0-9_)])\s*=\s*([A-Za-z0-9_(])/g, '$1 = $2');
  nextLine = nextLine.replace(/([A-Za-z0-9_)])\s*([%*/+-])\s*([A-Za-z0-9_(])/g, '$1 $2 $3');

  return nextLine.replace(/\s{2,}/g, ' ').trim();
};

const shouldKeepLineWithoutSemicolon = (line) => {
  const normalizedLine = String(line || '').trim();
  if (!normalizedLine) return true;
  if (/[;{}:,]$/.test(normalizedLine)) return true;
  if (normalizedLine.startsWith('#')) return true;
  if (/^(if|for|while|switch|catch)\b/.test(normalizedLine)) return true;
  if (/^(else|try|do)\b/.test(normalizedLine)) return true;
  if (/^(class|struct|enum|interface|namespace)\b/.test(normalizedLine)) return true;
  if (/^(public|private|protected)\s*:/.test(normalizedLine)) return true;
  return false;
};

const shouldAppendSemicolon = (line) => {
  const normalizedLine = String(line || '').trim();
  if (!normalizedLine || shouldKeepLineWithoutSemicolon(normalizedLine)) return false;
  if (/^(return|throw|break|continue)\b/.test(normalizedLine)) return true;
  return /(%|=|\+=|-=|\*=|\/=|%=)/.test(normalizedLine);
};

const autoFormatCommittedLine = (line, language) => {
  if (!AUTO_FORMAT_LINE_LANGUAGES.has(String(language || ''))) {
    return String(line || '');
  }

  const rawLine = String(line || '');
  const leadingIndent = (rawLine.match(/^\s*/) || [''])[0];
  const content = rawLine.slice(leadingIndent.length);
  if (!content.trim()) return rawLine;

  const lineHasQuotes = /["'`]/.test(content);
  const commentIndex = content.indexOf('//');
  const codePart = commentIndex >= 0 ? content.slice(0, commentIndex) : content;
  const commentPart = commentIndex >= 0 ? content.slice(commentIndex).trimStart() : '';

  let formattedCode = codePart.trim();
  if (!lineHasQuotes) {
    formattedCode = formatOperatorsInLine(formattedCode);
  }
  if (shouldAppendSemicolon(formattedCode)) {
    formattedCode = `${formattedCode};`;
  }

  if (!formattedCode) return rawLine;
  if (!commentPart) return `${leadingIndent}${formattedCode}`;
  return `${leadingIndent}${formattedCode} ${commentPart}`;
};

const collectCodeIssues = (code, language) => {
  const issues = [];
  const source = String(code || '');
  const normalizedLanguage = String(language || 'plaintext');
  const stack = [];
  const stackEntryMeta = [];
  const supportsJsComments = JS_LIKE_LANGUAGES.has(normalizedLanguage);
  let line = 1;
  let col = 0;
  let activeQuote = '';
  let quoteLine = 1;
  let quoteCol = 1;
  let inLineComment = false;
  let inBlockComment = false;
  let escaped = false;

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    const nextChar = source[i + 1];
    col += 1;

    if (char === '\n') {
      line += 1;
      col = 0;
      inLineComment = false;
      escaped = false;
      continue;
    }

    if (inLineComment) continue;

    if (inBlockComment) {
      if (char === '*' && nextChar === '/') {
        inBlockComment = false;
        i += 1;
        col += 1;
      }
      continue;
    }

    if (activeQuote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === activeQuote) {
        activeQuote = '';
      }
      continue;
    }

    if (supportsJsComments && char === '/' && nextChar === '/') {
      inLineComment = true;
      i += 1;
      col += 1;
      continue;
    }
    if (supportsJsComments && char === '/' && nextChar === '*') {
      inBlockComment = true;
      i += 1;
      col += 1;
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      activeQuote = char;
      quoteLine = line;
      quoteCol = col;
      continue;
    }

    if (char === '(' || char === '[' || char === '{') {
      stack.push(char);
      stackEntryMeta.push({ line, col });
      continue;
    }

    if (char === ')' || char === ']' || char === '}') {
      const last = stack.pop();
      const lastMeta = stackEntryMeta.pop();
      if (!last || AUTO_PAIR_MAP[last] !== char) {
        const expected = last ? AUTO_PAIR_MAP[last] : 'không có';
        const from = lastMeta ? ` (mở tại dòng ${lastMeta.line})` : '';
        issues.push(`Sai cặp ngoặc tại dòng ${line}, cột ${col}: gặp "${char}", mong đợi "${expected}"${from}.`);
      }
    }
  }

  if (activeQuote) {
    issues.push(`Thiếu dấu đóng cho ${activeQuote} bắt đầu ở dòng ${quoteLine}, cột ${quoteCol}.`);
  }
  while (stack.length > 0) {
    const opened = stack.pop();
    const openedMeta = stackEntryMeta.pop();
    issues.push(
      `Thiếu dấu đóng "${AUTO_PAIR_MAP[opened]}" cho "${opened}" ở dòng ${openedMeta?.line || 1}, cột ${openedMeta?.col || 1}.`
    );
  }

  if (normalizedLanguage === 'json' && source.trim()) {
    try {
      JSON.parse(source);
    } catch (error) {
      const message = String(error?.message || 'JSON không hợp lệ');
      issues.push(`JSON lỗi: ${message}`);
    }
  }

  if (normalizedLanguage === 'javascript' && source.trim()) {
    try {
      // Validate syntax quickly before running in worker.
      new Function(source);
    } catch (error) {
      const message = String(error?.message || 'Lỗi cú pháp JavaScript');
      issues.push(`JavaScript lỗi cú pháp: ${message}`);
    }
  }

  return issues;
};

const runJavaScriptInWorker = ({ code, input, timeoutMs = 60000 }) => {
  const workerSource = `
self.onmessage = async (event) => {
  const payload = event.data || {};
  const source = String(payload.code || '');
  const rawInput = String(payload.input || '');
  const inputLines = rawInput.split(/\\r?\\n/);
  let inputIndex = 0;
  const readInput = () => (inputIndex < inputLines.length ? inputLines[inputIndex++] : '');
  const stringifyValue = (value) => {
    if (typeof value === 'string') return value;
    if (typeof value === 'undefined') return 'undefined';
    try {
      return JSON.stringify(value);
    } catch (error) {
      return String(value);
    }
  };
  const output = [];
  const print = (...args) => {
    output.push(args.map((arg) => stringifyValue(arg)).join(' '));
  };
  const consoleProxy = {
    log: (...args) => print(...args),
    info: (...args) => print(...args),
    warn: (...args) => print(...args),
    error: (...args) => output.push('[error] ' + args.map((arg) => stringifyValue(arg)).join(' ')),
  };
  try {
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    const runner = new AsyncFunction('console', 'input', 'readLine', 'print', 'prompt', '"use strict";\\n' + source);
    const result = await runner(consoleProxy, readInput, readInput, print, readInput);
    if (typeof result !== 'undefined') {
      output.push('=> ' + stringifyValue(result));
    }
    self.postMessage({
      type: 'success',
      output: output.join('\\n') || '(Không có output)',
    });
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error && error.message ? error.message : String(error),
    });
  }
};
`;

  return new Promise((resolve, reject) => {
    const blob = new Blob([workerSource], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);
    let finished = false;

    const cleanup = () => {
      worker.terminate();
      URL.revokeObjectURL(url);
    };

    const timeoutId = window.setTimeout(() => {
      if (finished) return;
      finished = true;
      cleanup();
      reject(new Error('Code chạy quá lâu (>60 giây). Hãy kiểm tra vòng lặp vô hạn.'));
    }, timeoutMs);

    worker.onmessage = (event) => {
      if (finished) return;
      finished = true;
      window.clearTimeout(timeoutId);
      cleanup();
      const payload = event?.data || {};
      if (payload.type === 'success') {
        resolve(String(payload.output || '(Không có output)'));
        return;
      }
      reject(new Error(String(payload.error || 'Lỗi chạy code')));
    };

    worker.onerror = (event) => {
      if (finished) return;
      finished = true;
      window.clearTimeout(timeoutId);
      cleanup();
      reject(new Error(String(event?.message || 'Worker gặp lỗi')));
    };

    worker.postMessage({
      code: String(code || ''),
      input: String(input || ''),
    });
  });
};

const runLocalLanguage = ({ language, code, input }) => {
  const normalizedLanguage = String(language || 'plaintext');
  const source = String(code || '');
  const rawInput = String(input || '');

  if (normalizedLanguage === 'plaintext') {
    return {
      output: source || rawInput || '(Không có output)',
      previewHtml: '',
    };
  }

  if (normalizedLanguage === 'json') {
    const parsed = JSON.parse(source || '{}');
    return {
      output: JSON.stringify(parsed, null, 2),
      previewHtml: '',
    };
  }

  if (normalizedLanguage === 'html') {
    return {
      output: 'Đã render preview HTML ở khung bên dưới.',
      previewHtml: source || '<!doctype html><html><body><p>Trống</p></body></html>',
    };
  }

  if (normalizedLanguage === 'css') {
    const previewBody = rawInput.trim() || '<div class="preview-box">CSS Preview</div>';
    const previewHtml = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>${source}</style>
  </head>
  <body>${previewBody}</body>
</html>`;
    return {
      output: 'Đã render preview CSS ở khung bên dưới. Bạn có thể nhập HTML mẫu vào ô Input.',
      previewHtml,
    };
  }

  return {
    output: '(Không hỗ trợ local runner cho ngôn ngữ này)',
    previewHtml: '',
  };
};

const toMonacoLanguage = (language) => {
  const normalized = String(language || 'plaintext').toLowerCase();
  const map = {
    cpp: 'cpp',
    cxx: 'cpp',
    'c++': 'cpp',
    javascript: 'javascript',
    js: 'javascript',
    typescript: 'typescript',
    ts: 'typescript',
    python: 'python',
    py: 'python',
    java: 'java',
    html: 'html',
    css: 'css',
    sql: 'sql',
    json: 'json',
    plaintext: 'plaintext',
    text: 'plaintext',
  };
  return map[normalized] || 'plaintext';
};

const MonacoCodeEditor = ({ value, onChange, language, themeKey }) => {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const languageRef = useRef(language);
  const themeKeyRef = useRef(themeKey);
  const [themeReady, setThemeReady] = useState(false);

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  useEffect(() => {
    themeKeyRef.current = themeKey;
  }, [themeKey]);

  // Apply theme when theme key changes or initially after mount
  useEffect(() => {
    if (!monacoRef.current) return;
    
    ensureCodeEditorTheme(monacoRef.current, themeKey).then(() => {
      setThemeReady(true);
    });
  }, [themeKey]);

  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;
    const model = editorRef.current.getModel();
    if (!model) return;
    monacoRef.current.editor.setModelLanguage(model, toMonacoLanguage(language));
  }, [language]);

  const options = useMemo(
    () => ({
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 14,
      lineHeight: 24,
      fontLigatures: true,
      wordWrap: 'on',
      scrollBeyondLastLine: false,
      tabSize: 2,
      insertSpaces: true,
      detectIndentation: false,
      autoIndent: 'full',
      formatOnType: true,
      formatOnPaste: true,
      autoClosingBrackets: 'always',
      autoClosingQuotes: 'always',
      autoSurround: 'languageDefined',
      bracketPairColorization: { enabled: true },
      matchBrackets: 'always',
      guides: {
        bracketPairs: true,
        indentation: true,
      },
      smoothScrolling: true,
      cursorSmoothCaretAnimation: 'on',
      quickSuggestions: {
        other: true,
        comments: false,
        strings: true,
      },
      suggestOnTriggerCharacters: true,
    }),
    []
  );

  const handleMount = useCallback(
    async (editor, monaco) => {
      editorRef.current = editor;
      monacoRef.current = monaco;

      // Load and apply initial theme
      await ensureCodeEditorTheme(monaco, themeKeyRef.current);
      setThemeReady(true);

      const typedDisposable = editor.onDidType((text) => {
        if (text !== ';') return;
        if (!AUTO_FORMAT_LINE_LANGUAGES.has(String(languageRef.current || ''))) return;

        window.requestAnimationFrame(() => {
          const activeEditor = editorRef.current;
          const activeMonaco = monacoRef.current;
          if (!activeEditor || !activeMonaco) return;

          const model = activeEditor.getModel();
          const position = activeEditor.getPosition();
          if (!model || !position) return;

          const lineNumber = position.lineNumber;
          const currentLine = model.getLineContent(lineNumber);
          const formattedLine = autoFormatCommittedLine(currentLine, languageRef.current);
          if (formattedLine === currentLine) return;

          const nextColumn = Math.max(
            1,
            Math.min(formattedLine.length + 1, position.column + (formattedLine.length - currentLine.length))
          );

          activeEditor.executeEdits('semicolon-magic', [
            {
              range: new activeMonaco.Range(lineNumber, 1, lineNumber, currentLine.length + 1),
              text: formattedLine,
            },
          ]);
          activeEditor.setPosition({ lineNumber, column: nextColumn });
        });
      });

      editor.onDidDispose(() => {
        typedDisposable.dispose();
      });
    },
    []
  );

  // Get theme config for initial theme (vs-dark as fallback before custom theme loads)
  const themeConfig = getCodeEditorThemeConfig(themeKey);
  const initialTheme = themeReady ? themeConfig.monacoTheme : (themeConfig.isDark ? 'vs-dark' : 'vs');
  const hasNeonGlow = themeConfig.hasNeonGlow;

  return (
    <div className={`h-full w-full ${hasNeonGlow ? 'synthwave-neon-glow' : ''}`}>
      <style>
        {hasNeonGlow ? `
          .synthwave-neon-glow .monaco-editor .mtk3,
          .synthwave-neon-glow .monaco-editor .mtk5,
          .synthwave-neon-glow .monaco-editor .mtk6 {
            text-shadow: 0 0 2px #ff7edb80, 0 0 5px #ff7edb60, 0 0 10px #ff7edb40;
          }
          .synthwave-neon-glow .monaco-editor .mtk12,
          .synthwave-neon-glow .monaco-editor .mtk10 {
            text-shadow: 0 0 2px #36f9f680, 0 0 5px #36f9f660, 0 0 10px #36f9f640;
          }
          .synthwave-neon-glow .monaco-editor .mtk8,
          .synthwave-neon-glow .monaco-editor .mtk9 {
            text-shadow: 0 0 2px #fede5d80, 0 0 5px #fede5d60, 0 0 10px #fede5d40;
          }
          .synthwave-neon-glow .monaco-editor .mtk4 {
            text-shadow: 0 0 2px #fe445080, 0 0 5px #fe445060, 0 0 10px #fe445040;
          }
          .synthwave-neon-glow .monaco-editor .mtk7 {
            text-shadow: 0 0 2px #72f1b880, 0 0 5px #72f1b860, 0 0 10px #72f1b840;
          }
          .synthwave-neon-glow .monaco-editor .mtk11 {
            text-shadow: 0 0 2px #ff8b3980, 0 0 5px #ff8b3960, 0 0 10px #ff8b3940;
          }
          .synthwave-neon-glow .monaco-editor .cursor {
            background-color: #ff7edb !important;
            box-shadow: 0 0 8px #ff7edb, 0 0 16px #ff7edb80;
          }
        ` : ''}
      </style>
      <Editor
        height="100%"
        language={toMonacoLanguage(language)}
        theme={initialTheme}
        value={String(value || '')}
        onChange={(nextValue) => onChange(String(nextValue || ''))}
        onMount={handleMount}
        options={options}
        loading={
          <div className="flex h-full items-center justify-center bg-slate-50 text-sm font-semibold text-slate-500 dark:bg-slate-950 dark:text-slate-300">
            Đang tải Monaco Editor...
          </div>
        }
      />
    </div>
  );
};

const CreateSnippetModal = ({
  isOpen,
  form,
  onChange,
  onClose,
  onCreate,
  creating,
  formattingDescription,
  onFormatWithAI,
  mode = 'create',
}) => {
  if (!isOpen) return null;

  const isEditMode = mode === 'edit';
  const modalContent = (
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-3xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-gray-700 dark:bg-gray-800"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-black text-gray-900 dark:text-white">
            {isEditMode ? 'Sửa card code' : 'Thêm code'}
          </h2>
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
            <div className="mb-1 flex items-center justify-between gap-2">
              <label className="block text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Nội dung / Mô tả bài tập
              </label>
              <button
                type="button"
                onClick={onFormatWithAI}
                disabled={formattingDescription}
                className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-70 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/40"
              >
                <Sparkles size={12} />
                {formattingDescription ? 'Đang format...' : 'Format bằng AI'}
              </button>
            </div>
            <textarea
              value={form.assignmentDescription}
              onChange={(event) => onChange('assignmentDescription', event.target.value)}
              rows={4}
              placeholder="Mô tả ngắn nội dung yêu cầu của bài tập"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            <p className="mt-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
              Khi lưu card, AI sẽ tự tạo test case và chia điểm tự động theo từng case.
            </p>
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
            disabled={creating || formattingDescription}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {creating ? 'Đang xử lý...' : isEditMode ? 'Lưu chỉnh sửa' : 'Lưu card'}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return modalContent;
  return createPortal(modalContent, document.body);
};

const CodeSnippetManager = ({ user, onFullscreenChange = () => {} }) => {
  const [snippets, setSnippets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(INITIAL_FORM);
  const [editingSnippet, setEditingSnippet] = useState(null);
  const [creating, setCreating] = useState(false);
  const [formattingDescription, setFormattingDescription] = useState(false);
  const [selectedSnippet, setSelectedSnippet] = useState(null);
  const [editorCode, setEditorCode] = useState('');
  const [editorLanguage, setEditorLanguage] = useState('plaintext');
  const [editorTheme, setEditorTheme] = useState(() => {
    try {
      const savedTheme = localStorage.getItem(CODE_EDITOR_THEME_STORAGE_KEY);
      return resolveInitialCodeEditorTheme(savedTheme);
    } catch {
      return DEFAULT_DARK_THEME_KEY;
    }
  });
  const [closingDetail, setClosingDetail] = useState(false);
  const [programInput, setProgramInput] = useState('');
  const [programOutput, setProgramOutput] = useState('');
  const [programError, setProgramError] = useState('');
  const [programPreviewHtml, setProgramPreviewHtml] = useState('');
  const [runningCode, setRunningCode] = useState(false);
  const [runningAction, setRunningAction] = useState('');
  const [statusBanner, setStatusBanner] = useState({ kind: 'hidden', message: '' });
  const [judgeCompilerError, setJudgeCompilerError] = useState('');
  const [snippetTestCases, setSnippetTestCases] = useState([]);
  const [judgeResults, setJudgeResults] = useState([]);
  const [earnedScore, setEarnedScore] = useState(0);
  const [mainPage, setMainPage] = useState(1);
  const [popupPage, setPopupPage] = useState(1);
  const [popupSearchQuery, setPopupSearchQuery] = useState('');
  const [isExercisePopupOpen, setIsExercisePopupOpen] = useState(false);

  const username = useMemo(() => resolveUsername(user), [user]);
  const totalJudgeScore = useMemo(() => {
    const detectedTotal = roundJudgeScore(
      snippetTestCases.reduce((sum, testCase) => sum + Number(testCase?.score || 0), 0)
    );
    return detectedTotal > 0 ? detectedTotal : AUTO_JUDGE_TOTAL_SCORE;
  }, [snippetTestCases]);

  const usernameRef = useRef(username);
  const snippetRef = useRef(selectedSnippet);
  const codeRef = useRef(editorCode);
  const languageRef = useRef(editorLanguage);
  const judgeAnimationRunRef = useRef(0);
  const terminalOutputRef = useRef(null);

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
    loadSnippets();
  }, [loadSnippets]);

  useEffect(() => {
    onFullscreenChange(Boolean(selectedSnippet));
  }, [selectedSnippet, onFullscreenChange]);

  useEffect(() => {
    try {
      localStorage.setItem(CODE_EDITOR_THEME_STORAGE_KEY, editorTheme);
    } catch {
      // Ignore localStorage write errors
    }
  }, [editorTheme]);

  useEffect(() => {
    if (!terminalOutputRef.current) return;
    terminalOutputRef.current.scrollTop = terminalOutputRef.current.scrollHeight;
  }, [programOutput, programError, runningCode, runningAction]);

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

  const resetSnippetModalState = () => {
    setIsCreateOpen(false);
    setCreateForm(INITIAL_FORM);
    setEditingSnippet(null);
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

    const basePayload = {
      username,
      cardTitle,
      title: cardTitle,
      subjectName: String(createForm.subjectName || '').trim(),
      assignmentName: String(createForm.assignmentName || '').trim(),
      exerciseName: String(createForm.assignmentName || '').trim(),
      assignmentDescription: String(createForm.assignmentDescription || '').trim(),
      formattedDescription: String(createForm.assignmentDescription || '').trim(),
    };

    const isEditMode = Boolean(editingSnippet);

    setCreating(true);
    try {
      if (isEditMode) {
        const editingSnippetId = getSnippetId(editingSnippet);
        if (!editingSnippetId) {
          toast.error('Không xác định được card cần sửa');
          return;
        }

        const result = await codeSnippetService.updateSnippet(editingSnippetId, basePayload);
        if (!result.success) {
          toast.error(result.message || 'Không thể cập nhật card code');
          return;
        }

        const updatedSnippet = result.snippet || {
          ...editingSnippet,
          ...basePayload,
          updatedAt: new Date().toISOString(),
        };
        const normalizedUpdatedId = getSnippetId(updatedSnippet);

        setSnippets((prev) =>
          prev.map((item) =>
            getSnippetId(item) === editingSnippetId
              ? { ...updatedSnippet, id: normalizedUpdatedId || editingSnippetId }
              : item
          )
        );
        setSelectedSnippet((prev) =>
          prev && getSnippetId(prev) === editingSnippetId
            ? { ...prev, ...updatedSnippet, id: normalizedUpdatedId || editingSnippetId }
            : prev
        );
        toast.success('Đã cập nhật card code');
      } else {
        const payload = {
          ...basePayload,
          language: inferLanguageFromSubject(createForm.subjectName),
          code: '',
        };
        const result = await codeSnippetService.createSnippet(payload);

        if (!result.success) {
          toast.error(result.message || 'Không thể tạo card code');
          return;
        }

        if (result.snippet) {
          setSnippets((prev) => [result.snippet, ...prev]);
        } else {
          await loadSnippets();
        }
        const generatedCaseCount = Number(result?.testCaseGeneration?.count || 0);
        if (generatedCaseCount > 0) {
          toast.success(`Đã tạo card và sinh ${generatedCaseCount} test case tự động`);
        } else {
          toast.success('Đã tạo card code mới');
        }
      }

      resetSnippetModalState();
    } finally {
      setCreating(false);
    }
  };

  const handleFormatAssignmentWithAI = async () => {
    const rawDescription = String(createForm.assignmentDescription || '').trim();
    if (!rawDescription) {
      toast.error('Vui lòng nhập nội dung bài tập trước khi format');
      return;
    }

    setFormattingDescription(true);
    const result = await codeSnippetService.formatAssignmentDescription(rawDescription);
    setFormattingDescription(false);

    if (!result.success) {
      toast.error(result.message || 'Không thể format bằng AI');
      return;
    }

    const formattedText = String(result.formattedText || '').trim();
    if (!formattedText) {
      toast.error('AI không trả về nội dung hợp lệ');
      return;
    }

    setCreateForm((prev) => ({
      ...prev,
      assignmentDescription: formattedText,
    }));
    toast.success('Đã format nội dung bằng AI');
  };

  const handleOpenDetail = useCallback((snippet) => {
    const normalizedTestCases = toSnippetTestCaseList(snippet);
    setSelectedSnippet(snippet);
    setEditorCode(String(snippet.code || ''));
    setEditorLanguage(String(snippet.language || inferLanguageFromSubject(snippet.subjectName)));
    setSnippetTestCases(normalizedTestCases);
    setJudgeResults([]);
    setEarnedScore(0);
    setProgramInput('');
    setProgramOutput('');
    setProgramError('');
    setProgramPreviewHtml('');
    setStatusBanner({ kind: 'hidden', message: '' });
    setJudgeCompilerError('');
    setRunningAction('');
  }, []);

  const handleCloseDetail = async () => {
    judgeAnimationRunRef.current = Date.now();
    setClosingDetail(true);
    await persistDraft({ silent: false });
    setClosingDetail(false);
    setIsExercisePopupOpen(false);
    setSelectedSnippet(null);
    setSnippetTestCases([]);
    setJudgeResults([]);
    setEarnedScore(0);
    setStatusBanner({ kind: 'hidden', message: '' });
    setJudgeCompilerError('');
    setRunningAction('');
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
      judgeAnimationRunRef.current = Date.now();
      setIsExercisePopupOpen(false);
      setSelectedSnippet(null);
      setSnippetTestCases([]);
      setJudgeResults([]);
      setEarnedScore(0);
      setStatusBanner({ kind: 'hidden', message: '' });
      setJudgeCompilerError('');
      setRunningAction('');
    }
    toast.success('Đã xóa card code');
  };

  const handleSelectSnippetFromPopup = useCallback(
    async (snippet) => {
      if (!snippet) return;
      if (runningCode) {
        toast.error('Vui lòng chờ tác vụ chạy/chấm hiện tại hoàn tất');
        return;
      }

      const nextSnippetId = getSnippetId(snippet);
      const currentSnippetId = getSnippetId(selectedSnippet);
      if (currentSnippetId && nextSnippetId && currentSnippetId !== nextSnippetId) {
        const saved = await persistDraft({ silent: true });
        if (!saved) return;
      }

      handleOpenDetail(snippet);
      setPopupPage(1);
      setIsExercisePopupOpen(false);
    },
    [handleOpenDetail, persistDraft, runningCode, selectedSnippet]
  );

  const handleEditSnippet = (snippet) => {
    setEditingSnippet(snippet);
    setCreateForm({
      cardTitle: String(snippet?.cardTitle || ''),
      subjectName: String(snippet?.subjectName || ''),
      assignmentName: String(snippet?.assignmentName || ''),
      assignmentDescription: String(snippet?.assignmentDescription || ''),
    });
    setIsCreateOpen(true);
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

  const runSingleInputMode = useCallback(
    async (source) => {
      if (LOCAL_RUN_LANGUAGES.has(editorLanguage)) {
        const localResult = runLocalLanguage({
          language: editorLanguage,
          code: source,
          input: programInput,
        });
        return {
          success: true,
          output: String(localResult.output || '(Không có output)'),
          previewHtml: String(localResult.previewHtml || ''),
        };
      }

      if (editorLanguage === 'javascript') {
        const remoteResult = await codeSnippetService.runSnippet({
          language: editorLanguage,
          code: source,
          input: String(programInput || ''),
        });

        if (remoteResult?.success) {
          return {
            success: true,
            output: String(remoteResult.output || '(Không có output)'),
            previewHtml: '',
          };
        }

        const remoteError = String(remoteResult?.error || remoteResult?.message || '').trim();
        const canFallbackToLocalWorker = /lỗi kết nối server/i.test(remoteError);
        if (!canFallbackToLocalWorker) {
          return {
            success: false,
            error: remoteError || 'Lỗi chạy code',
            errorType: String(remoteResult?.errorType || ''),
          };
        }

        const jsOutput = await runJavaScriptInWorker({
          code: source,
          input: String(programInput || ''),
        });
        return {
          success: true,
          output: jsOutput,
          previewHtml: '',
        };
      }

      if (!REMOTE_RUN_LANGUAGES.has(editorLanguage)) {
        return {
          success: false,
          error: 'Ngôn ngữ này hiện chưa hỗ trợ chạy.',
        };
      }

      const result = await codeSnippetService.runSnippet({
        language: editorLanguage,
        code: source,
        input: String(programInput || ''),
      });
      if (!result?.success) {
        return {
          success: false,
          error: String(result?.error || result?.message || 'Lỗi chạy code'),
          errorType: String(result?.errorType || ''),
        };
      }

      return {
        success: true,
        output: String(result.output || '(Không có output)'),
        previewHtml: String(result.previewHtml || ''),
      };
    },
    [editorLanguage, programInput]
  );

  const handleRunCode = useCallback(async () => {
    if (runningCode) return;

    const source = String(editorCode || '');
    if (!source.trim()) {
      toast.error('Vui lòng nhập code trước khi chạy');
      return;
    }

    if (LOCAL_RUN_LANGUAGES.has(editorLanguage) && editorLanguage !== 'plaintext') {
      const issues = collectCodeIssues(source, editorLanguage);
      if (issues.length > 0) {
        setProgramError(issues.join('\n'));
        setProgramOutput('');
        setProgramPreviewHtml('');
        setStatusBanner({ kind: 'hidden', message: '' });
        toast.error('Code đang có lỗi cú pháp');
        return;
      }
    }

    setRunningCode(true);
    setRunningAction('run');
    setProgramError('');
    setProgramPreviewHtml('');
    setJudgeCompilerError('');

    try {
      const runResult = await runSingleInputMode(source);
      if (!runResult?.success) {
        const message = String(runResult?.error || 'Lỗi chạy code');
        setProgramError(message);
        setProgramOutput('');
        setProgramPreviewHtml('');
        setStatusBanner({ kind: 'hidden', message: '' });
        toast.error('Chạy code thất bại');
        return;
      }

      const outputText = String(runResult.output || '(Không có output)');
      const hasOutput =
        Boolean(String(runResult.output || '').trim()) &&
        String(runResult.output || '').trim() !== '(Không có output)';
      setProgramOutput(outputText);
      setProgramPreviewHtml(String(runResult.previewHtml || ''));
      setStatusBanner(
        hasOutput
          ? { kind: 'run-output', message: 'Có kết quả output' }
          : { kind: 'hidden', message: '' }
      );
      toast.success('Chạy code thành công');
    } catch (error) {
      const message = String(error?.message || 'Lỗi runtime');
      setProgramError(message);
      setProgramOutput('');
      setProgramPreviewHtml('');
      setStatusBanner({ kind: 'hidden', message: '' });
      toast.error('Chạy code thất bại');
    } finally {
      setRunningCode(false);
      setRunningAction('');
    }
  }, [editorCode, editorLanguage, runSingleInputMode, runningCode]);

  const handleJudge = useCallback(async () => {
    if (runningCode) return;

    const source = String(editorCode || '');
    if (!source.trim()) {
      toast.error('Vui lòng nhập code trước khi chấm bài');
      return;
    }

    const normalizedTestCases = Array.isArray(snippetTestCases) ? snippetTestCases : [];
    if (normalizedTestCases.length === 0) {
      toast.error('Bài này chưa có test case để chấm');
      return;
    }

    if (!REMOTE_RUN_LANGUAGES.has(editorLanguage)) {
      const unsupportedMessage = 'Ngôn ngữ này chưa hỗ trợ chấm bài qua Wandbox.';
      setProgramError(unsupportedMessage);
      setProgramOutput('');
      setStatusBanner({ kind: 'hidden', message: '' });
      toast.error(unsupportedMessage);
      return;
    }

    const runToken = Date.now();
    judgeAnimationRunRef.current = runToken;
    setRunningCode(true);
    setRunningAction('judge');
    setProgramError('');
    setProgramPreviewHtml('');
    setProgramOutput('');
    setJudgeCompilerError('');
    setEarnedScore(0);
    setJudgeResults(buildPendingJudgeResults(normalizedTestCases));
    setStatusBanner({
      kind: 'judging',
      message: `Đang chấm ${normalizedTestCases.length} test cases...`,
    });

    try {
      const rawResults = await Promise.all(
        normalizedTestCases.map(async (testCase, index) => {
          const startedAt = performance.now();
          try {
            const result = await codeSnippetService.runSnippet({
              language: editorLanguage,
              code: source,
              input: String(testCase.input || ''),
            });
            const executionTimeMs = Math.max(0, performance.now() - startedAt);
            const gotOutput = String(result?.output || '').replace(/\r\n/g, '\n');

            if (!result?.success) {
              const errorMessage = String(
                result?.error || result?.message || 'Không thể chạy test case'
              ).trim();
              if (isCompilerErrorResult(result)) {
                return {
                  ...testCase,
                  index,
                  status: 'compiler_error',
                  gotOutput: '',
                  errorMessage: errorMessage || 'Compiler Error',
                  executionTimeMs,
                };
              }
              if (
                String(result?.errorType || '').toLowerCase() === 'time_limit' ||
                isTimeLimitError(errorMessage)
              ) {
                return {
                  ...testCase,
                  index,
                  status: 'tle',
                  gotOutput,
                  errorMessage: errorMessage || 'Time Limit Exceeded',
                  executionTimeMs,
                };
              }

              return {
                ...testCase,
                index,
                status: 'failed',
                gotOutput,
                errorMessage: errorMessage || 'Runtime Error',
                executionTimeMs,
              };
            }

            const passed = isExpectedOutputMatched(gotOutput, testCase.expectedOutput);
            return {
              ...testCase,
              index,
              status: passed ? 'passed' : 'failed',
              gotOutput,
              errorMessage: passed ? '' : 'Wrong Answer',
              executionTimeMs,
            };
          } catch (error) {
            const executionTimeMs = Math.max(0, performance.now() - startedAt);
            const errorMessage = String(error?.message || 'Runtime Error');
            return {
              ...testCase,
              index,
              status: isTimeLimitError(errorMessage) ? 'tle' : 'failed',
              gotOutput: '',
              errorMessage,
              executionTimeMs,
            };
          }
        })
      );

      if (judgeAnimationRunRef.current !== runToken) return;

      const compilerErrorCase = rawResults.find((item) => item.status === 'compiler_error');
      if (compilerErrorCase) {
        setJudgeResults([]);
        setEarnedScore(0);
        setJudgeCompilerError(String(compilerErrorCase.errorMessage || 'Compiler Error'));
        setStatusBanner({ kind: 'hidden', message: '' });
        setProgramOutput('');
        toast.error('Code bị lỗi biên dịch, không thể chấm test case');
        return;
      }

      let nextEarnedScore = 0;
      await wait(AUTO_JUDGE_REVEAL_INITIAL_MS);

      for (let index = 0; index < rawResults.length; index += 1) {
        if (judgeAnimationRunRef.current !== runToken) return;

        const caseResult = rawResults[index];
        setJudgeResults((prev) => {
          const next = [...prev];
          next[index] = caseResult;
          return next;
        });

        if (caseResult.status === 'passed') {
          nextEarnedScore = roundJudgeScore(nextEarnedScore + Number(caseResult.score || 0));
          setEarnedScore(nextEarnedScore);
        }

        await wait(AUTO_JUDGE_REVEAL_STEP_MS);
      }

      const scoreMessage = `${formatJudgeScore(nextEarnedScore)}/${formatJudgeScore(totalJudgeScore)}`;
      setStatusBanner({ kind: 'judged', message: scoreMessage });
      setProgramOutput(`Tổng điểm: ${scoreMessage}`);
      toast.success('Đã chấm xong toàn bộ test case');
    } catch (error) {
      const message = String(error?.message || 'Lỗi runtime');
      setProgramError(message);
      setProgramOutput('');
      setProgramPreviewHtml('');
      setStatusBanner({ kind: 'hidden', message: '' });
      toast.error('Chấm bài thất bại');
    } finally {
      setRunningCode(false);
      setRunningAction('');
    }
  }, [editorCode, editorLanguage, snippetTestCases, totalJudgeScore, runningCode]);

  const handleClearConsole = useCallback(() => {
    judgeAnimationRunRef.current = Date.now();
    setProgramOutput('');
    setProgramError('');
    setProgramPreviewHtml('');
    setStatusBanner({ kind: 'hidden', message: '' });
    setJudgeCompilerError('');
  }, []);

  useEffect(() => {
    if (!selectedSnippet) return undefined;

    const handleEditorShortcuts = (event) => {
      if (event.key !== 'Enter' || !event.ctrlKey) return;
      if (runningCode) return;
      event.preventDefault();
      if (event.shiftKey) {
        void handleJudge();
        return;
      }
      void handleRunCode();
    };

    window.addEventListener('keydown', handleEditorShortcuts);
    return () => window.removeEventListener('keydown', handleEditorShortcuts);
  }, [handleJudge, handleRunCode, runningCode, selectedSnippet]);

  const filteredSnippets = useMemo(() => {
    const keyword = String(searchQuery || '').trim().toLowerCase();
    if (!keyword) return snippets;

    return snippets.filter((snippet) => {
      const cardTitle = String(snippet.cardTitle || snippet.title || '').toLowerCase();
      const subjectName = String(snippet.subjectName || '').toLowerCase();
      const assignmentName = String(snippet.assignmentName || snippet.exerciseName || '').toLowerCase();

      return (
        cardTitle.includes(keyword) ||
        subjectName.includes(keyword) ||
        assignmentName.includes(keyword)
      );
    });
  }, [snippets, searchQuery]);

  const popupFilteredSnippets = useMemo(() => {
    const keyword = String(popupSearchQuery || '').trim().toLowerCase();
    if (!keyword) return snippets;

    return snippets.filter((snippet) => {
      const cardTitle = String(snippet.cardTitle || snippet.title || '').toLowerCase();
      const subjectName = String(snippet.subjectName || '').toLowerCase();
      const assignmentName = String(snippet.assignmentName || snippet.exerciseName || '').toLowerCase();

      return (
        cardTitle.includes(keyword) ||
        subjectName.includes(keyword) ||
        assignmentName.includes(keyword)
      );
    });
  }, [popupSearchQuery, snippets]);

  const mainTotalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredSnippets.length / MAIN_PAGE_SIZE)),
    [filteredSnippets.length]
  );
  const popupTotalPages = useMemo(
    () => Math.max(1, Math.ceil(popupFilteredSnippets.length / POPUP_PAGE_SIZE)),
    [popupFilteredSnippets.length]
  );

  const paginatedSnippets = useMemo(() => {
    const start = (mainPage - 1) * MAIN_PAGE_SIZE;
    return filteredSnippets.slice(start, start + MAIN_PAGE_SIZE);
  }, [filteredSnippets, mainPage]);

  const paginatedPopupSnippets = useMemo(() => {
    const start = (popupPage - 1) * POPUP_PAGE_SIZE;
    return popupFilteredSnippets.slice(start, start + POPUP_PAGE_SIZE);
  }, [popupFilteredSnippets, popupPage]);

  const isDetailView = Boolean(selectedSnippet);
  const showMainPagination = filteredSnippets.length > MAIN_PAGE_SIZE;

  const handlePageChange = useCallback(
    (nextPage, target = 'main') => {
      const totalPages = target === 'popup' ? popupTotalPages : mainTotalPages;
      const normalizedPage = Number(nextPage);
      const safePage = Math.min(
        totalPages,
        Math.max(1, Number.isFinite(normalizedPage) ? Math.floor(normalizedPage) : 1)
      );

      if (target === 'popup') {
        setPopupPage(safePage);
        return;
      }
      setMainPage(safePage);
    },
    [mainTotalPages, popupTotalPages]
  );

  useEffect(() => {
    setMainPage(1);
  }, [searchQuery]);

  useEffect(() => {
    setPopupPage(1);
  }, [popupSearchQuery]);

  useEffect(() => {
    setMainPage((prev) => Math.min(prev, mainTotalPages));
  }, [mainTotalPages]);

  useEffect(() => {
    setPopupPage((prev) => Math.min(prev, popupTotalPages));
  }, [popupTotalPages]);

  useEffect(() => {
    if (!isExercisePopupOpen) {
      setPopupSearchQuery('');
      setPopupPage(1);
    }
  }, [isExercisePopupOpen]);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-wrap items-center gap-2">
          <div className="mr-auto flex items-center gap-2 text-lg font-black text-gray-900 dark:text-white">
            <FileCode2 size={20} className="text-blue-600" />
            Kho Code
          </div>
          <button
            onClick={() => {
              setEditingSnippet(null);
              setCreateForm(INITIAL_FORM);
              setIsCreateOpen(true);
            }}
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

      {!loading && username && !isDetailView && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Tìm theo tên card, môn học hoặc tên bài tập..."
              className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
      )}

      {!loading && username && !isDetailView && snippets.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-800">
          Chưa có card code nào. Hãy bấm "Thêm code" để bắt đầu.
        </div>
      )}

      {!loading && username && !isDetailView && snippets.length > 0 && filteredSnippets.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-800">
          Không tìm thấy card phù hợp với từ khóa "{searchQuery}".
        </div>
      )}

      {!loading && username && !isDetailView && filteredSnippets.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {paginatedSnippets.map((snippet) => {
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
                      <p className="mt-1 truncate text-sm font-semibold text-gray-800 dark:text-gray-100">
                        {snippet.assignmentName || 'Chưa có tên bài tập'}
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm text-gray-600 dark:text-gray-300">
                        {snippet.assignmentDescription || 'Chưa có mô tả bài tập'}
                      </p>
                    </div>
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEditSnippet(snippet)}
                      className="rounded-lg p-1.5 text-gray-400 transition hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20"
                      title="Sửa card code"
                      aria-label="Sửa card code"
                    >
                      <Pencil size={15} />
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

      {!loading && username && !isDetailView && showMainPagination && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            Trang {mainPage}/{mainTotalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(mainPage - 1, 'main')}
              disabled={mainPage <= 1}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              Trang trước
            </button>
            <button
              onClick={() => handlePageChange(mainPage + 1, 'main')}
              disabled={mainPage >= mainTotalPages}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              Trang sau
            </button>
          </div>
        </div>
      )}

      <CreateSnippetModal
        isOpen={isCreateOpen}
        form={createForm}
        onChange={handleCreateFormChange}
        mode={editingSnippet ? 'edit' : 'create'}
        formattingDescription={formattingDescription}
        onFormatWithAI={handleFormatAssignmentWithAI}
        onClose={resetSnippetModalState}
        onCreate={handleCreateSnippet}
        creating={creating}
      />

      <ExercisePopup
        isOpen={isDetailView && isExercisePopupOpen}
        searchQuery={popupSearchQuery}
        onSearchChange={setPopupSearchQuery}
        snippets={paginatedPopupSnippets}
        selectedSnippetId={getSnippetId(selectedSnippet)}
        currentPage={popupPage}
        totalPages={popupFilteredSnippets.length > 0 ? popupTotalPages : 0}
        totalItems={popupFilteredSnippets.length}
        onPageChange={(nextPage) => handlePageChange(nextPage, 'popup')}
        onSelectSnippet={(snippet) => {
          void handleSelectSnippetFromPopup(snippet);
        }}
        onClose={() => setIsExercisePopupOpen(false)}
      />

      {selectedSnippet && (
        <div className="w-full bg-white pb-6 dark:bg-gray-900">
          <div className="flex min-h-0 flex-col">
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
                <div className="relative group">
                  <select
                    value={editorLanguage}
                    onChange={(event) => setEditorLanguage(event.target.value)}
                    className="h-10 cursor-pointer appearance-none rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-10 text-sm font-semibold text-gray-700 shadow-sm outline-none transition-all duration-200 hover:border-blue-300 hover:bg-blue-50/50 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-blue-500 dark:hover:bg-gray-700 dark:focus:border-blue-400 dark:focus:ring-blue-900/30"
                    title="Chọn ngôn ngữ highlight"
                  >
                    {LANGUAGE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value} className="bg-white py-2 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <FileCode2 size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 transition-colors duration-200 group-hover:text-blue-600 dark:text-gray-400 dark:group-hover:text-blue-400" />
                  <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors duration-200 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300" />
                </div>

                <button
                  onClick={() => setIsExercisePopupOpen(true)}
                  className="inline-flex h-10 items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:border-blue-300 hover:bg-blue-50/60 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-blue-500 dark:hover:bg-gray-700"
                >
                  <FileCode2 size={15} />
                  Danh sách bài tập
                </button>

                <div className="relative group">
                  <select
                    value={editorTheme}
                    onChange={(event) => setEditorTheme(event.target.value)}
                    className="h-10 cursor-pointer appearance-none rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-10 text-sm font-semibold text-gray-700 shadow-sm outline-none transition-all duration-200 hover:border-purple-300 hover:bg-purple-50/50 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-purple-500 dark:hover:bg-gray-700 dark:focus:border-purple-400 dark:focus:ring-purple-900/30"
                    title="Chọn theme editor"
                  >
                    {CODE_EDITOR_THEME_OPTIONS.map((theme) => (
                      <option key={theme.key} value={theme.key} className="bg-white py-2 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                        {theme.label}
                      </option>
                    ))}
                  </select>
                  <Palette size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 transition-colors duration-200 group-hover:text-purple-600 dark:text-gray-400 dark:group-hover:text-purple-400" />
                  <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors duration-200 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300" />
                </div>

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
                  {selectedSnippet.assignmentName || selectedSnippet.exerciseName || selectedSnippet.cardTitle || selectedSnippet.title || 'Chưa cập nhật'}
                </p>
              </div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Nội dung bài tập
                </p>
                <div className="prose prose-sm mt-2 max-w-none dark:prose-invert">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                    components={{
                      table: (props) => (
                        <div className="my-4 overflow-x-auto rounded-lg border border-gray-300 shadow-sm dark:border-gray-600">
                          <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-600" {...props} />
                        </div>
                      ),
                      thead: (props) => (
                        <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:bg-gradient-to-r dark:from-gray-700 dark:to-gray-700/80" {...props} />
                      ),
                      th: (props) => (
                        <th
                          className="border-b-2 border-blue-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-blue-700 dark:border-gray-600 dark:text-blue-300"
                          {...props}
                        />
                      ),
                      tbody: (props) => (
                        <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800" {...props} />
                      ),
                      tr: (props) => (
                        <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50" {...props} />
                      ),
                      td: (props) => (
                        <td className="whitespace-pre-wrap px-4 py-3 text-sm text-gray-700 dark:text-gray-200" {...props} />
                      ),
                    }}
                  >
                    {selectedSnippet.assignmentDescription || selectedSnippet.formattedDescription || 'Chưa có mô tả'}
                  </ReactMarkdown>
                </div>
              </div>
            </div>

            <div className="px-4 pt-3">
              {statusBanner.kind !== 'hidden' && statusBanner.kind !== 'judged' && (
                <div
                  className={`rounded-2xl border px-4 py-3 text-sm font-semibold shadow-sm ${
                    statusBanner.kind === 'run-output'
                      ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/70 dark:bg-blue-900/20 dark:text-blue-300'
                      : statusBanner.kind === 'judging'
                        ? 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700/80 dark:bg-slate-800/40 dark:text-slate-200'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/70 dark:bg-emerald-900/20 dark:text-emerald-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {statusBanner.kind === 'judging' && (
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-400 border-t-transparent dark:border-slate-300 dark:border-t-transparent" />
                    )}
                    {statusBanner.kind === 'run-output' && <span>Có kết quả output</span>}
                    {statusBanner.kind === 'judging' && <span>{statusBanner.message || 'Đang chấm bài...'}</span>}
                  </div>
                </div>
              )}

              {runningAction === 'judge' && (
                <div className="mt-3 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-cyan-50 to-sky-50 p-4 shadow-sm dark:border-emerald-700/60 dark:from-emerald-900/20 dark:via-cyan-900/20 dark:to-sky-900/20">
                  <div className="animate-pulse">
                    <div className="h-3 w-28 rounded bg-emerald-200/90 dark:bg-emerald-700/70" />
                    <div className="mt-2 h-6 w-24 rounded bg-emerald-200/90 dark:bg-emerald-700/70" />
                    <div className="mt-3 h-2.5 rounded-full bg-emerald-200/80 dark:bg-emerald-700/60" />
                  </div>
                </div>
              )}
            </div>

            <div className="grid gap-3 p-4 xl:h-[75vh] xl:min-h-[75vh] xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="h-[62vh] min-h-[420px] overflow-hidden rounded-2xl border border-gray-200 shadow-sm dark:border-gray-700 xl:h-full xl:min-h-0">
                <MonacoCodeEditor
                  language={editorLanguage}
                  themeKey={editorTheme}
                  value={editorCode}
                  onChange={setEditorCode}
                />
              </div>

              <div className="flex min-h-0 flex-col gap-3 xl:h-full">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRunCode}
                    disabled={runningCode}
                    className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    title="Chạy code"
                  >
                    <Play size={16} />
                    {runningAction === 'run' ? 'Đang chạy...' : 'Run'}
                  </button>

                  <button
                    onClick={handleJudge}
                    disabled={runningCode}
                    className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    title="Chấm bài"
                  >
                    <Sparkles size={16} />
                    {runningAction === 'judge' ? 'Đang chấm...' : 'Chấm bài'}
                  </button>

                  <button
                    onClick={handleClearConsole}
                    className="inline-flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    <RotateCcw size={16} />
                    Xóa output
                  </button>
                </div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Ctrl + Enter: Run | Ctrl + Shift + Enter: Chấm bài
                </p>

                {(() => {
                  const terminalTheme = getCodeEditorThemeConfig(editorTheme).terminal;
                  return (
                    <>
                      <div
                        className="overflow-hidden rounded-2xl border shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-colors duration-300"
                        style={{
                          backgroundColor: terminalTheme.panelBackground,
                          borderColor: terminalTheme.border,
                        }}
                      >
                        <div
                          className="border-b px-3 py-2 text-xs font-bold uppercase tracking-wide transition-colors duration-300"
                          style={{
                            backgroundColor: terminalTheme.headerBackground,
                            borderColor: terminalTheme.border,
                            color: terminalTheme.mutedText,
                          }}
                        >
                          Input
                        </div>
                        <textarea
                          value={programInput}
                          onChange={(event) => setProgramInput(event.target.value)}
                          spellCheck={false}
                          placeholder="Nhập input, mỗi dòng là 1 giá trị..."
                          className="h-36 w-full resize-none p-3 font-mono text-sm leading-6 outline-none transition-colors duration-300 placeholder:opacity-50 xl:h-[220px]"
                          style={{
                            backgroundColor: terminalTheme.bodyBackground,
                            color: terminalTheme.text,
                          }}
                        />
                      </div>

                      <div
                        className="overflow-hidden rounded-2xl border shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-colors duration-300"
                        style={{
                          backgroundColor: terminalTheme.panelBackground,
                          borderColor: terminalTheme.border,
                        }}
                      >
                        <div
                          className="border-b px-3 py-2 text-xs font-bold uppercase tracking-wide transition-colors duration-300"
                          style={{
                            backgroundColor: terminalTheme.headerBackground,
                            borderColor: terminalTheme.border,
                            color: terminalTheme.mutedText,
                          }}
                        >
                          Output
                        </div>
                        {runningCode ? (
                          <div
                            className="h-36 space-y-2 p-3 xl:h-[190px]"
                            style={{ backgroundColor: terminalTheme.bodyBackground }}
                          >
                            <div
                              className="h-4 w-full animate-pulse rounded"
                              style={{ backgroundColor: terminalTheme.border }}
                            />
                            <div
                              className="h-4 w-11/12 animate-pulse rounded"
                              style={{ backgroundColor: terminalTheme.border }}
                            />
                            <div
                              className="h-4 w-9/12 animate-pulse rounded"
                              style={{ backgroundColor: terminalTheme.border }}
                            />
                          </div>
                        ) : (
                          <pre
                            ref={terminalOutputRef}
                            className="h-36 overflow-auto whitespace-pre-wrap p-3 font-mono text-sm leading-6 transition-colors duration-300 xl:h-[190px]"
                            style={{
                              color: terminalTheme.text,
                              backgroundColor: terminalTheme.bodyBackground,
                            }}
                          >
                            {programOutput || '(Chưa có output)'}
                          </pre>
                        )}
                        {programPreviewHtml && (
                          <div
                            className="border-t p-2 transition-colors duration-300"
                            style={{ borderColor: terminalTheme.border }}
                          >
                            <iframe
                              title="Code preview"
                              sandbox="allow-scripts"
                              srcDoc={programPreviewHtml}
                              className="h-44 w-full rounded-lg border"
                              style={{ 
                                borderColor: terminalTheme.border,
                                backgroundColor: '#ffffff'
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {judgeCompilerError && (
              <div className="mx-4 mb-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 shadow-sm dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300">
                <p className="text-sm font-black">Lỗi biên dịch (compiler_error)</p>
                <pre className="mt-2 whitespace-pre-wrap font-mono text-xs">
                  {judgeCompilerError}
                </pre>
              </div>
            )}

            {!judgeCompilerError && (
              <div className="mx-4 mb-3 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-700/90 dark:bg-slate-900/50">
                <div className="border-b border-slate-200/90 bg-slate-50/80 px-4 py-3 dark:border-slate-700/90 dark:bg-slate-900/70">
                  <p className="text-sm font-black text-slate-800 dark:text-slate-100">Kết quả test case</p>
                  <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                    Trạng thái sẽ mở dần sau khi nhận đủ kết quả từ Promise.all.
                  </p>
                </div>
                <div className="space-y-3 p-4">
                  {judgeResults.length === 0 && (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-5 text-sm font-medium text-slate-500 dark:border-slate-600 dark:bg-slate-800/40 dark:text-slate-400">
                      Nhấn Chấm bài để chạy toàn bộ test case.
                    </div>
                  )}

                  {judgeResults.map((item, index) => {
                    const isPassed = item.status === 'passed';
                    const isFailed = item.status === 'failed';
                    const isTle = item.status === 'tle';
                    const isPending = item.status === 'pending';

                    return (
                      <div
                        key={`${index}-${item.input}-${item.expectedOutput}`}
                        className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-700 dark:bg-slate-800/40"
                      >
                        <div className="flex items-start gap-2">
                          <AutoJudgeStatusIcon status={item.status} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                              {isPending && `Test ${index + 1}: Đang chờ...`}
                              {isPassed && `Test ${index + 1}: ${formatExecutionTime(item.executionTimeMs)}`}
                              {isTle && `Test ${index + 1}: Time Limit Exceeded`}
                              {isFailed && `Test ${index + 1}: Wrong Answer`}
                            </p>
                          </div>
                        </div>

                        {isFailed && (
                          <div className="mt-3 grid gap-2 lg:grid-cols-2">
                            <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-2 dark:border-emerald-800/60 dark:bg-emerald-900/20">
                              <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                                Expected
                              </p>
                              <pre className="mt-1 whitespace-pre-wrap font-mono text-xs text-emerald-900 dark:text-emerald-100">
                                {item.expectedOutput || '(trống)'}
                              </pre>
                            </div>
                            <div className="rounded-lg border border-rose-200 bg-rose-50/70 p-2 dark:border-rose-800/60 dark:bg-rose-900/20">
                              <p className="text-[11px] font-bold uppercase tracking-wide text-rose-700 dark:text-rose-300">
                                Got
                              </p>
                              <pre className="mt-1 whitespace-pre-wrap font-mono text-xs text-rose-900 dark:text-rose-100">
                                {item.gotOutput || '(trống)'}
                              </pre>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="px-4 pb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
              Hỗ trợ chạy: Plain Text, C++, JavaScript, TypeScript, Python, Java, HTML, CSS, SQL, JSON.
            </div>

            {programError && (
              <div className="mx-4 mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300">
                <p className="mb-1 font-bold">Lỗi:</p>
                <pre className="whitespace-pre-wrap font-mono text-xs">{programError}</pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CodeSnippetManager;
