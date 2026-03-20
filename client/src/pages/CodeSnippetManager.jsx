import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import Editor from '@monaco-editor/react';
import { useLocation, useNavigate } from 'react-router-dom';
import Tooltip from "../components/Tooltip";
import { usePersistedPagination } from '../hooks/usePersistedPagination';
import HtmlPreviewer from '../components/HtmlPreviewer';
import {
  CalendarDays,
  ChevronLeft,
  ChevronDown,
  Copy,
  Download,
  Eraser,
  FileCode2,
  Link2,
  Palette,
  Play,
  Pencil,
  Plus,
  RotateCcw,
  Save,
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
  language: 'cpp',
};

const getSnippetId = (snippet) => String(snippet?.id || snippet?._id || '');

const LANGUAGE_OPTIONS = [
  { value: 'plaintext', label: 'Plain Text' },
  { value: 'cpp', label: 'C++' },
  { value: 'c', label: 'C' },
  { value: 'csharp', label: 'C#' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'rust', label: 'Rust' },
  { value: 'go', label: 'Golang' },
  { value: 'swift', label: 'Swift' },
];

const LANGUAGE_FALLBACK_ICON = '/img/code-languages/plaintext.png';

const LANGUAGE_ALIAS_MAP = {
  'c++': 'cpp',
  cxx: 'cpp',
  js: 'javascript',
  ts: 'typescript',
  'c#': 'csharp',
  golang: 'go',
};

const LEGACY_LANGUAGE_REMAP = {
  javascript: 'c',
  typescript: 'csharp',
  html: 'ruby',
  css: 'rust',
  sql: 'go',
  json: 'swift',
};

const normalizeLanguageKey = (language) => {
  const raw = String(language || '').trim().toLowerCase();
  const aliased = LANGUAGE_ALIAS_MAP[raw] || raw;
  return LEGACY_LANGUAGE_REMAP[aliased] || aliased || 'plaintext';
};

const LANGUAGE_META = {
  cpp: {
    label: 'C++',
    icon: '/img/code-languages/cpp.png',
    brandClassName: 'text-blue-700 dark:text-blue-300',
  },
  c: {
    label: 'C',
    icon: '/img/code-languages/c.png',
    brandClassName: 'text-sky-700 dark:text-sky-300',
  },
  csharp: {
    label: 'C#',
    icon: '/img/code-languages/csharp.png',
    brandClassName: 'text-purple-700 dark:text-purple-300',
  },
  python: {
    label: 'Python',
    icon: '/img/code-languages/python.png',
    brandClassName: 'text-amber-600 dark:text-amber-300',
  },
  java: {
    label: 'Java',
    icon: '/img/code-languages/java.png',
    brandClassName: 'text-red-700 dark:text-red-300',
  },
  ruby: {
    label: 'Ruby',
    icon: '/img/code-languages/ruby.png',
    brandClassName: 'text-rose-700 dark:text-rose-300',
  },
  rust: {
    label: 'Rust',
    icon: '/img/code-languages/rust.png',
    brandClassName: 'text-orange-700 dark:text-orange-300',
  },
  go: {
    label: 'Golang',
    icon: '/img/code-languages/go.png',
    brandClassName: 'text-cyan-700 dark:text-cyan-300',
  },
  swift: {
    label: 'Swift',
    icon: '/img/code-languages/swift.png',
    brandClassName: 'text-pink-700 dark:text-pink-300',
  },
  plaintext: {
    label: 'Plain Text',
    icon: '/img/code-languages/plaintext.png',
    brandClassName: 'text-slate-600 dark:text-slate-300',
  },
};

const getLanguageMeta = (language) => {
  const normalized = normalizeLanguageKey(language);
  const meta = LANGUAGE_META[normalized] || LANGUAGE_META.plaintext;
  return {
    key: normalized,
    label: meta.label,
    icon: meta.icon || LANGUAGE_FALLBACK_ICON,
    brandClassName: meta.brandClassName || LANGUAGE_META.plaintext.brandClassName,
  };
};

const MAIN_PAGE_SIZE = 9;
const POPUP_PAGE_SIZE = 6;
const CODE_DRAFT_STORAGE_PREFIX = 'whalio.code-vault.draft';
const LOCAL_DRAFT_AUTOSAVE_INTERVAL_MS = 5000;
const FREE_SESSION_STORAGE_PREFIX = 'whalio.code-vault.free-session';
const FREE_SESSION_ID = '__free-session__';
const FREE_SESSION_DEFAULT_LANGUAGE = 'cpp';
const FREE_SESSION_SHARE_QUERY = 'share';
const FREE_SESSION_TEMPLATE_CPP = `#include <iostream>
using namespace std;

int main() {
  ios::sync_with_stdio(false);
  cin.tie(nullptr);

  // Write your code here.

  return 0;
}
`;

const buildFreeSessionTitle = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Bản nháp';
  const datePart = date.toLocaleDateString('vi-VN');
  const timePart = date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `Bản nháp ${datePart} - ${timePart}`;
};

const buildFreeSessionStorageKey = (username) => {
  const normalizedUsername = String(username || '').trim().toLowerCase() || 'guest';
  return `${FREE_SESSION_STORAGE_PREFIX}.${normalizedUsername}`;
};

const readFreeSessionDraft = (username) => {
  try {
    const key = buildFreeSessionStorageKey(username);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      title: String(parsed?.title || ''),
      code: String(parsed?.code || ''),
      language: String(parsed?.language || FREE_SESSION_DEFAULT_LANGUAGE),
      updatedAt: String(parsed?.updatedAt || ''),
    };
  } catch {
    return null;
  }
};

const writeFreeSessionDraft = ({ username, title, code, language }) => {
  try {
    const key = buildFreeSessionStorageKey(username);
    localStorage.setItem(
      key,
      JSON.stringify({
        title: String(title || ''),
        code: String(code || ''),
        language: String(language || FREE_SESSION_DEFAULT_LANGUAGE),
        updatedAt: new Date().toISOString(),
      })
    );
    return true;
  } catch {
    return false;
  }
};

const removeFreeSessionDraft = (username) => {
  try {
    const key = buildFreeSessionStorageKey(username);
    localStorage.removeItem(key);
  } catch {
    // Ignore localStorage errors
  }
};

const encodeFreeSessionSharePayload = (payload) => {
  try {
    const json = JSON.stringify(payload || {});
    return window.btoa(unescape(encodeURIComponent(json)));
  } catch {
    return '';
  }
};

const decodeFreeSessionSharePayload = (encodedValue) => {
  try {
    const decodedJson = decodeURIComponent(escape(window.atob(String(encodedValue || ''))));
    const parsed = JSON.parse(decodedJson);
    return {
      title: String(parsed?.title || ''),
      code: String(parsed?.code || ''),
      language: String(parsed?.language || FREE_SESSION_DEFAULT_LANGUAGE),
    };
  } catch {
    return null;
  }
};

const buildFreeSessionSnippet = ({ title, code, language }) => ({
  id: FREE_SESSION_ID,
  _id: FREE_SESSION_ID,
  cardTitle: String(title || buildFreeSessionTitle()),
  title: String(title || buildFreeSessionTitle()),
  subjectName: '',
  assignmentName: '',
  assignmentDescription: '',
  formattedDescription: '',
  code: String(code || FREE_SESSION_TEMPLATE_CPP),
  language: String(language || FREE_SESSION_DEFAULT_LANGUAGE),
  createdAt: new Date().toISOString(),
  isFreeMode: true,
});

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

const formatDateTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'không rõ thời gian';
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

const buildLocalDraftStorageKey = (username, snippetId) => {
  const normalizedUsername = String(username || '').trim().toLowerCase();
  const normalizedSnippetId = String(snippetId || '').trim();
  if (!normalizedUsername || !normalizedSnippetId) return '';
  return `${CODE_DRAFT_STORAGE_PREFIX}.${normalizedUsername}.${normalizedSnippetId}`;
};

const readLocalDraft = (username, snippetId) => {
  try {
    const key = buildLocalDraftStorageKey(username, snippetId);
    if (!key) return null;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      code: String(parsed?.code || ''),
      language: String(parsed?.language || 'plaintext'),
      updatedAt: String(parsed?.updatedAt || ''),
    };
  } catch {
    return null;
  }
};

const writeLocalDraft = ({ username, snippetId, code, language }) => {
  try {
    const key = buildLocalDraftStorageKey(username, snippetId);
    if (!key) return false;
    localStorage.setItem(
      key,
      JSON.stringify({
        code: String(code || ''),
        language: String(language || 'plaintext'),
        updatedAt: new Date().toISOString(),
      })
    );
    return true;
  } catch {
    return false;
  }
};

const removeLocalDraft = (username, snippetId) => {
  try {
    const key = buildLocalDraftStorageKey(username, snippetId);
    if (!key) return;
    localStorage.removeItem(key);
  } catch {
    // Ignore localStorage errors
  }
};

const inferLanguageFromSubject = (subjectName = '') => {
  const text = String(subjectName || '').toLowerCase();

  if (text.includes('c++') || text.includes('cpp')) return 'cpp';
  if (text === 'c' || text.includes(' ngôn ngữ c') || text.includes('lap trinh c') || text.includes('lập trình c')) return 'c';
  if (text.includes('c#') || text.includes('csharp')) return 'csharp';
  if (text.includes('python')) return 'python';
  if (text.includes('java')) return 'java';
  if (text.includes('ruby')) return 'ruby';
  if (text.includes('rust')) return 'rust';
  if (text.includes('golang') || text.includes('go lang') || /^go$/i.test(text.trim())) return 'go';
  if (text.includes('swift')) return 'swift';

  // Backward compatibility với dữ liệu cũ
  if (text.includes('javascript') || text.includes('js')) return 'c';
  if (text.includes('typescript') || text.includes('ts')) return 'csharp';
  if (text.includes('html')) return 'ruby';
  if (text.includes('css')) return 'rust';
  if (text.includes('sql')) return 'go';
  if (text.includes('json')) return 'swift';
  if (text.includes('web')) return 'c';

  return 'plaintext';
};

const getExtension = (language = 'plaintext') => {
  const map = {
    cpp: 'cpp',
    c: 'c',
    csharp: 'cs',
    python: 'py',
    java: 'java',
    ruby: 'rb',
    rust: 'rs',
    go: 'go',
    swift: 'swift',
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
const JS_LIKE_LANGUAGES = new Set(['cpp', 'c', 'csharp', 'java']);
const AUTO_FORMAT_LINE_LANGUAGES = new Set(['cpp', 'c', 'csharp', 'java']);
const LOCAL_RUN_LANGUAGES = new Set(['plaintext', 'json', 'html', 'css']);
const REMOTE_RUN_LANGUAGES = new Set([
  'cpp',
  'c',
  'csharp',
  'python',
  'java',
  'ruby',
  'rust',
  'go',
  'swift',
  // Backward compatibility
  'javascript',
  'typescript',
  'sql',
]);
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
    c: 'c',
    csharp: 'csharp',
    'c#': 'csharp',
    javascript: 'javascript',
    js: 'javascript',
    typescript: 'typescript',
    ts: 'typescript',
    python: 'python',
    py: 'python',
    java: 'java',
    ruby: 'ruby',
    rust: 'rust',
    go: 'go',
    golang: 'go',
    swift: 'swift',
    html: 'html',
    css: 'css',
    sql: 'sql',
    json: 'json',
    plaintext: 'plaintext',
    text: 'plaintext',
  };
  return map[normalized] || 'plaintext';
};

const NIGHTMARE_STARFIELD_WIDTH = 2400;
const NIGHTMARE_STARFIELD_HEIGHT = 1400;
const NIGHTMARE_STAR_COLOR_PALETTE = ['222,236,255', '201,223,255', '244,231,255'];

const randomInRange = (min, max) => min + Math.random() * (max - min);

const buildNightmareStarShadowMap = ({ count }) => {
  const shadows = [];

  for (let index = 0; index < count; index += 1) {
    const x = Math.round(randomInRange(-120, NIGHTMARE_STARFIELD_WIDTH));
    const y = Math.round(randomInRange(-120, NIGHTMARE_STARFIELD_HEIGHT));
    const color = NIGHTMARE_STAR_COLOR_PALETTE[Math.floor(Math.random() * NIGHTMARE_STAR_COLOR_PALETTE.length)];
    const alpha = randomInRange(0.2, 0.62).toFixed(2);
    shadows.push(`${x}px ${y}px rgba(${color}, ${alpha})`);
  }

  return shadows.join(', ');
};

const buildNightmareStarLayerStyle = ({ size, count, opacity, twinkleMin, twinkleMax }) => {
  const duration = randomInRange(twinkleMin, twinkleMax).toFixed(2);
  const delay = (-1 * randomInRange(0, twinkleMax)).toFixed(2);

  return {
    '--nightmare-star-size': `${size}px`,
    '--nightmare-star-opacity': opacity.toFixed(2),
    '--nightmare-star-twinkle-duration': `${duration}s`,
    '--nightmare-star-twinkle-delay': `${delay}s`,
    '--nightmare-star-shadows': buildNightmareStarShadowMap({ count }),
  };
};

const buildNightmareStarFieldStyles = () => ({
  layerA: buildNightmareStarLayerStyle({
    size: 1,
    count: 85,
    opacity: 0.24,
    twinkleMin: 21,
    twinkleMax: 32,
  }),
  layerB: buildNightmareStarLayerStyle({
    size: 1.35,
    count: 55,
    opacity: 0.3,
    twinkleMin: 24,
    twinkleMax: 36,
  }),
  layerC: buildNightmareStarLayerStyle({
    size: 2,
    count: 28,
    opacity: 0.34,
    twinkleMin: 27,
    twinkleMax: 40,
  }),
});

const MonacoCodeEditor = ({ value, onChange, language, themeKey, isFreeMode = false }) => {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const languageRef = useRef(language);
  const themeKeyRef = useRef(themeKey);
  const [themeReady, setThemeReady] = useState(false);
  const [isEditorFocused, setIsEditorFocused] = useState(false);
  const [shootingStarSeed, setShootingStarSeed] = useState(0);
  const [shootingStarStyle, setShootingStarStyle] = useState({});
  const themeConfig = useMemo(() => getCodeEditorThemeConfig(themeKey), [themeKey]);
  const isNightmareTheme = themeConfig.key === 'nightmare';
  const nightmareStarLayers = useMemo(
    () => (isNightmareTheme ? buildNightmareStarFieldStyles() : null),
    [isNightmareTheme]
  );

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

  useEffect(() => {
    if (!isNightmareTheme) return undefined;

    let timeoutId = null;
    let cancelled = false;

    const scheduleShootingStar = () => {
      const nextDelayMs = 20000 + Math.random() * 20000;
      timeoutId = window.setTimeout(() => {
        if (cancelled) return;

        setShootingStarStyle({
          '--nightmare-shooting-top': `${6 + Math.random() * 38}%`,
          '--nightmare-shooting-left': `${Math.random() * 42}%`,
          '--nightmare-shooting-duration': `${(1.8 + Math.random() * 1.1).toFixed(2)}s`,
          '--nightmare-shooting-tail': `${Math.round(90 + Math.random() * 70)}px`,
          '--nightmare-shooting-tilt': `${(-18 - Math.random() * 16).toFixed(2)}deg`,
          '--nightmare-shooting-start-x': `${(-28 - Math.random() * 20).toFixed(1)}vw`,
          '--nightmare-shooting-end-x': `${(102 + Math.random() * 26).toFixed(1)}vw`,
          '--nightmare-shooting-end-y': `${(40 + Math.random() * 34).toFixed(1)}vh`,
        });
        setShootingStarSeed((prev) => prev + 1);
        scheduleShootingStar();
      }, nextDelayMs);
    };

    scheduleShootingStar();

    return () => {
      cancelled = true;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [isNightmareTheme]);

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

      const focusDisposable = editor.onDidFocusEditorText(() => {
        setIsEditorFocused(true);
      });
      const blurDisposable = editor.onDidBlurEditorText(() => {
        setIsEditorFocused(false);
      });

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
        focusDisposable.dispose();
        blurDisposable.dispose();
      });
    },
    []
  );

  const initialTheme = themeReady ? themeConfig.monacoTheme : (themeConfig.isDark ? 'vs-dark' : 'vs');
  const hasNeonGlow = themeConfig.hasNeonGlow;
  const neonGlowClass = hasNeonGlow ? (themeConfig.glowClass || 'synthwave-neon-glow') : '';
  const wrapperClassName = [
    'h-full',
    'w-full',
    neonGlowClass,
    isNightmareTheme && isEditorFocused ? 'nightmare-focused' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={wrapperClassName}>
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

          .nightmare-neon-glow {
            position: relative;
            overflow: hidden;
            isolation: isolate;
            background: #05070d;
          }
          .nightmare-neon-glow .nightmare-depth-base,
          .nightmare-neon-glow .nightmare-nebula,
          .nightmare-neon-glow .nightmare-stars,
          .nightmare-neon-glow .nightmare-light-beams,
          .nightmare-neon-glow .nightmare-city-glow,
          .nightmare-neon-glow .nightmare-shooting-star {
            position: absolute;
            pointer-events: none;
          }
          .nightmare-neon-glow .nightmare-depth-base {
            z-index: 0;
            inset: 0;
            background:
              radial-gradient(140% 110% at 12% -16%, rgba(19, 33, 69, 0.36) 0%, rgba(19, 33, 69, 0) 58%),
              radial-gradient(128% 96% at 100% 115%, rgba(36, 24, 77, 0.32) 0%, rgba(36, 24, 77, 0) 60%),
              linear-gradient(180deg, #070a14 0%, #05070d 64%, #04060b 100%);
          }
          .nightmare-neon-glow .nightmare-nebula {
            z-index: 1;
            inset: -18%;
            opacity: 0.045;
            background:
              radial-gradient(circle at 24% 32%, rgba(143, 86, 255, 0.7) 0%, rgba(143, 86, 255, 0) 48%),
              radial-gradient(circle at 71% 26%, rgba(70, 129, 255, 0.68) 0%, rgba(70, 129, 255, 0) 44%),
              radial-gradient(circle at 62% 70%, rgba(137, 79, 214, 0.62) 0%, rgba(137, 79, 214, 0) 50%);
            filter: blur(52px) saturate(1.1);
            animation: nightmare-nebula-drift 48s ease-in-out infinite alternate;
          }
          .nightmare-neon-glow .nightmare-stars {
            z-index: 2;
            top: 0;
            left: 0;
            width: var(--nightmare-star-size, 1px);
            height: var(--nightmare-star-size, 1px);
            border-radius: 999px;
            background: rgba(228, 239, 255, 0.95);
            box-shadow: var(--nightmare-star-shadows);
            opacity: var(--nightmare-star-opacity, 0.3);
            filter: drop-shadow(0 0 2px rgba(169, 207, 255, 0.42));
            animation: nightmare-stars-twinkle var(--nightmare-star-twinkle-duration, 24s) ease-in-out infinite;
            animation-delay: var(--nightmare-star-twinkle-delay, 0s);
          }
          .nightmare-neon-glow .nightmare-light-beams {
            z-index: 3;
            inset: 0;
            opacity: 0.03;
            background:
              repeating-linear-gradient(
                90deg,
                rgba(255, 255, 255, 0) 0%,
                rgba(255, 255, 255, 0) 12%,
                rgba(138, 164, 255, 0.55) 12.6%,
                rgba(255, 255, 255, 0) 16.2%
              );
            filter: blur(0.5px);
          }
          .nightmare-neon-glow .nightmare-city-glow {
            z-index: 4;
            left: 0;
            right: 0;
            bottom: 0;
            height: 34%;
            background:
              radial-gradient(155% 100% at 50% 100%, rgba(126, 68, 201, 0.3) 0%, rgba(126, 68, 201, 0) 54%),
              radial-gradient(124% 100% at 50% 110%, rgba(0, 247, 255, 0.16) 0%, rgba(0, 247, 255, 0) 62%),
              linear-gradient(180deg, rgba(8, 10, 20, 0) 0%, rgba(14, 10, 28, 0.28) 62%, rgba(28, 15, 49, 0.34) 100%);
            filter: blur(11px) saturate(1.05);
            animation: nightmare-city-drift 23s ease-in-out infinite alternate;
          }
          .nightmare-neon-glow .nightmare-shooting-star {
            z-index: 5;
            top: var(--nightmare-shooting-top, 18%);
            left: var(--nightmare-shooting-left, 12%);
            width: var(--nightmare-shooting-tail, 120px);
            height: 2px;
            border-radius: 999px;
            opacity: 0;
            transform-origin: left center;
            transform: translate3d(var(--nightmare-shooting-start-x, -36vw), -14vh, 0) rotate(var(--nightmare-shooting-tilt, -26deg));
            background: linear-gradient(
              90deg,
              rgba(255, 255, 255, 0) 0%,
              rgba(0, 247, 255, 0.76) 42%,
              rgba(255, 0, 255, 0.44) 76%,
              rgba(255, 255, 255, 0) 100%
            );
            filter: blur(0.45px) drop-shadow(0 0 7px rgba(0, 247, 255, 0.55)) drop-shadow(0 0 10px rgba(255, 0, 255, 0.3));
            animation: nightmare-shooting var(--nightmare-shooting-duration, 2.2s) cubic-bezier(0.15, 0.42, 0.35, 1) 1;
          }
          .nightmare-neon-glow .nightmare-shooting-star::after {
            content: '';
            position: absolute;
            right: -3px;
            top: 50%;
            width: 6px;
            height: 6px;
            border-radius: 999px;
            transform: translateY(-50%);
            background: rgba(232, 250, 255, 0.76);
            box-shadow: 0 0 8px rgba(0, 247, 255, 0.72), 0 0 11px rgba(255, 0, 255, 0.34);
          }
          .nightmare-neon-glow.nightmare-focused .nightmare-stars {
            filter: brightness(1.05) drop-shadow(0 0 2px rgba(169, 207, 255, 0.42));
          }
          .nightmare-neon-glow .monaco-editor,
          .nightmare-neon-glow .monaco-editor .margin,
          .nightmare-neon-glow .monaco-editor-background {
            background: transparent !important;
          }
          .nightmare-neon-glow .monaco-editor .view-lines {
            position: relative;
            z-index: 6;
            filter: saturate(1.03) contrast(1.04);
          }
          .nightmare-neon-glow .monaco-editor .current-line {
            box-shadow: inset 0 0 0 1px rgba(100, 102, 227, 0.33), inset 0 0 20px rgba(0, 247, 255, 0.08);
            border-radius: 4px;
          }
          .nightmare-neon-glow .monaco-editor .selected-text {
            box-shadow: inset 0 0 0 1px rgba(199, 162, 255, 0.32), inset 0 0 12px rgba(136, 97, 255, 0.34), 0 0 12px rgba(110, 78, 218, 0.23);
            border-radius: 4px;
          }
          .nightmare-neon-glow .monaco-editor .mtk3,
          .nightmare-neon-glow .monaco-editor .mtk5,
          .nightmare-neon-glow .monaco-editor .mtk6 {
            text-shadow: 0 0 8px rgba(255, 0, 255, 0.7);
          }
          .nightmare-neon-glow .monaco-editor .mtk10,
          .nightmare-neon-glow .monaco-editor .mtk12 {
            text-shadow: 0 0 4px rgba(0, 247, 255, 0.9), 0 0 12px rgba(0, 247, 255, 0.62), 0 0 22px rgba(0, 247, 255, 0.35);
            transition: text-shadow 160ms ease;
          }
          .nightmare-neon-glow .monaco-editor .mtk10:hover,
          .nightmare-neon-glow .monaco-editor .mtk12:hover {
            text-shadow: 0 0 5px rgba(0, 247, 255, 0.92), 0 0 15px rgba(0, 247, 255, 0.66), 0 0 28px rgba(0, 247, 255, 0.42);
          }
          .nightmare-neon-glow .monaco-editor .mtk7 {
            text-shadow: 0 0 6px rgba(57, 255, 20, 0.42);
          }
          .nightmare-neon-glow .monaco-editor .mtk8,
          .nightmare-neon-glow .monaco-editor .mtk9 {
            text-shadow: 0 0 6px rgba(255, 159, 28, 0.46);
          }
          .nightmare-neon-glow .monaco-editor .mtk11 {
            text-shadow: 0 0 5px rgba(255, 255, 255, 0.36);
          }
          .nightmare-neon-glow .monaco-editor .mtk4 {
            opacity: 0.76;
            text-shadow: none;
          }
          .nightmare-neon-glow .monaco-editor .cursor {
            background-color: #00f7ff !important;
            box-shadow: 0 0 10px rgba(0, 247, 255, 0.86), 0 0 18px rgba(0, 247, 255, 0.56);
            animation: nightmare-caret-pulse 3.6s ease-in-out infinite;
          }
          .nightmare-editor-frame {
            border-color: rgba(89, 86, 172, 0.52) !important;
            box-shadow: 0 18px 40px rgba(26, 16, 62, 0.42), inset 0 1px 0 rgba(255, 255, 255, 0.04);
            background:
              linear-gradient(180deg, rgba(7, 10, 18, 0.9), rgba(4, 6, 12, 0.94)) !important;
          }
          .nightmare-terminal-panel {
            position: relative;
            border: 1px solid transparent !important;
            background:
              linear-gradient(rgba(7, 10, 18, 0.72), rgba(5, 7, 13, 0.82)) padding-box,
              linear-gradient(126deg, rgba(255, 0, 255, 0.72), rgba(0, 247, 255, 0.74)) border-box !important;
            box-shadow: 0 16px 34px rgba(76, 57, 150, 0.3), 0 0 20px rgba(113, 78, 212, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(12px);
          }
          .nightmare-terminal-header {
            background: linear-gradient(90deg, rgba(11, 16, 31, 0.84), rgba(8, 13, 27, 0.72)) !important;
            border-color: rgba(136, 118, 219, 0.36) !important;
            color: #b8b2ff !important;
          }
          .nightmare-terminal-body {
            background-color: rgba(4, 6, 12, 0.85) !important;
            color: #f5f5ff !important;
          }
          .nightmare-terminal-input::placeholder {
            color: rgba(209, 206, 255, 0.52);
          }
          @keyframes nightmare-stars-twinkle {
            0% {
              opacity: var(--nightmare-star-opacity, 0.3);
              filter: brightness(0.95) drop-shadow(0 0 2px rgba(169, 207, 255, 0.42));
            }
            100% {
              opacity: calc(var(--nightmare-star-opacity, 0.3) + 0.08);
              filter: brightness(1.04) drop-shadow(0 0 2px rgba(169, 207, 255, 0.42));
            }
          }
          @keyframes nightmare-nebula-drift {
            0% {
              transform: translate3d(-1%, 0, 0) scale(1);
            }
            100% {
              transform: translate3d(1%, -1.5%, 0) scale(1.03);
            }
          }
          @keyframes nightmare-city-drift {
            0% {
              transform: translateY(0);
            }
            100% {
              transform: translateY(-3px);
            }
          }
          @keyframes nightmare-shooting {
            0% {
              opacity: 0;
              transform: translate3d(var(--nightmare-shooting-start-x, -36vw), -12vh, 0) rotate(var(--nightmare-shooting-tilt, -26deg));
            }
            12% {
              opacity: 0.72;
            }
            100% {
              opacity: 0;
              transform: translate3d(var(--nightmare-shooting-end-x, 112vw), var(--nightmare-shooting-end-y, 58vh), 0) rotate(var(--nightmare-shooting-tilt, -26deg));
            }
          }
          @keyframes nightmare-caret-pulse {
            0%,
            100% {
              box-shadow: 0 0 8px rgba(0, 247, 255, 0.84), 0 0 15px rgba(0, 247, 255, 0.47);
            }
            50% {
              box-shadow: 0 0 12px rgba(0, 247, 255, 0.94), 0 0 24px rgba(0, 247, 255, 0.64);
            }
          }
          @media (prefers-reduced-motion: reduce) {
            .nightmare-neon-glow .nightmare-nebula,
            .nightmare-neon-glow .nightmare-stars,
            .nightmare-neon-glow .nightmare-city-glow,
            .nightmare-neon-glow .nightmare-shooting-star,
            .nightmare-neon-glow .monaco-editor .cursor {
              animation: none;
            }
          }
        ` : ''}
      </style>
      {isNightmareTheme && (
        <>
          <span className="nightmare-depth-base" aria-hidden="true" />
          <span className="nightmare-nebula" aria-hidden="true" />
          <span className="nightmare-stars" style={nightmareStarLayers?.layerA} aria-hidden="true" />
          <span className="nightmare-stars" style={nightmareStarLayers?.layerB} aria-hidden="true" />
          <span className="nightmare-stars" style={nightmareStarLayers?.layerC} aria-hidden="true" />
          <span className="nightmare-light-beams" aria-hidden="true" />
          <span className="nightmare-city-glow" aria-hidden="true" />
          {shootingStarSeed > 0 && (
            <span
              key={shootingStarSeed}
              className="nightmare-shooting-star"
              style={shootingStarStyle}
              aria-hidden="true"
            />
          )}
        </>
      )}
      <div className="relative z-[5] h-full w-full">
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
              {isFreeMode ? 'Đang mở CodePad...' : 'Đang tải Monaco Editor...'}
            </div>
          }
        />
      </div>
    </div>
  );
};

const SmoothImage = ({ src, alt, className = '', imgClassName = '' }) => {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const finalSrc = failed ? LANGUAGE_FALLBACK_ICON : src;

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [src]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <span
        aria-hidden="true"
        className={`absolute inset-0 rounded-[inherit] bg-slate-200/70 dark:bg-slate-700/60 transition-opacity duration-300 ${
          loaded ? 'opacity-0' : 'opacity-100'
        }`}
      />
      <img
        src={finalSrc || LANGUAGE_FALLBACK_ICON}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (finalSrc !== LANGUAGE_FALLBACK_ICON) {
            setFailed(true);
            return;
          }
          setLoaded(true);
        }}
        className={`${imgClassName} transition-opacity duration-300 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
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
  isPreviewOpen,
  onOpenPreview,
  onClosePreview,
  mode = 'create',
}) => {
  const languageSelectRef = useRef(null);
  const [isLanguageSelectOpen, setIsLanguageSelectOpen] = useState(false);
  const [languageQuery, setLanguageQuery] = useState('');
  const MotionDiv = motion.div;

  const selectedLanguageMeta = useMemo(
    () => getLanguageMeta(form?.language || 'plaintext'),
    [form?.language]
  );

  const filteredLanguageOptions = useMemo(() => {
    const normalizedQuery = String(languageQuery || '').trim().toLowerCase();
    if (!normalizedQuery) return LANGUAGE_OPTIONS;
    return LANGUAGE_OPTIONS.filter((option) =>
      String(option.label || '').toLowerCase().includes(normalizedQuery)
    );
  }, [languageQuery]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        languageSelectRef.current &&
        !languageSelectRef.current.contains(event.target)
      ) {
        setIsLanguageSelectOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, []);

  if (!isOpen) return null;

  const isEditMode = mode === 'edit';
  const isFreeSaveMode = mode === 'free-save';
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
            {isEditMode ? 'Sửa card code' : isFreeSaveMode ? 'Lưu vào kho bài tập' : 'Thêm code'}
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
              Ngôn ngữ lập trình
            </label>
            <div className="mt-1">
              <div ref={languageSelectRef} className="relative">
                <button
                  type="button"
                  onClick={() => setIsLanguageSelectOpen((prev) => !prev)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-left text-sm outline-none transition hover:border-blue-300 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2">
                      <SmoothImage
                        src={selectedLanguageMeta.icon}
                        alt={selectedLanguageMeta.label}
                        className="h-7 w-7 rounded-md"
                        imgClassName="h-full w-full object-contain opacity-90"
                      />
                      <span className="truncate font-semibold text-gray-800 dark:text-gray-100">
                        {selectedLanguageMeta.label}
                      </span>
                    </span>
                    <ChevronDown
                      size={15}
                      className={`shrink-0 text-gray-400 transition-transform ${
                        isLanguageSelectOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </button>

                {isLanguageSelectOpen && (
                  <div className="absolute left-0 top-full z-[80] mt-2 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-600 dark:bg-gray-800">
                    <div className="relative border-b border-gray-100 p-2 dark:border-gray-700">
                      <Search
                        size={14}
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <input
                        value={languageQuery}
                        onChange={(event) => setLanguageQuery(event.target.value)}
                        placeholder="Tìm ngôn ngữ..."
                        className="w-full rounded-lg border border-gray-200 py-2 pl-8 pr-2 text-sm outline-none transition focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div className="max-h-56 overflow-y-auto p-1.5">
                      {filteredLanguageOptions.length > 0 ? (
                        filteredLanguageOptions.map((option) => {
                          const optionMeta = getLanguageMeta(option.value);
                          const isActive = normalizeLanguageKey(form?.language) === optionMeta.key;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => {
                                onChange('language', optionMeta.key);
                                setLanguageQuery('');
                                setIsLanguageSelectOpen(false);
                              }}
                              className={`mb-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-medium transition-all last:mb-0 ${
                                isActive
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                  : 'text-gray-700 hover:bg-blue-50 dark:text-gray-300 dark:hover:bg-blue-900/20'
                              }`}
                            >
                              <SmoothImage
                                src={optionMeta.icon}
                                alt={optionMeta.label}
                                className="h-6 w-6 rounded-md"
                                imgClassName="h-full w-full object-contain opacity-90"
                              />
                              <span className="truncate">{optionMeta.label}</span>
                            </button>
                          );
                        })
                      ) : (
                        <div className="px-3 py-4 text-center text-xs text-gray-500 dark:text-gray-400">
                          Không tìm thấy ngôn ngữ phù hợp
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

            </div>
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
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onOpenPreview}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
                >
                  Preview
                </button>
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
            </div>
            <textarea
              value={form.assignmentDescription}
              onChange={(event) => onChange('assignmentDescription', event.target.value)}
              rows={7}
              placeholder="Nhập mô tả hoặc HTML bài tập. Ví dụ: <h1 style=&quot;color:red&quot;>Ok</h1>"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            <p className="mt-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
              {isFreeSaveMode
                ? 'Để lưu phiên CodePad, hãy điền tên môn học và tên bài tập trước khi bấm lưu.'
                : 'Bạn có thể dán HTML có style/class để xem trước trực tiếp trước khi lưu card.'}
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
            {creating ? 'Đang xử lý...' : isEditMode ? 'Lưu chỉnh sửa' : isFreeSaveMode ? 'Lưu vào kho' : 'Lưu card'}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isPreviewOpen && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
            onClick={onClosePreview}
          >
            <MotionDiv
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              transition={{ duration: 0.24, ease: 'easeOut' }}
              className="w-full max-w-4xl rounded-[28px] border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-900/15 dark:border-gray-700 dark:bg-gray-800"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">
                    Live Preview
                  </p>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">
                    Xem trước nội dung bài tập
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={onClosePreview}
                  className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-gray-700 dark:hover:text-white"
                  aria-label="Đóng preview HTML"
                >
                  <X size={18} />
                </button>
              </div>

              <HtmlPreviewer
                rawHtml={form.assignmentDescription}
                className="max-h-[70vh] overflow-y-auto"
                emptyMessage="Khung preview sẽ hiển thị tại đây khi bạn nhập mô tả hoặc HTML."
              />
            </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  );

  if (typeof document === 'undefined') return modalContent;
  return createPortal(modalContent, document.body);
};

const ClearAllCodeModal = ({ isOpen, onClose, onConfirm }) => {
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          key="clear-all-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            key="clear-all-modal"
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-md rounded-[2rem] border border-white/70 bg-white/90 px-6 pb-6 pt-10 shadow-[0_30px_90px_rgba(15,23,42,0.16)] backdrop-blur-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Đóng xác nhận dọn code"
            >
              <X size={18} />
            </button>

            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-orange-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
              <Eraser size={34} className="text-orange-500" strokeWidth={2.1} />
            </div>

            <div className="mt-6 text-center">
              <h3
                className="text-[1.7rem] font-bold tracking-tight text-slate-900"
                style={{ fontFamily: "'Plus Jakarta Sans', 'Google Sans', sans-serif" }}
              >
                Dọn dẹp sàn code?
              </h3>
              <p className="mt-3 text-sm leading-7 text-slate-500">
                Toàn bộ code hiện tại sẽ bị xóa sạch để bạn bắt đầu ý tưởng mới. Bạn chắc chứ?
              </p>
            </div>

            <div className="mt-8 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex min-w-[120px] items-center justify-center rounded-full px-5 py-3 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="inline-flex min-w-[140px] items-center justify-center rounded-full bg-gradient-to-r from-red-500 to-orange-500 px-5 py-3 text-sm font-bold text-white shadow-[0_18px_35px_rgba(239,68,68,0.28)] transition hover:scale-[1.01] hover:shadow-[0_22px_40px_rgba(239,68,68,0.34)]"
              >
                Xóa hết
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
};

const CodeSnippetManager = ({ user, onFullscreenChange = () => {}, initialFreeMode = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [snippets, setSnippets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(INITIAL_FORM);
  const [editingSnippet, setEditingSnippet] = useState(null);
  const [creating, setCreating] = useState(false);
  const [formattingDescription, setFormattingDescription] = useState(false);
  const [isHtmlPreviewOpen, setIsHtmlPreviewOpen] = useState(false);
  const [selectedSnippet, setSelectedSnippet] = useState(null);
  const [editorCode, setEditorCode] = useState('');
  const [editorLanguage, setEditorLanguage] = useState('plaintext');
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const [editorTheme, setEditorTheme] = useState(() => {
    try {
      const savedTheme = localStorage.getItem(CODE_EDITOR_THEME_STORAGE_KEY);
      return resolveInitialCodeEditorTheme(savedTheme);
    } catch {
      return DEFAULT_DARK_THEME_KEY;
    }
  });
  const [isThemeDropdownOpen, setIsThemeDropdownOpen] = useState(false);
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
  const [popupPage, setPopupPage] = useState(1);
  const [popupSearchQuery, setPopupSearchQuery] = useState('');
  const [isExercisePopupOpen, setIsExercisePopupOpen] = useState(false);
  const [pendingFreeSave, setPendingFreeSave] = useState(false);
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);
  const { currentPage: mainPage, goToPage: goToMainPage } = usePersistedPagination({
    paramKey: 'page',
  });

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
  const latestLocalDraftSignatureRef = useRef('');
  const latestFreeDraftSignatureRef = useRef('');
  const languageDropdownRef = useRef(null);
  const themeDropdownRef = useRef(null);

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

  useEffect(() => {
    if (!selectedSnippet?.isFreeMode) {
      setIsClearAllModalOpen(false);
    }
  }, [selectedSnippet]);

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
    try {
      localStorage.setItem(CODE_EDITOR_THEME_STORAGE_KEY, editorTheme);
    } catch {
      // Ignore localStorage write errors
    }
  }, [editorTheme]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        languageDropdownRef.current &&
        !languageDropdownRef.current.contains(event.target)
      ) {
        setIsLanguageDropdownOpen(false);
      }

      if (
        themeDropdownRef.current &&
        !themeDropdownRef.current.contains(event.target)
      ) {
        setIsThemeDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, []);

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

  useEffect(() => {
    const timerId = window.setInterval(() => {
      const activeSnippet = snippetRef.current;
      const activeUsername = usernameRef.current;
      const draftCode = codeRef.current;
      const draftLanguage = languageRef.current;
      if (!activeSnippet) return;

      if (activeSnippet?.isFreeMode) {
        const draftTitle =
          String(activeSnippet.cardTitle || '').trim() || buildFreeSessionTitle();
        const signature = `${draftTitle}\n${draftLanguage}\n${draftCode}`;
        if (latestFreeDraftSignatureRef.current === signature) return;
        const saved = writeFreeSessionDraft({
          username: activeUsername,
          title: draftTitle,
          code: draftCode,
          language: draftLanguage,
        });
        if (saved) {
          latestFreeDraftSignatureRef.current = signature;
        }
        return;
      }

      if (!activeUsername) return;

      const snippetId = getSnippetId(activeSnippet);
      if (!snippetId) return;

      if (!hasDraftChanged(activeSnippet, draftCode, draftLanguage)) {
        removeLocalDraft(activeUsername, snippetId);
        latestLocalDraftSignatureRef.current = '';
        return;
      }

      const signature = `${draftLanguage}\n${draftCode}`;
      if (latestLocalDraftSignatureRef.current === signature) return;
      const saved = writeLocalDraft({
        username: activeUsername,
        snippetId,
        code: draftCode,
        language: draftLanguage,
      });
      if (saved) {
        latestLocalDraftSignatureRef.current = signature;
      }
    }, LOCAL_DRAFT_AUTOSAVE_INTERVAL_MS);

    return () => window.clearInterval(timerId);
  }, [hasDraftChanged]);

  const persistDraft = useCallback(
    async ({ silent = false, keepalive = false, skipStateSync = false } = {}) => {
      const activeSnippet = snippetRef.current;
      const activeUsername = usernameRef.current;
      const draftCode = codeRef.current;
      const draftLanguage = languageRef.current;

      if (activeSnippet?.isFreeMode) return true;
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

      removeLocalDraft(activeUsername, snippetId);
      latestLocalDraftSignatureRef.current = '';

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
    setIsHtmlPreviewOpen(false);
    setCreateForm(INITIAL_FORM);
    setEditingSnippet(null);
    setPendingFreeSave(false);
  };

  const openFreeSession = useCallback(
    ({ sharedPayload = null, notifyShared = false } = {}) => {
      const activeUsername = usernameRef.current;
      const restoredDraft = sharedPayload ? null : readFreeSessionDraft(activeUsername);
      const nextTitle = String(
        sharedPayload?.title || restoredDraft?.title || buildFreeSessionTitle()
      ).trim() || buildFreeSessionTitle();
      const nextLanguage = String(
        sharedPayload?.language || restoredDraft?.language || FREE_SESSION_DEFAULT_LANGUAGE
      ).trim() || FREE_SESSION_DEFAULT_LANGUAGE;
      const nextCode = String(
        sharedPayload?.code || restoredDraft?.code || FREE_SESSION_TEMPLATE_CPP
      );
      const freeSnippet = buildFreeSessionSnippet({
        title: nextTitle,
        code: nextCode,
        language: nextLanguage,
      });

      setSelectedSnippet(freeSnippet);
      setEditorCode(nextCode);
      setEditorLanguage(nextLanguage);
      setSnippetTestCases([]);
      setJudgeResults([]);
      setEarnedScore(0);
      setProgramInput('');
      setProgramOutput('');
      setProgramError('');
      setProgramPreviewHtml('');
      setStatusBanner({ kind: 'hidden', message: '' });
      setJudgeCompilerError('');
      setRunningAction('');
      setIsExercisePopupOpen(false);
      setPendingFreeSave(false);
      latestLocalDraftSignatureRef.current = '';
      latestFreeDraftSignatureRef.current = `${nextTitle}\n${nextLanguage}\n${nextCode}`;

      if (notifyShared) {
        toast.success('Đã mở phiên CodePad từ link chia sẻ');
      }
    },
    []
  );

  const handleStartFreeMode = useCallback(() => {
    navigate('/code-vault/free');
  }, [navigate]);

  useEffect(() => {
    if (!initialFreeMode) return;

    const searchParams = new URLSearchParams(location.search);
    const sharedToken = String(searchParams.get(FREE_SESSION_SHARE_QUERY) || '').trim();
    let sharedPayload = null;

    if (sharedToken) {
      sharedPayload = decodeFreeSessionSharePayload(sharedToken);
      if (!sharedPayload) {
        toast.error('Link chia sẻ không hợp lệ hoặc đã hỏng');
      }
    }

    openFreeSession({
      sharedPayload,
      notifyShared: Boolean(sharedPayload),
    });
  }, [initialFreeMode, location.search, openFreeSession]);

  const handleCreateSnippet = async () => {
    if (!username) {
      toast.error('Bạn cần đăng nhập để lưu code');
      return;
    }

    const cardTitle = String(createForm.cardTitle || '').trim();
    const subjectName = String(createForm.subjectName || '').trim();
    const assignmentName = String(createForm.assignmentName || '').trim();
    const assignmentDescription = String(createForm.assignmentDescription || '').trim();
    const selectedLanguage = normalizeLanguageKey(
      createForm.language || inferLanguageFromSubject(subjectName)
    );
    const isSaveFromFreeMode = pendingFreeSave && Boolean(selectedSnippet?.isFreeMode);

    if (!cardTitle) {
      toast.error('Tên card là bắt buộc');
      return;
    }

    if (isSaveFromFreeMode && (!subjectName || !assignmentName)) {
      toast.error('Vui lòng nhập tên môn học và tên bài tập trước khi lưu vào kho');
      return;
    }

    const basePayload = {
      username,
      cardTitle,
      title: cardTitle,
      subjectName,
      assignmentName,
      exerciseName: assignmentName,
      assignmentDescription,
      formattedDescription: assignmentDescription,
      language: selectedLanguage,
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
          language: isSaveFromFreeMode ? normalizeLanguageKey(editorLanguage) : selectedLanguage,
          code: isSaveFromFreeMode ? String(editorCode || '') : '',
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
        if (isSaveFromFreeMode) {
          removeFreeSessionDraft(usernameRef.current);
          latestFreeDraftSignatureRef.current = '';
          toast.success('Đã lưu phiên CodePad vào kho bài tập');
          resetSnippetModalState();
          navigate('/code-vault');
          return;
        }
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

  const handleOpenDetail = useCallback(async (snippet) => {
    const snippetId = getSnippetId(snippet);
    let resolvedSnippet = snippet;

    if (username && snippetId) {
      const hasCode = String(snippet?.code || '').trim().length > 0;
      const hasLanguage = String(snippet?.language || '').trim().length > 0;
      const hasTestCases = Array.isArray(snippet?.testCases) && snippet.testCases.length > 0;
      if (!hasCode || !hasLanguage || !hasTestCases) {
        const detailResult = await codeSnippetService.getSnippetById(snippetId, username);
        if (detailResult?.success && detailResult.snippet) {
          resolvedSnippet = { ...snippet, ...detailResult.snippet };
          setSnippets((prev) =>
            prev.map((item) => (getSnippetId(item) === snippetId ? resolvedSnippet : item))
          );
        }
      }
    }

    const fallbackCode = String(resolvedSnippet.code || '');
    const fallbackLanguage = String(
      resolvedSnippet.language || inferLanguageFromSubject(resolvedSnippet.subjectName)
    );
    let nextCode = fallbackCode;
    let nextLanguage = fallbackLanguage;

    if (username && snippetId) {
      const localDraft = readLocalDraft(username, snippetId);
      const canRestoreDraft =
        localDraft &&
        hasDraftChanged(resolvedSnippet, localDraft.code, localDraft.language);
      if (canRestoreDraft) {
        const restoreMessage = `Phát hiện bản nháp lưu lúc ${formatDateTime(localDraft.updatedAt)}.\n\nBạn có muốn tiếp tục bản nháp gần nhất không?`;
        const shouldRestore = window.confirm(restoreMessage);
        if (shouldRestore) {
          nextCode = localDraft.code;
          nextLanguage = localDraft.language;
          latestLocalDraftSignatureRef.current = `${nextLanguage}\n${nextCode}`;
          toast.success('Đã khôi phục bản nháp gần nhất');
        } else {
          removeLocalDraft(username, snippetId);
          latestLocalDraftSignatureRef.current = '';
        }
      } else {
        latestLocalDraftSignatureRef.current = '';
      }
    } else {
      latestLocalDraftSignatureRef.current = '';
    }

    const normalizedTestCases = toSnippetTestCaseList(resolvedSnippet);
    setSelectedSnippet(resolvedSnippet);
    setEditorCode(nextCode);
    setEditorLanguage(nextLanguage);
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
    setPendingFreeSave(false);
  }, [hasDraftChanged, username]);

  const handleCloseDetail = async () => {
    const activeSnippet = snippetRef.current;
    const isClosingFreeMode = Boolean(activeSnippet?.isFreeMode);
    judgeAnimationRunRef.current = Date.now();
    setClosingDetail(true);
    if (isClosingFreeMode) {
      writeFreeSessionDraft({
        username: usernameRef.current,
        title: String(activeSnippet?.cardTitle || buildFreeSessionTitle()),
        code: codeRef.current,
        language: languageRef.current,
      });
    } else {
      await persistDraft({ silent: false });
    }
    setClosingDetail(false);
    setIsExercisePopupOpen(false);
    setSelectedSnippet(null);
    setSnippetTestCases([]);
    setJudgeResults([]);
    setEarnedScore(0);
    setStatusBanner({ kind: 'hidden', message: '' });
    setJudgeCompilerError('');
    setRunningAction('');
    setPendingFreeSave(false);
    if (isClosingFreeMode) {
      navigate('/code-vault');
    }
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
    setPendingFreeSave(false);
    setEditingSnippet(snippet);
    setCreateForm({
      cardTitle: String(snippet?.cardTitle || ''),
      subjectName: String(snippet?.subjectName || ''),
      assignmentName: String(snippet?.assignmentName || ''),
      assignmentDescription: String(snippet?.assignmentDescription || ''),
      language: normalizeLanguageKey(
        snippet?.language || inferLanguageFromSubject(snippet?.subjectName || '')
      ),
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

  const handleSaveFreeSessionToVault = useCallback(() => {
    if (!selectedSnippet?.isFreeMode) return;
    if (!username) {
      toast.error('Bạn cần đăng nhập để lưu vào kho bài tập');
      return;
    }

    if (!String(editorCode || '').trim()) {
      toast.error('Vui lòng nhập code trước khi lưu vào kho');
      return;
    }

    setEditingSnippet(null);
    setPendingFreeSave(true);
    setCreateForm({
      cardTitle: String(selectedSnippet?.cardTitle || buildFreeSessionTitle()),
      subjectName: '',
      assignmentName: '',
      assignmentDescription: '',
      language: normalizeLanguageKey(editorLanguage),
    });
    setIsCreateOpen(true);
  }, [editorCode, selectedSnippet, username]);

  const confirmClearAllCode = useCallback(() => {
    setEditorCode('');
    setProgramInput('');
    setProgramOutput('');
    setProgramError('');
    setProgramPreviewHtml('');
    setStatusBanner({ kind: 'hidden', message: '' });
    setIsClearAllModalOpen(false);
    toast.success('Đã dọn dẹp toàn bộ code');
  }, []);

  const handleClearAllCode = useCallback(() => {
    if (!selectedSnippet?.isFreeMode) return;
    setIsClearAllModalOpen(true);
  }, [selectedSnippet]);

  const handleGenerateShareLink = useCallback(async () => {
    if (!selectedSnippet?.isFreeMode) return;

    const encodedPayload = encodeFreeSessionSharePayload({
      title: String(selectedSnippet.cardTitle || buildFreeSessionTitle()),
      language: String(editorLanguage || FREE_SESSION_DEFAULT_LANGUAGE),
      code: String(editorCode || ''),
    });
    if (!encodedPayload) {
      toast.error('Không thể tạo link chia sẻ');
      return;
    }

    const origin = window.location.origin || '';
    const shareUrl = `${origin}/code-vault/free?${FREE_SESSION_SHARE_QUERY}=${encodeURIComponent(encodedPayload)}`;

    if (shareUrl.length > 7000) {
      toast.error('Đoạn code quá dài, chưa thể tạo link chia sẻ');
      return;
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Đã tạo link chia sẻ và copy vào clipboard');
    } catch {
      toast.error('Không thể copy link chia sẻ');
    }
  }, [editorCode, editorLanguage, selectedSnippet]);

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
    if (snippetRef.current?.isFreeMode) {
      toast.error('CodePad không có test case để chấm tự động');
      return;
    }

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
        if (snippetRef.current?.isFreeMode) return;
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
  const isFreeMode = Boolean(selectedSnippet?.isFreeMode);
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
      goToMainPage(safePage);
    },
    [goToMainPage, mainTotalPages, popupTotalPages]
  );

  useEffect(() => {
    setPopupPage(1);
  }, [popupSearchQuery]);

  useEffect(() => {
    if (loading) return;

    if (mainPage > mainTotalPages) {
      goToMainPage(mainTotalPages, { scroll: false });
    }
  }, [goToMainPage, loading, mainPage, mainTotalPages]);

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
            onClick={handleStartFreeMode}
            className="inline-flex items-center gap-1 rounded-xl border border-emerald-300 bg-emerald-50/70 px-3 py-2 text-sm font-bold text-emerald-700 backdrop-blur-md transition hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
          >
            <FileCode2 size={16} />
            CodePad
          </button>
          <button
            onClick={() => {
              setPendingFreeSave(false);
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

      {!username && !isDetailView && (
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
              onChange={(event) => {
                setSearchQuery(event.target.value);
                goToMainPage(1, { scroll: false });
              }}
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
            const languageMeta = getLanguageMeta(
              snippet?.language || inferLanguageFromSubject(snippet?.subjectName || '')
            );
            return (
              <div
                key={snippetId}
                className="group rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-gray-700 dark:bg-gray-800"
                style={{ fontFamily: "'Google Sans', 'Product Sans', 'Inter', sans-serif" }}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => handleOpenDetail(snippet)}
                    className="flex min-w-0 flex-1 items-start gap-3 text-left"
                  >
                    <Tooltip text={`Ngôn ngữ: ${languageMeta.label}`}>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ scale: 1.06 }}
                        transition={{ type: 'spring', stiffness: 340, damping: 24 }}
                        className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700/70"
                      >
                        <SmoothImage
                          src={languageMeta.icon}
                          alt={languageMeta.label}
                          className="h-8 w-8 rounded-md"
                          imgClassName="h-full w-full object-contain opacity-90 group-hover:opacity-100"
                        />
                      </motion.div>
                    </Tooltip>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-xs font-bold uppercase tracking-wide ${languageMeta.brandClassName}`}>
                        {languageMeta.label}
                      </p>
                      <p className="mt-1 truncate text-[11px] font-semibold text-slate-500 dark:text-slate-400">
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
                    <Tooltip text="Sửa card code">
                      <button
                        onClick={() => handleEditSnippet(snippet)}
                        className="rounded-lg p-1.5 text-gray-400 transition hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20"
                        aria-label="Sửa card code"
                      >
                        <Pencil size={15} />
                      </button>
                    </Tooltip>
                    <Tooltip text="Xóa card code">
                      <button
                        onClick={() => handleDelete(snippetId)}
                        className="rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                        aria-label="Xóa card code"
                      >
                        <Trash2 size={15} />
                      </button>
                    </Tooltip>
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
        mode={editingSnippet ? 'edit' : pendingFreeSave ? 'free-save' : 'create'}
        formattingDescription={formattingDescription}
        onFormatWithAI={handleFormatAssignmentWithAI}
        isPreviewOpen={isHtmlPreviewOpen}
        onOpenPreview={() => setIsHtmlPreviewOpen(true)}
        onClosePreview={() => setIsHtmlPreviewOpen(false)}
        onClose={resetSnippetModalState}
        onCreate={handleCreateSnippet}
        creating={creating}
      />

      <ExercisePopup
        isOpen={isDetailView && !isFreeMode && isExercisePopupOpen}
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

      <ClearAllCodeModal
        isOpen={isClearAllModalOpen}
        onClose={() => setIsClearAllModalOpen(false)}
        onConfirm={confirmClearAllCode}
      />

      {selectedSnippet && (
        <div className="w-full rounded-3xl border border-white/40 bg-white/70 pb-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70">
          <div className="flex min-h-0 flex-col">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-4 py-3 dark:border-gray-700">
              <button
                onClick={handleCloseDetail}
                disabled={closingDetail}
                className="inline-flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-60 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                <ChevronLeft size={16} />
                {closingDetail ? 'Đang xử lý...' : isFreeMode ? 'Quay lại kho code' : 'Ẩn sidebar'}
              </button>

              {isFreeMode && (
                <div className="min-w-[240px] flex-1 rounded-xl border border-sky-200 bg-sky-50/80 px-3 py-2 text-left dark:border-sky-800/70 dark:bg-sky-900/20">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-sky-600 dark:text-sky-300">
                    CodePad
                  </p>
                  <p className="truncate text-sm font-black text-sky-800 dark:text-sky-100">
                    {selectedSnippet.cardTitle || buildFreeSessionTitle()}
                  </p>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <Tooltip text="Chọn ngôn ngữ highlight">
                  <div ref={languageDropdownRef} className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setIsLanguageDropdownOpen((prev) => !prev);
                        setIsThemeDropdownOpen(false);
                      }}
                      className={`group inline-flex h-10 items-center gap-2 rounded-lg border bg-white py-2 pl-3 pr-3 text-sm font-semibold shadow-sm outline-none transition-all duration-200 dark:bg-gray-800 ${
                        isLanguageDropdownOpen
                          ? 'border-blue-400 text-blue-700 ring-2 ring-blue-100 dark:border-blue-500 dark:text-blue-300 dark:ring-blue-900/30'
                          : 'border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50/50 dark:border-gray-600 dark:text-gray-200 dark:hover:border-blue-500 dark:hover:bg-gray-700'
                      }`}
                    >
                      <FileCode2
                        size={16}
                        className="text-gray-500 transition-colors duration-200 group-hover:text-blue-600 dark:text-gray-400 dark:group-hover:text-blue-400"
                      />
                      <span className="max-w-[140px] truncate">
                        {LANGUAGE_OPTIONS.find((option) => option.value === editorLanguage)?.label ||
                          'Plain Text'}
                      </span>
                      <ChevronDown
                        size={15}
                        className={`text-gray-400 transition-transform duration-200 dark:text-gray-500 ${
                          isLanguageDropdownOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {isLanguageDropdownOpen && (
                      <div className="absolute left-0 top-full z-[80] mt-2 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl dark:border-gray-600 dark:bg-gray-800">
                        <div className="max-h-64 overflow-y-auto space-y-0.5">
                          {LANGUAGE_OPTIONS.map((option) => {
                            const isActive = option.value === editorLanguage;
                            return (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => {
                                  setEditorLanguage(option.value);
                                  setIsLanguageDropdownOpen(false);
                                }}
                                className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-all ${
                                  isActive
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                    : 'text-gray-700 hover:bg-blue-50 dark:text-gray-300 dark:hover:bg-blue-900/20'
                                }`}
                              >
                                {option.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </Tooltip>

                {!isFreeMode && (
                  <button
                    onClick={() => setIsExercisePopupOpen(true)}
                    className="inline-flex h-10 items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:border-blue-300 hover:bg-blue-50/60 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-blue-500 dark:hover:bg-gray-700"
                  >
                    <FileCode2 size={15} />
                    Danh sách bài tập
                  </button>
                )}

                <Tooltip text="Chọn theme editor">
                  <div ref={themeDropdownRef} className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setIsThemeDropdownOpen((prev) => !prev);
                        setIsLanguageDropdownOpen(false);
                      }}
                      className={`group inline-flex h-10 items-center gap-2 rounded-lg border bg-white py-2 pl-3 pr-3 text-sm font-semibold shadow-sm outline-none transition-all duration-200 dark:bg-gray-800 ${
                        isThemeDropdownOpen
                          ? 'border-purple-400 text-purple-700 ring-2 ring-purple-100 dark:border-purple-500 dark:text-purple-300 dark:ring-purple-900/30'
                          : 'border-gray-200 text-gray-700 hover:border-purple-300 hover:bg-purple-50/50 dark:border-gray-600 dark:text-gray-200 dark:hover:border-purple-500 dark:hover:bg-gray-700'
                      }`}
                    >
                      <Palette
                        size={16}
                        className="text-gray-500 transition-colors duration-200 group-hover:text-purple-600 dark:text-gray-400 dark:group-hover:text-purple-400"
                      />
                      <span className="max-w-[140px] truncate">
                        {CODE_EDITOR_THEME_OPTIONS.find((theme) => theme.key === editorTheme)?.label ||
                          'Theme'}
                      </span>
                      <ChevronDown
                        size={15}
                        className={`text-gray-400 transition-transform duration-200 dark:text-gray-500 ${
                          isThemeDropdownOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {isThemeDropdownOpen && (
                      <div className="absolute left-0 top-full z-[80] mt-2 w-60 overflow-hidden rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl dark:border-gray-600 dark:bg-gray-800">
                        <div className="max-h-64 overflow-y-auto space-y-0.5">
                          {CODE_EDITOR_THEME_OPTIONS.map((theme) => {
                            const isActive = theme.key === editorTheme;
                            return (
                              <button
                                key={theme.key}
                                type="button"
                                onClick={() => {
                                  setEditorTheme(theme.key);
                                  setIsThemeDropdownOpen(false);
                                }}
                                className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-all ${
                                  isActive
                                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                                    : 'text-gray-700 hover:bg-purple-50 dark:text-gray-300 dark:hover:bg-purple-900/20'
                                }`}
                              >
                                {theme.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </Tooltip>

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

                {isFreeMode && (
                  <>
                    <button
                      onClick={handleSaveFreeSessionToVault}
                      className="inline-flex items-center gap-1 rounded-xl bg-violet-600 px-3 py-2 text-sm font-bold text-white hover:bg-violet-700"
                    >
                      <Save size={16} />
                      Lưu vào kho bài tập
                    </button>

                    <button
                      onClick={handleClearAllCode}
                      className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900/70 dark:bg-rose-900/20 dark:text-rose-300 dark:hover:bg-rose-900/30"
                    >
                      <Eraser size={16} />
                      Clear All
                    </button>

                    <button
                      onClick={handleGenerateShareLink}
                      className="inline-flex items-center gap-1 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-100 dark:border-teal-900/70 dark:bg-teal-900/20 dark:text-teal-300 dark:hover:bg-teal-900/30"
                    >
                      <Link2 size={16} />
                      Tạo link chia sẻ
                    </button>
                  </>
                )}
              </div>
            </div>

            {!isFreeMode && (
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
                <HtmlPreviewer
                  rawHtml={selectedSnippet.assignmentDescription || selectedSnippet.formattedDescription || ''}
                  className="mt-2"
                  emptyMessage="Chưa có mô tả"
                />
              </div>
              </div>
            )}

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

              {!isFreeMode && runningAction === 'judge' && (
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
              <div className={`h-[62vh] min-h-[420px] overflow-hidden rounded-2xl border border-gray-200 shadow-sm dark:border-gray-700 xl:h-full xl:min-h-0 ${editorTheme === 'nightmare' ? 'nightmare-editor-frame' : ''}`}>
                <MonacoCodeEditor
                  language={editorLanguage}
                  themeKey={editorTheme}
                  value={editorCode}
                  onChange={setEditorCode}
                  isFreeMode={isFreeMode}
                />
              </div>

              <div className="flex min-h-0 flex-col gap-3 xl:h-full">
                <div className="flex items-center gap-2">
                  <Tooltip text="Chạy code">
                    <button
                      onClick={handleRunCode}
                      disabled={runningCode}
                      className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Play size={16} />
                      {runningAction === 'run' ? 'Đang chạy...' : 'Run'}
                    </button>
                  </Tooltip>

                  {!isFreeMode && (
                    <Tooltip text="Chấm bài">
                      <button
                        onClick={handleJudge}
                        disabled={runningCode}
                        className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Sparkles size={16} />
                        {runningAction === 'judge' ? 'Đang chấm...' : 'Chấm bài'}
                      </button>
                    </Tooltip>
                  )}

                  <button
                    onClick={handleClearConsole}
                    className="inline-flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    <RotateCcw size={16} />
                    Xóa output
                  </button>
                </div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {isFreeMode
                    ? 'Ctrl + Enter: Run'
                    : 'Ctrl + Enter: Run | Ctrl + Shift + Enter: Chấm bài'}
                </p>
                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  {isFreeMode
                    ? 'CodePad tự lưu bản nháp cục bộ mỗi 5 giây.'
                    : 'Auto-save bản nháp local mỗi 5 giây.'}
                </p>

                {(() => {
                  const terminalTheme = getCodeEditorThemeConfig(editorTheme).terminal;
                  const isNightmareTerminal = editorTheme === 'nightmare';
                  return (
                    <>
                      <div
                        className={`overflow-hidden rounded-2xl border shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-colors duration-300 ${isNightmareTerminal ? 'nightmare-terminal-panel' : ''}`}
                        style={{
                          backgroundColor: terminalTheme.panelBackground,
                          borderColor: terminalTheme.border,
                        }}
                      >
                        <div
                          className={`border-b px-3 py-2 text-xs font-bold uppercase tracking-wide transition-colors duration-300 ${isNightmareTerminal ? 'nightmare-terminal-header' : ''}`}
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
                          className={`h-36 w-full resize-none p-3 font-mono text-sm leading-6 outline-none transition-colors duration-300 placeholder:opacity-50 xl:h-[220px] ${isNightmareTerminal ? 'nightmare-terminal-body nightmare-terminal-input' : ''}`}
                          style={{
                            backgroundColor: terminalTheme.bodyBackground,
                            color: terminalTheme.text,
                          }}
                        />
                      </div>

                      <div
                        className={`overflow-hidden rounded-2xl border shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-colors duration-300 ${isNightmareTerminal ? 'nightmare-terminal-panel' : ''}`}
                        style={{
                          backgroundColor: terminalTheme.panelBackground,
                          borderColor: terminalTheme.border,
                        }}
                      >
                        <div
                          className={`border-b px-3 py-2 text-xs font-bold uppercase tracking-wide transition-colors duration-300 ${isNightmareTerminal ? 'nightmare-terminal-header' : ''}`}
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
                            className={`h-36 overflow-auto whitespace-pre-wrap p-3 font-mono text-sm leading-6 transition-colors duration-300 xl:h-[190px] ${isNightmareTerminal ? 'nightmare-terminal-body' : ''}`}
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
                              aria-label="Code preview"
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

            {!isFreeMode && judgeCompilerError && (
              <div className="mx-4 mb-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 shadow-sm dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300">
                <p className="text-sm font-black">Lỗi biên dịch (compiler_error)</p>
                <pre className="mt-2 whitespace-pre-wrap font-mono text-xs">
                  {judgeCompilerError}
                </pre>
              </div>
            )}

            {!isFreeMode && !judgeCompilerError && (
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
              Hỗ trợ chạy: Plain Text, C++, C, C#, Python, Java, Ruby, Rust, Golang, Swift.
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
