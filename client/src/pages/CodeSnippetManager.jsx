import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import hljs from 'highlight.js';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  CalendarDays,
  ChevronLeft,
  Copy,
  Download,
  FileCode2,
  Moon,
  Play,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
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

const CODE_EDITOR_THEME_STORAGE_KEY = 'whalio.code-editor-theme';

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
.code-editor-light .hljs-meta .hljs-keyword,
.code-editor-light .hljs-doctag {
  color: #0f4ec7;
  font-weight: 700;
}
.code-editor-light .hljs-title,
.code-editor-light .hljs-title.function_,
.code-editor-light .hljs-title.class_ {
  color: #c2410c;
  font-weight: 700;
}
.code-editor-light .hljs-built_in,
.code-editor-light .hljs-type,
.code-editor-light .hljs-literal {
  color: #7c3aed;
}
.code-editor-light .hljs-string,
.code-editor-light .hljs-regexp,
.code-editor-light .hljs-attr,
.code-editor-light .hljs-attribute {
  color: #047857;
}
.code-editor-light .hljs-number,
.code-editor-light .hljs-symbol,
.code-editor-light .hljs-bullet,
.code-editor-light .hljs-link {
  color: #b45309;
}
.code-editor-light .hljs-variable,
.code-editor-light .hljs-template-variable {
  color: #be123c;
}
.code-editor-light .hljs-comment,
.code-editor-light .hljs-quote {
  color: #6b7280;
  font-style: italic;
}
.code-editor-dark .hljs-keyword,
.code-editor-dark .hljs-selector-tag,
.code-editor-dark .hljs-meta .hljs-keyword,
.code-editor-dark .hljs-doctag {
  color: #7dd3fc;
  font-weight: 700;
}
.code-editor-dark .hljs-title,
.code-editor-dark .hljs-title.function_,
.code-editor-dark .hljs-title.class_ {
  color: #fb923c;
  font-weight: 700;
}
.code-editor-dark .hljs-built_in,
.code-editor-dark .hljs-type,
.code-editor-dark .hljs-literal {
  color: #c4b5fd;
}
.code-editor-dark .hljs-string,
.code-editor-dark .hljs-regexp,
.code-editor-dark .hljs-attr,
.code-editor-dark .hljs-attribute {
  color: #6ee7b7;
}
.code-editor-dark .hljs-number,
.code-editor-dark .hljs-symbol,
.code-editor-dark .hljs-bullet,
.code-editor-dark .hljs-link {
  color: #fbbf24;
}
.code-editor-dark .hljs-variable,
.code-editor-dark .hljs-template-variable {
  color: #fda4af;
}
.code-editor-dark .hljs-comment,
.code-editor-dark .hljs-quote {
  color: #94a3b8;
  font-style: italic;
}
.code-editor-light .hljs-operator,
.code-editor-light .hljs-punctuation {
  color: #475569;
}
.code-editor-dark .hljs-operator,
.code-editor-dark .hljs-punctuation {
  color: #cbd5e1;
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

const INDENT_UNIT = '  ';
const AUTO_PAIR_MAP = {
  '(': ')',
  '[': ']',
  '{': '}',
  '"': '"',
  "'": "'",
  '`': '`',
};
const OPENING_CHARS = new Set(Object.keys(AUTO_PAIR_MAP));
const CLOSING_CHARS = new Set(Object.values(AUTO_PAIR_MAP));
const JS_LIKE_LANGUAGES = new Set(['javascript', 'typescript', 'cpp', 'java']);
const AUTO_FORMAT_LINE_LANGUAGES = new Set(['javascript', 'typescript', 'cpp', 'java']);
const LOCAL_RUN_LANGUAGES = new Set(['plaintext', 'json', 'html', 'css']);
const REMOTE_RUN_LANGUAGES = new Set(['cpp', 'javascript', 'typescript', 'python', 'java', 'sql']);

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

const runJavaScriptInWorker = ({ code, input, timeoutMs = 5000 }) => {
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
      reject(new Error('Code chạy quá lâu (>5 giây). Hãy kiểm tra vòng lặp vô hạn.'));
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

  const applyEditorMutation = (target, nextValue, caretStart, caretEnd = caretStart) => {
    onChange(nextValue);
    window.requestAnimationFrame(() => {
      target.selectionStart = caretStart;
      target.selectionEnd = caretEnd;
      syncScroll(target);
    });
  };

  const outdentLine = (line) => {
    if (line.startsWith(INDENT_UNIT)) {
      return { line: line.slice(INDENT_UNIT.length), removed: INDENT_UNIT.length };
    }
    if (line.startsWith('\t')) {
      return { line: line.slice(1), removed: 1 };
    }
    const leadingSpaces = (line.match(/^ +/) || [''])[0].length;
    const removed = Math.min(INDENT_UNIT.length, leadingSpaces);
    return { line: line.slice(removed), removed };
  };

  const handleKeyDown = (event) => {
    const target = event.currentTarget;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    const hasSelection = start !== end;
    const key = event.key;
    const before = value.slice(0, start);
    const selected = value.slice(start, end);
    const after = value.slice(end);

    if (key === 'Tab') {
      event.preventDefault();

      if (hasSelection) {
        const lineStart = value.lastIndexOf('\n', start - 1) + 1;
        let lineEnd = value.indexOf('\n', end);
        if (lineEnd === -1) lineEnd = value.length;

        const block = value.slice(lineStart, lineEnd);
        const lines = block.split('\n');

        if (event.shiftKey) {
          let removedTotal = 0;
          let removedFirstLine = 0;
          const nextLines = lines.map((line, index) => {
            const { line: nextLine, removed } = outdentLine(line);
            removedTotal += removed;
            if (index === 0) removedFirstLine = removed;
            return nextLine;
          });

          const nextBlock = nextLines.join('\n');
          const nextValue = `${value.slice(0, lineStart)}${nextBlock}${value.slice(lineEnd)}`;
          const nextStart = Math.max(lineStart, start - removedFirstLine);
          const nextEnd = Math.max(nextStart, end - removedTotal);
          applyEditorMutation(target, nextValue, nextStart, nextEnd);
          return;
        }

        const nextBlock = lines.map((line) => `${INDENT_UNIT}${line}`).join('\n');
        const nextValue = `${value.slice(0, lineStart)}${nextBlock}${value.slice(lineEnd)}`;
        const nextStart = start + INDENT_UNIT.length;
        const nextEnd = end + INDENT_UNIT.length * lines.length;
        applyEditorMutation(target, nextValue, nextStart, nextEnd);
        return;
      }

      const nextValue = `${before}${INDENT_UNIT}${after}`;
      const nextCaret = start + INDENT_UNIT.length;
      applyEditorMutation(target, nextValue, nextCaret);
      return;
    }

    if (key === 'Enter') {
      event.preventDefault();

      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const lineBeforeCursor = value.slice(lineStart, start);
      const formattedLineBeforeCursor = autoFormatCommittedLine(lineBeforeCursor, language).replace(/[ \t]+$/g, '');
      const currentIndent = (formattedLineBeforeCursor.match(/^\s*/) || [''])[0];
      const previousChar = formattedLineBeforeCursor.trimEnd().slice(-1);
      const nextChar = value.slice(end, end + 1);
      const shouldIndent = previousChar === '{' || previousChar === '[' || previousChar === '(';

      if (
        !hasSelection &&
        shouldIndent &&
        nextChar &&
        ((previousChar === '{' && nextChar === '}') ||
          (previousChar === '[' && nextChar === ']') ||
          (previousChar === '(' && nextChar === ')'))
      ) {
        const linePrefix = `${value.slice(0, lineStart)}${formattedLineBeforeCursor}`;
        const nextValue = `${linePrefix}\n${currentIndent}${INDENT_UNIT}\n${currentIndent}${value.slice(end)}`;
        const nextCaret = linePrefix.length + 1 + currentIndent.length + INDENT_UNIT.length;
        applyEditorMutation(target, nextValue, nextCaret);
        return;
      }

      const normalizedBefore = `${value.slice(0, lineStart)}${formattedLineBeforeCursor}`;
      const nextIndent = shouldIndent ? `${currentIndent}${INDENT_UNIT}` : currentIndent;
      const nextValue = `${normalizedBefore}\n${nextIndent}${value.slice(end)}`;
      const nextCaret = normalizedBefore.length + 1 + nextIndent.length;
      applyEditorMutation(target, nextValue, nextCaret);
      return;
    }

    if (key === 'Backspace' && !hasSelection && start > 0) {
      const previousChar = value[start - 1];
      const nextChar = value[start];
      if (AUTO_PAIR_MAP[previousChar] === nextChar) {
        event.preventDefault();
        const nextValue = `${value.slice(0, start - 1)}${value.slice(start + 1)}`;
        applyEditorMutation(target, nextValue, start - 1);
        return;
      }
    }

    if (OPENING_CHARS.has(key) && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      const closeChar = AUTO_PAIR_MAP[key];
      const previousChar = value[start - 1] || '';
      const nextChar = value[end] || '';
      const isQuote = key === '"' || key === "'" || key === '`';

      if (isQuote && !hasSelection) {
        if (nextChar === key) {
          applyEditorMutation(target, value, start + 1);
          return;
        }
        if (/\w/.test(previousChar)) {
          const nextValue = `${before}${key}${after}`;
          applyEditorMutation(target, nextValue, start + 1);
          return;
        }
      }

      if (hasSelection) {
        const nextValue = `${before}${key}${selected}${closeChar}${after}`;
        applyEditorMutation(target, nextValue, start + 1, end + 1);
        return;
      }

      const nextValue = `${before}${key}${closeChar}${after}`;
      applyEditorMutation(target, nextValue, start + 1);
      return;
    }

    if (CLOSING_CHARS.has(key) && !hasSelection) {
      const nextChar = value[start] || '';
      if (nextChar === key) {
        event.preventDefault();
        applyEditorMutation(target, value, start + 1);
      }
    }
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
      return savedTheme === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });
  const [closingDetail, setClosingDetail] = useState(false);
  const [programInput, setProgramInput] = useState('');
  const [programOutput, setProgramOutput] = useState('');
  const [programError, setProgramError] = useState('');
  const [programPreviewHtml, setProgramPreviewHtml] = useState('');
  const [runningCode, setRunningCode] = useState(false);

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
      subjectName: String(createForm.subjectName || '').trim(),
      assignmentName: String(createForm.assignmentName || '').trim(),
      assignmentDescription: String(createForm.assignmentDescription || '').trim(),
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
        toast.success('Đã tạo card code mới');
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

  const handleOpenDetail = (snippet) => {
    setSelectedSnippet(snippet);
    setEditorCode(String(snippet.code || ''));
    setEditorLanguage(String(snippet.language || inferLanguageFromSubject(snippet.subjectName)));
    setProgramInput('');
    setProgramOutput('');
    setProgramError('');
    setProgramPreviewHtml('');
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

  const handleRunCode = async () => {
    const source = String(editorCode || '');
    if (!source.trim()) {
      toast.error('Vui lòng nhập code trước khi chạy');
      return;
    }

    if (editorLanguage !== 'plaintext') {
      const issues = collectCodeIssues(source, editorLanguage);
      if (issues.length > 0) {
        const issueText = issues.join('\n');
        setProgramError(issueText);
        setProgramOutput('');
        setProgramPreviewHtml('');
        toast.error('Code đang có lỗi cú pháp');
        return;
      }
    }

    setRunningCode(true);
    setProgramError('');
    setProgramOutput('Đang chạy...');
    setProgramPreviewHtml('');

    try {
      if (LOCAL_RUN_LANGUAGES.has(editorLanguage)) {
        const localResult = runLocalLanguage({
          language: editorLanguage,
          code: source,
          input: programInput,
        });
        setProgramOutput(String(localResult.output || '(Không có output)'));
        setProgramPreviewHtml(String(localResult.previewHtml || ''));
        toast.success('Chạy code thành công');
        return;
      }

      if (editorLanguage === 'javascript') {
        const remoteResult = await codeSnippetService.runSnippet({
          language: editorLanguage,
          code: source,
          input: String(programInput || ''),
        });

        if (remoteResult?.success) {
          setProgramOutput(String(remoteResult.output || '(Không có output)'));
          setProgramPreviewHtml('');
          toast.success('Chạy code thành công');
          return;
        }

        const remoteError = String(remoteResult?.error || remoteResult?.message || '').trim();
        const canFallbackToLocalWorker = /lỗi kết nối server/i.test(remoteError);

        if (!canFallbackToLocalWorker) {
          setProgramError(remoteError || 'Lỗi chạy code');
          setProgramOutput('');
          setProgramPreviewHtml('');
          toast.error('Chạy code thất bại');
          return;
        }

        // Offline fallback only when backend connection fails.
        const jsOutput = await runJavaScriptInWorker({
          code: source,
          input: String(programInput || ''),
        });
        setProgramOutput(jsOutput);
        setProgramPreviewHtml('');
        toast.success('Chạy code thành công');
        return;
      }

      if (!REMOTE_RUN_LANGUAGES.has(editorLanguage)) {
        const unsupportedMessage = 'Ngôn ngữ này hiện chưa hỗ trợ chạy.';
        setProgramError(unsupportedMessage);
        setProgramOutput('');
        setProgramPreviewHtml('');
        toast.error(unsupportedMessage);
        return;
      }

      const result = await codeSnippetService.runSnippet({
        language: editorLanguage,
        code: source,
        input: String(programInput || ''),
      });

      if (!result?.success) {
        const message = String(result?.error || result?.message || 'Lỗi chạy code');
        setProgramError(message);
        setProgramOutput('');
        setProgramPreviewHtml('');
        toast.error('Chạy code thất bại');
        return;
      }

      setProgramOutput(String(result.output || '(Không có output)'));
      setProgramPreviewHtml(String(result.previewHtml || ''));
      toast.success('Chạy code thành công');
    } catch (error) {
      const message = String(error?.message || 'Lỗi runtime');
      setProgramError(message);
      setProgramOutput('');
      setProgramPreviewHtml('');
      toast.error('Chạy code thất bại');
    } finally {
      setRunningCode(false);
    }
  };

  const handleClearConsole = () => {
    setProgramOutput('');
    setProgramError('');
    setProgramPreviewHtml('');
  };

  const filteredSnippets = useMemo(() => {
    const keyword = String(searchQuery || '').trim().toLowerCase();
    if (!keyword) return snippets;

    return snippets.filter((snippet) => {
      const cardTitle = String(snippet.cardTitle || '').toLowerCase();
      const subjectName = String(snippet.subjectName || '').toLowerCase();
      const assignmentName = String(snippet.assignmentName || '').toLowerCase();

      return (
        cardTitle.includes(keyword) ||
        subjectName.includes(keyword) ||
        assignmentName.includes(keyword)
      );
    });
  }, [snippets, searchQuery]);

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

      {!loading && username && (
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

      {!loading && username && snippets.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-800">
          Chưa có card code nào. Hãy bấm "Thêm code" để bắt đầu.
        </div>
      )}

      {!loading && username && snippets.length > 0 && filteredSnippets.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-800">
          Không tìm thấy card phù hợp với từ khóa "{searchQuery}".
        </div>
      )}

      {!loading && username && filteredSnippets.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredSnippets.map((snippet) => {
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
                <div className="prose prose-sm mt-2 max-w-none dark:prose-invert">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      table: (props) => (
                        <div className="my-3 overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-600">
                          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700" {...props} />
                        </div>
                      ),
                      thead: (props) => (
                        <thead className="bg-gray-50 dark:bg-gray-700/60" {...props} />
                      ),
                      th: (props) => (
                        <th
                          className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-blue-700 dark:text-blue-300"
                          {...props}
                        />
                      ),
                      td: (props) => (
                        <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-200" {...props} />
                      ),
                    }}
                  >
                    {selectedSnippet.assignmentDescription || 'Chưa có mô tả'}
                  </ReactMarkdown>
                </div>
              </div>
            </div>

            <div className="grid gap-3 p-4 xl:h-[75vh] xl:min-h-[75vh] xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="h-[62vh] min-h-[420px] overflow-hidden rounded-2xl border border-gray-200 shadow-sm dark:border-gray-700 xl:h-full xl:min-h-0">
                <HighlightCodeEditor
                  language={editorLanguage}
                  theme={editorTheme}
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
                    {runningCode ? 'Đang chạy...' : 'Run'}
                  </button>

                  <button
                    onClick={handleClearConsole}
                    className="inline-flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    <RotateCcw size={16} />
                    Xóa output
                  </button>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-50/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] dark:border-slate-700/90 dark:bg-slate-900/40">
                  <div className="border-b border-slate-200/90 bg-white/60 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:border-slate-700/90 dark:bg-slate-900/60 dark:text-slate-400">
                    Input
                  </div>
                  <textarea
                    value={programInput}
                    onChange={(event) => setProgramInput(event.target.value)}
                    spellCheck={false}
                    placeholder="Nhập input, mỗi dòng là 1 giá trị..."
                    className="h-36 w-full resize-none bg-transparent p-3 font-mono text-sm leading-6 text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:bg-white/55 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-900/55 xl:h-[220px]"
                  />
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-50/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] dark:border-slate-700/90 dark:bg-slate-900/40">
                  <div className="border-b border-slate-200/90 bg-white/60 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:border-slate-700/90 dark:bg-slate-900/60 dark:text-slate-400">
                    Output
                  </div>
                  <pre className="h-36 overflow-auto whitespace-pre-wrap p-3 font-mono text-sm leading-6 text-slate-800 dark:text-slate-100 xl:h-[190px]">
                    {programOutput || '(Chưa có output)'}
                  </pre>
                  {programPreviewHtml && (
                    <div className="border-t border-slate-200/90 p-2 dark:border-slate-700/90">
                      <iframe
                        title="Code preview"
                        sandbox="allow-scripts"
                        srcDoc={programPreviewHtml}
                        className="h-44 w-full rounded-lg border border-slate-200 bg-white dark:border-slate-600"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

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
