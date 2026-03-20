import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import DOMPurify from 'dompurify';

const DEFAULT_EMPTY_MESSAGE = 'Chưa có nội dung để xem trước.';

const HTML_TAG_PATTERN = /<\/?[a-z][\s\S]*>/i;

const escapeHtml = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

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
  className = '',
  contentClassName = '',
  emptyMessage = DEFAULT_EMPTY_MESSAGE,
}) {
  const deferredRawHtml = useDeferredValue(rawHtml);
  const [sanitizedHtml, setSanitizedHtml] = useState('');

  const normalizedHtml = useMemo(
    () => normalizePreviewHtml(deferredRawHtml),
    [deferredRawHtml]
  );

  useEffect(() => {
    let isMounted = true;
    const frameId = window.requestAnimationFrame(() => {
      const nextHtml = normalizedHtml
        ? DOMPurify.sanitize(normalizedHtml, sanitizeConfig)
        : '';
      if (isMounted) {
        setSanitizedHtml(nextHtml);
      }
    });

    return () => {
      isMounted = false;
      window.cancelAnimationFrame(frameId);
    };
  }, [normalizedHtml]);

  if (!sanitizedHtml) {
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
      <div
        className={[
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
          .join(' ')}
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      />
    </div>
  );
}

export default HtmlPreviewer;
