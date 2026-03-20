import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import DOMPurify from 'dompurify';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

const DEFAULT_EMPTY_MESSAGE = 'Chưa có nội dung để xem trước.';

const HTML_TAG_PATTERN = /<\/?[a-z][\s\S]*>/i;
const HTML_DOCUMENT_PATTERN = /<(?:!doctype|html|head|body|style)\b/i;
const HTML_PREVIEW_SCOPE_CLASS = 'whalio-html-preview-root';

const escapeHtml = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const extractHtmlDocumentParts = (input) => {
  const rawValue = String(input || '');
  const styleMatches = [...rawValue.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)];
  const inlineStyles = styleMatches.map((match) => String(match[1] || '').trim()).filter(Boolean).join('\n');
  const bodyMatch = rawValue.match(/<body[^>]*>([\s\S]*?)<\/body>/i);

  return {
    inlineStyles,
    bodyHtml: bodyMatch ? String(bodyMatch[1] || '').trim() : rawValue,
  };
};

const normalizePreviewHtml = (input) => {
  const rawValue = String(input || '');
  if (!rawValue.trim()) return '';

  if (!HTML_TAG_PATTERN.test(rawValue)) {
    return `<div>${escapeHtml(rawValue).replace(/\n/g, '<br />')}</div>`;
  }

  return rawValue;
};

const sanitizeConfig = {
  USE_PROFILES: { html: true },
  ALLOW_DATA_ATTR: true,
  ADD_ATTR: ['style', 'class', 'target', 'rel', 'colspan', 'rowspan', 'cellpadding', 'cellspacing'],
};

function HtmlPreviewer({
  rawHtml,
  rawMarkdown = '',
  preferredMode = 'auto',
  className = '',
  contentClassName = '',
  emptyMessage = DEFAULT_EMPTY_MESSAGE,
}) {
  const [isCompactViewport, setIsCompactViewport] = useState(false);
  const deferredRawHtml = useDeferredValue(rawHtml);
  const deferredRawMarkdown = useDeferredValue(rawMarkdown);
  const [previewState, setPreviewState] = useState({
    mode: 'empty',
    html: '',
    markdown: '',
    inlineStyles: '',
  });

  const normalizedHtml = useMemo(
    () => String(deferredRawHtml || '').trim(),
    [deferredRawHtml]
  );
  const normalizedMarkdown = useMemo(
    () => String(deferredRawMarkdown || '').trim(),
    [deferredRawMarkdown]
  );

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;

    const mediaQuery = window.matchMedia('(max-width: 1024px), (pointer: coarse)');
    const updateViewportMode = () => {
      setIsCompactViewport(mediaQuery.matches || window.innerWidth < 1024);
    };

    updateViewportMode();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updateViewportMode);
    } else if (typeof mediaQuery.addListener === 'function') {
      mediaQuery.addListener(updateViewportMode);
    }

    window.addEventListener('resize', updateViewportMode);
    window.addEventListener('orientationchange', updateViewportMode);

    return () => {
      if (typeof mediaQuery.removeEventListener === 'function') {
        mediaQuery.removeEventListener('change', updateViewportMode);
      } else if (typeof mediaQuery.removeListener === 'function') {
        mediaQuery.removeListener(updateViewportMode);
      }
      window.removeEventListener('resize', updateViewportMode);
      window.removeEventListener('orientationchange', updateViewportMode);
    };
  }, []);

  const selectedSource = useMemo(() => {
    const hasHtml = Boolean(normalizedHtml);
    const hasMarkdown = Boolean(normalizedMarkdown);

    if (!hasHtml && !hasMarkdown) {
      return { mode: 'empty', value: '' };
    }

    if (preferredMode === 'html') {
      return hasHtml
        ? { mode: 'html', value: normalizedHtml }
        : { mode: 'markdown', value: normalizedMarkdown };
    }

    if (preferredMode === 'markdown') {
      return hasMarkdown
        ? { mode: 'markdown', value: normalizedMarkdown }
        : { mode: 'html', value: normalizedHtml };
    }

    if (isCompactViewport) {
      return hasMarkdown
        ? { mode: 'markdown', value: normalizedMarkdown }
        : { mode: 'html', value: normalizedHtml };
    }

    return hasHtml
      ? { mode: 'html', value: normalizedHtml }
      : { mode: 'markdown', value: normalizedMarkdown };
  }, [isCompactViewport, normalizedHtml, normalizedMarkdown, preferredMode]);

  const isHtmlMode = useMemo(
    () =>
      selectedSource.mode === 'html' &&
      (HTML_DOCUMENT_PATTERN.test(selectedSource.value) || HTML_TAG_PATTERN.test(selectedSource.value)),
    [selectedSource.mode, selectedSource.value]
  );

  useEffect(() => {
    let isMounted = true;
    const frameId = window.requestAnimationFrame(() => {
      if (selectedSource.mode === 'empty' || !selectedSource.value) {
        if (isMounted) {
          setPreviewState({
            mode: 'empty',
            html: '',
            markdown: '',
            inlineStyles: '',
          });
        }
        return;
      }

      if (isHtmlMode) {
        const { bodyHtml, inlineStyles } = extractHtmlDocumentParts(selectedSource.value);
        const nextHtml = DOMPurify.sanitize(normalizePreviewHtml(bodyHtml), sanitizeConfig);
        const nextStyles = inlineStyles
          ? DOMPurify.sanitize(inlineStyles, {
              ALLOWED_TAGS: [],
              ALLOWED_ATTR: [],
            })
          : '';

        if (isMounted) {
          setPreviewState({
            mode: 'html',
            html: nextHtml,
            markdown: '',
            inlineStyles: nextStyles,
          });
        }
        return;
      }

      const nextMarkdown = DOMPurify.sanitize(selectedSource.value, sanitizeConfig);
      if (isMounted) {
        setPreviewState({
          mode: 'markdown',
          html: '',
          markdown: nextMarkdown,
          inlineStyles: '',
        });
      }
    });

    return () => {
      isMounted = false;
      window.cancelAnimationFrame(frameId);
    };
  }, [isHtmlMode, selectedSource.mode, selectedSource.value]);

  const sharedContentClassName = [
    'max-w-none break-words text-slate-700',
    '[&_a]:text-blue-600 [&_a]:underline [&_a]:underline-offset-2',
    '[&_blockquote]:border-l-4 [&_blockquote]:border-slate-200 [&_blockquote]:pl-4 [&_blockquote]:italic',
    '[&_code]:rounded-md [&_code]:bg-slate-900 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em] [&_code]:text-slate-100',
    '[&_div]:max-w-full [&_div]:break-words',
    '[&_h1]:mb-4 [&_h1]:text-3xl [&_h1]:font-black [&_h1]:text-slate-900',
    '[&_h2]:mb-3 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-slate-900',
    '[&_h3]:mb-3 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-slate-900',
    '[&_hr]:my-5 [&_hr]:border-slate-200',
    '[&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-xl',
    '[&_li]:mb-1',
    '[&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6',
    '[&_p]:my-3 [&_p]:leading-7',
    '[&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-2xl [&_pre]:bg-slate-950 [&_pre]:p-4 [&_pre]:text-slate-100',
    '[&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_table]:overflow-hidden',
    '[&_tbody_tr:nth-child(even)]:bg-white/70',
    '[&_td]:border [&_td]:border-slate-200 [&_td]:px-4 [&_td]:py-2.5 [&_td]:align-top',
    '[&_th]:border [&_th]:border-slate-200 [&_th]:bg-white [&_th]:px-4 [&_th]:py-2.5 [&_th]:text-left [&_th]:font-bold [&_th]:text-slate-900',
    '[&_thead]:bg-white',
    '[&_tr]:transition-colors',
    '[&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6',
    contentClassName,
  ]
    .filter(Boolean)
    .join(' ');

  const iframeSrcDoc = useMemo(() => {
    if (previewState.mode !== 'html') return '';

    return `<!doctype html>
<html lang="vi">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      html, body {
        margin: 0;
        padding: 0;
        background: #f8fafc;
        color: #334155;
        font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        line-height: 1.6;
      }
      body {
        padding: 24px;
      }
      img, table {
        max-width: 100%;
      }
      pre {
        white-space: pre-wrap;
      }
    </style>
    ${previewState.inlineStyles ? `<style>${previewState.inlineStyles}</style>` : ''}
  </head>
  <body>
    <div class="${HTML_PREVIEW_SCOPE_CLASS}">${previewState.html}</div>
  </body>
</html>`;
  }, [previewState.html, previewState.inlineStyles, previewState.mode]);

  if (previewState.mode === 'empty') {
    return (
      <div
        className={`rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500 ${className}`.trim()}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border border-slate-200 bg-slate-50 p-6 ${className}`.trim()}>
      {previewState.mode === 'html' ? (
        <iframe
          title="HTML assignment preview"
          sandbox=""
          srcDoc={iframeSrcDoc}
          className="min-h-[420px] w-full rounded-2xl border border-slate-200 bg-white"
        />
      ) : (
        <div className={sharedContentClassName}>
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
            {previewState.markdown}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}

export default HtmlPreviewer;
