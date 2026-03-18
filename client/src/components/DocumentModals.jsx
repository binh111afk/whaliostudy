import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  X,
  Upload,
  FileText,
  CloudUpload,
  Trash2,
  AlertCircle,
  FileSpreadsheet,
  Image,
  File as FileIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Check,
  BookOpen,
  Brain,
  Sigma,
  Calculator,
  Landmark,
  Scale,
  Shield,
  GraduationCap,
  NotebookPen,
} from 'lucide-react';
import Tooltip from './Tooltip';
import { documentService } from '../services/documentService';
import { toast } from 'sonner';

const DEFAULT_SUBJECTS = [
  { id: 1, name: 'Cơ sở toán trong CNTT' },
  { id: 2, name: 'Tâm lý học đại cương' },
  { id: 3, name: 'Kinh tế chính trị' },
  { id: 4, name: 'Chủ nghĩa xã hội' },
  { id: 5, name: 'Tâm lý học giáo dục' },
  { id: 6, name: 'Lập trình C++' },
  { id: 7, name: 'Toán rời rạc' },
  { id: 8, name: 'Xác suất thống kê' },
  { id: 9, name: 'Triết học Mác Lenin' },
  { id: 10, name: 'Pháp luật đại cương' },
  { id: 11, name: 'Quân sự' },
  { id: 'other', name: 'Tài liệu khác' },
];

// Chuyển từ response API sang format SubjectPicker dùng
const apiSubjectsToOptions = (apiSubjects) =>
  apiSubjects.map((s) => ({
    id: s._id || s.id,
    value: s.name,
    name: s.name,
  }));

// Fallback nếu API chưa tải xong
const createFallbackSubjects = () =>
  DEFAULT_SUBJECTS.map((s) => ({ ...s, value: String(s.id) }));

const DROPDOWN_MOTION = {
  initial: { opacity: 0, y: -10, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -8, scale: 0.98 },
  transition: { duration: 0.18, ease: 'easeOut' },
};

const FIELD_WRAPPER_BASE =
  'group flex min-h-[54px] items-center gap-3 rounded-2xl border bg-white px-4 py-3 shadow-sm transition-all dark:bg-slate-800';

const createInitialSubjects = () =>
  DEFAULT_SUBJECTS.map((subject) => ({
    ...subject,
    value: String(subject.id),
  }));

const normalizeString = (value = '') =>
  value.trim().toLowerCase().replace(/\s+/g, ' ');

const createCustomSubjectOption = (subjectName) => ({
  id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  value: subjectName,
  name: subjectName,
  isCustom: true,
});

const filterSubjectOptions = (subjects, keyword) => {
  const normalizedKeyword = normalizeString(keyword);
  if (!normalizedKeyword) return subjects;

  return subjects.filter((subject) =>
    normalizeString(subject.name).includes(normalizedKeyword)
  );
};

const ensureSubjectOption = (subjects, subjectValue) => {
  const normalizedValue = normalizeString(subjectValue);
  if (!normalizedValue) return subjects;

  const exists = subjects.some(
    (subject) =>
      String(subject.value) === String(subjectValue) ||
      normalizeString(subject.name) === normalizedValue
  );

  if (exists) return subjects;
  return [createCustomSubjectOption(subjectValue), ...subjects];
};

const getFileIconProps = (fileName) => {
  const ext = fileName?.split('.').pop()?.toLowerCase() || '';

  if (['pdf'].includes(ext)) {
    return { icon: FileText, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-500/10' };
  }
  if (['doc', 'docx'].includes(ext)) {
    return { icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-500/10' };
  }
  if (['xls', 'xlsx', 'csv'].includes(ext)) {
    return {
      icon: FileSpreadsheet,
      color: 'text-green-600',
      bg: 'bg-green-50 dark:bg-green-500/10',
    };
  }
  if (['ppt', 'pptx'].includes(ext)) {
    return {
      icon: FileText,
      color: 'text-orange-500',
      bg: 'bg-orange-50 dark:bg-orange-500/10',
    };
  }
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
    return { icon: Image, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-500/10' };
  }

  return { icon: FileIcon, color: 'text-gray-500', bg: 'bg-gray-50 dark:bg-slate-700/60' };
};

const getSubjectVisual = (subjectName = '') => {
  const normalizedName = normalizeString(subjectName);

  if (/(toán|giải tích|xác suất|thống kê)/.test(normalizedName)) {
    return {
      icon: Calculator,
      tone: 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300',
    };
  }
  if (/(rời rạc|sigma|logic)/.test(normalizedName)) {
    return {
      icon: Sigma,
      tone: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300',
    };
  }
  if (/(lập trình|cntt|code|c\+\+|tin)/.test(normalizedName)) {
    return {
      icon: BookOpen,
      tone: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300',
    };
  }
  if (/(tâm lý)/.test(normalizedName)) {
    return {
      icon: Brain,
      tone: 'bg-pink-50 text-pink-600 dark:bg-pink-500/10 dark:text-pink-300',
    };
  }
  if (/(kinh tế|chính trị)/.test(normalizedName)) {
    return {
      icon: Landmark,
      tone: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300',
    };
  }
  if (/(pháp luật|luật)/.test(normalizedName)) {
    return {
      icon: Scale,
      tone: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300',
    };
  }
  if (/(quân sự|quốc phòng)/.test(normalizedName)) {
    return {
      icon: Shield,
      tone: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300',
    };
  }
  if (/(giáo dục|sư phạm)/.test(normalizedName)) {
    return {
      icon: GraduationCap,
      tone: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300',
    };
  }

  return {
    icon: NotebookPen,
    tone: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200',
  };
};

const PublicVisibilitySvg = ({ className = 'h-5 w-5' }) => (
  <svg
    className={className}
    fill="#009dff"
    viewBox="0 0 512 512"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path d="M93.8,114.6c-4.7,1.1-1.7,0.9-5.6,1.4C71.5,119.6,83.9,122.8,93.8,114.6z M387.5,121.3c1.2-0.8,5.4-4.9-7.7-8.9 c0.8,4.1-2.7,3.7-2.7,6c9.7,8.8,13.7,24.1,26.1,27.3C405.6,134.7,392.2,129.3,387.5,121.3z M84.9,111.4c1.5,8.9,8.2-9.4,8.3-15.9 c-2.6,1.5-5.2,3-7.9,4.2c6.3,3.2,0.8,6.6-6,11.7C65.5,128.6,92.2,98,84.9,111.4z M256,0C114.6,0,0,114.6,0,256 c0,141.3,114.6,256,256,256c141.4,0,256-114.7,256-256C512,114.6,397.4,0,256,0z M262.8,85.8l1.2,0.4c-4.8,6.2,25,24.3,3.6,25.8 c-20,5.7,8.4-5.2-7.1-3.3C268.7,97.3,254,97.1,262.8,85.8z M141.4,102.2c-7.2-6-29.8,8.2-21.9,4.8c19.6-7.7,1.3,0.8,5.9,10 c-4.2,8.7-1.4-8.6-11.8,1.7c-7.5,1.7-25.9,18.7-23.6,13.5c-0.6,8.1-21.9,17.7-24.8,31.2c-7,18.7-1.7-0.7-3-8 c-10-12.7-28.2,21.5-22.8,35c9.1-16,8.4-1.7,1.8,5.4c6.7,12.3-6.1,28.3,6.6,37.4c5.6,1.3,16.8-18.8,11.9,2.1 c3.4-18.1,9.4,4.3,19.1-0.7c0.6,9.5,6.5,5.1,7.8,16.6c16.2-1.2,31,26.2,11.7,31.4c2.9-0.8,8.6,4.3,15.2,0.4 c11.2,8.9,40.7,10,41.5,32c-20.3,9.7-5,36.3-22.6,45.8c-20.2-3-6.9,24.9-15.4,21.7c3.4,20.1-20.4-2.6-11.2,8.5 c16.9,10.4-7.4,8.3,0.2,15.9c-8.5-1.8,5.3,15.8,7.6,22.3c12.2,19.8-10.5-4.4-17.2-11c-6.4-12.8-21.5-37.3-25.7-57.4 c-2.4-29.2-25-48.8-30.2-77.3c-5.2-15.9,14.3-41.4,3.8-50.3c-9.1-7.1-5.4-31.4-10.8-44.2c13.5-58.5,56.4-107.8,107.9-137 c-5.3,3.9,30.3-10.1,26.2-6.7c-1.1,2.5,20.8-9.5,34-11.3c-1.4,0.2-34.3,12-25.2,10.4c-14.1,6.9-1.4,3,5.6-0.5 c-14,10.3-24.8,7.4-40.7,16.5c-16,4.2-12.7,20.8-24.1,29.1c6.7,1.2,23.5-17.3,33.3-23.8c22.5-10.9-11.4,19.8,10,6.6 c-7.2,6.7-5.7,17.4-10.1,20.4C148.2,92.1,159.1,97.9,141.4,102.2z M176.4,56.2c-2.3,3.1-5.5,9.8-7.4,5.7c-2.6,1.3-3.6,6.9-8.5,2.4 c2.9-2.1,5.9-7.1,0.2-4c2.6-2.8,25.8-10.7,24.5-13.7c4.1-2.6,3.7-3.9-1-2.3c-2.4-0.8,5.7-7.6,16.5-8.5c1.5,0,2.1,1-0.6,0.7 c-16.3,5-9.3,3.6,1.7,0c-4.2,2.4-7.1,3.1-7.8,4.2c11-4-0.6,2.9,1.9,2.4c-3.1,1.6,0.5,2.1-5.5,4.4c1.1-0.9-9.8,6.5-3.3,4.3 C180.8,57.8,178,57.9,176.4,56.2z M186,70.5c0.2-9.6,14-15.7,12.3-16.2c17-8-5.9,0.3,7.5-6.9c5-0.5,15.6-16.5,30.3-17.5 c16.2-4.9,8.7,0.3,20.7-4.3l-2.4,2c-2.1,0.3,0.5,4-7.1,9.6c-0.8,8.7-14.5,4.7-7.7,14c-4.4-6.3-11-0.2-2.7,0.4 c-8.9,6.8-29.6,8-39.5,19.3C191,80.1,185.1,77.2,186,70.5z M257.1,102.5c-6.8,16.4-13.4-2.4-1.4-5.4 C258.7,98.7,259.9,99.2,257.1,102.5z M231.5,69.7c-2-7.4-0.4-3.5,11.5-7C251.2,68.6,235.7,72.5,231.5,69.7z M417.7,363.2 c-9.4-16.2,11.4-31.2,18.4-44.8C435.2,334.3,433.2,350,417.7,363.2z M453.1,178.1c-10.2,0.8-19.4,3.2-28.6-2.6 c-21.2-23.2,3.9,26.2,10.9,6c25.2,9.6-0.4,51-16.3,46.7c-8.9-19.2-19.9-40.3-39.3-49.7c14.9,16.5,22.3,36.8,38.3,51.7 c1.1,20.8,22.2-7.6,20.9,8.5c2,27.7-31.3,44.3-25.5,72.1c12.4,25.3-23.9,29.9-19.8,52.6c-14.6,16.3-30.2,38.3-56.4,34.8 c0-13.8-7-25.5-8.6-39.7c-14.2-18,15-37.3-3.1-56.1c-20.9-4.7,4.3-33.5-17.2-30.8c-12.9-12.9-31.8-0.4-50.3-0.3 c-23.2,2.2-47.1-28.5-36.8-50.2c-8.2-22.6,26-29.2,26.9-49.1c16.4-13.7,39.7-12,61.9-15.2c-1.6,15.9,15.2,16,27.9,21.3 c7.1-17.2,29.2,2.8,44.3-8.1c5.2-25.4-14.7-10.1-26.1-18.2c-13.8-20.2,29.5-10.4,25-21c-16.8-0.1-7.3-20.7-19.2-9.2 c10.7,1.9-1.9,10.3-1.6,0.7c-16.2-4.7-0.6,18.4-8.8,20.6c-12.5-5.2-6.6,5.9-5.3,7.6c-5.4,11.7-12-17.2-27.3-16.4 c-15.2-13.9-6,6.3,7.2,9.6c-2.8,0.8,1.6,12.3-1.9,7.4c-10.9-15-31.6-25-43.9-6.6c-1.3,17.2-36.3,22.1-30.7,2 c-8.2-20.8,25.4-0.6,22.3-17.2c-21.6-14.3,5.9-9.7,13.2-23.1c16.6,0.5,0.7-13.6,8.5-17.7c-0.8,15.3,12.7,12.4,23.4,9.5 c-2.6-8.8,6.4-8.5,0.9-15.8c24.8-9.9-18.9,4.6-10.1-17.1c-10.7-7.4-4.5,16.3,0,18.8c0.3,7.3-5.9,16.3-14.4,1 c-12.4,8.1-11.1-8.2-11.9-6.5c-1.4-6.3,9.4-6.6,9.5-17.6c-0.9-7-0.7-10.7,4.3-11.1c0.4,1,20.5,1.3,27.6,9.6 c-19.4-3.9-2.9,3.2,5.8,7.2c-9.3-7.3,3.7,0-3.9-8.3c3,0.6-8.3-11.4,3.3-0.9c-6.3-7.5,12.3-5.3,1.3-10.9c16.1,4.5,6.6,0.4-2.9-3.7 c-26.2-15.6,46.3,21.1,16.7,4.8c18.9,4.1-40.4-14.6-13.4-6.4c-10.3-4.5-0.3-2,9,0.9c-16.7-5.2-41.7-14.9-40.7-15.3 c5.8,0.4,11.5,1.7,17,3.3c17.1,5.1-4.9-1.2-0.2-1.1C373.8,44,425.3,83.4,456.6,134.9c7.3,7.7,27.2,58.6,16.8,36 c4.7,18,5.4,37.4,7.9,55.8c-5.2-5.8-11-27.2-16-39.1C463.2,192.2,460.8,181.1,453.1,178.1z" />
  </svg>
);

const PrivateVisibilitySvg = ({ className = 'h-5 w-5' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M5.25 10.0546V8C5.25 4.27208 8.27208 1.25 12 1.25C15.7279 1.25 18.75 4.27208 18.75 8V10.0546C19.8648 10.1379 20.5907 10.348 21.1213 10.8787C22 11.7574 22 13.1716 22 16C22 18.8284 22 20.2426 21.1213 21.1213C20.2426 22 18.8284 22 16 22H8C5.17157 22 3.75736 22 2.87868 21.1213C2 20.2426 2 18.8284 2 16C2 13.1716 2 11.7574 2.87868 10.8787C3.40931 10.348 4.13525 10.1379 5.25 10.0546ZM6.75 8C6.75 5.10051 9.10051 2.75 12 2.75C14.8995 2.75 17.25 5.10051 17.25 8V10.0036C16.867 10 16.4515 10 16 10H8C7.54849 10 7.13301 10 6.75 10.0036V8ZM12 13.25C12.4142 13.25 12.75 13.5858 12.75 14V18C12.75 18.4142 12.4142 18.75 12 18.75C11.5858 18.75 11.25 18.4142 11.25 18V14C11.25 13.5858 11.5858 13.25 12 13.25Z"
      fill="#1C274C"
    />
  </svg>
);

const VISIBILITY_OPTIONS = [
  {
    value: 'public',
    label: 'Công khai (Mọi người)',
    description: 'Mọi người đều có thể xem tài liệu này',
    Icon: PublicVisibilitySvg,
    iconWrap: 'bg-sky-50 dark:bg-sky-500/10',
  },
  {
    value: 'private',
    label: 'Riêng tư (Chỉ mình tôi)',
    description: 'Chỉ tài khoản của bạn mới nhìn thấy',
    Icon: PrivateVisibilitySvg,
    iconWrap: 'bg-slate-100 dark:bg-slate-700/80',
  },
];

const useOutsideDismiss = (ref, isOpen, onClose) => {
  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        onClose();
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, ref]);
};

const SubjectIconBadge = ({ subjectName, compact = false }) => {
  const { icon: Icon, tone } = getSubjectVisual(subjectName);

  return (
    <span
      className={`flex items-center justify-center rounded-xl ${tone} ${
        compact ? 'h-9 w-9' : 'h-10 w-10'
      }`}
    >
      <Icon size={compact ? 16 : 18} strokeWidth={2.2} />
    </span>
  );
};

const SUBJECTS_PER_PAGE = 12;

const SubjectPickerPopup = ({ isOpen, onClose, options, value, onChange, onAddOption }) => {
  const [page, setPage] = useState(0);
  const [customName, setCustomName] = useState('');
  const customInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) setPage(0);
  }, [isOpen]);

  const totalPages = Math.max(1, Math.ceil(options.length / SUBJECTS_PER_PAGE));
  const pageOptions = options.slice(page * SUBJECTS_PER_PAGE, (page + 1) * SUBJECTS_PER_PAGE);

  const handleSelect = (option) => {
    onChange(option.value);
    onClose();
  };

  const handleAddCustom = () => {
    const trimmed = customName.trim();
    if (!trimmed) return;
    const next = onAddOption(trimmed);
    if (next) {
      onChange(next.value);
      onClose();
    }
    setCustomName('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={onClose}
          style={{ fontFamily: "'Google Sans', 'Product Sans', 'Inter', sans-serif" }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-5 py-4 dark:border-slate-800 dark:bg-slate-800/70">
              <div>
                <h4 className="font-bold text-slate-800 dark:text-white">Chọn môn học</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Trang {page + 1}/{totalPages} · {options.length} môn học
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 transition-colors hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                <X size={18} className="text-slate-500 dark:text-slate-300" />
              </button>
            </div>

            {/* Grid */}
            <div className="p-4">
              <div className="grid grid-cols-4 gap-3">
                {pageOptions.map((option) => {
                  const isSelected = String(option.value) === String(value);
                  const { icon: Icon, tone } = getSubjectVisual(option.name);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleSelect(option)}
                      className={`relative flex flex-col items-center gap-2 rounded-2xl border px-2 py-3 text-center transition-all ${
                        isSelected
                          ? 'border-sky-300 bg-sky-50 shadow-sm dark:border-sky-500/50 dark:bg-sky-500/10'
                          : 'border-slate-100 bg-slate-50 hover:border-slate-200 hover:bg-white hover:shadow-sm dark:border-slate-700/60 dark:bg-slate-800/60 dark:hover:border-slate-600 dark:hover:bg-slate-800'
                      }`}
                    >
                      {isSelected && (
                        <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-sky-500 text-white">
                          <Check size={10} strokeWidth={3} />
                        </span>
                      )}
                      <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}>
                        <Icon size={18} strokeWidth={2.2} />
                      </span>
                      <span className="line-clamp-2 w-full text-[11px] font-semibold leading-tight text-slate-700 dark:text-slate-200">
                        {option.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer: pagination + add custom */}
            <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/40">
              {/* Add custom input */}
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <input
                  ref={customInputRef}
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
                  placeholder="Thêm môn học mới..."
                  className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-sky-400 dark:focus:ring-sky-500/20"
                />
                <button
                  type="button"
                  onClick={handleAddCustom}
                  disabled={!customName.trim()}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-500 text-white shadow-sm transition-all hover:bg-sky-600 disabled:opacity-40"
                >
                  <Plus size={15} />
                </button>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <span className="min-w-[40px] text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {page + 1}/{totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const SubjectPicker = ({ label, value, options, onChange, onAddOption }) => {
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = useMemo(() => {
    const matched = options.find((o) => String(o.value) === String(value));
    if (matched) return matched;
    if (!value) return null;
    return { value, name: String(value), isCustom: true };
  }, [options, value]);

  return (
    <div style={{ fontFamily: "'Google Sans', 'Product Sans', 'Inter', sans-serif" }}>
      <label className="mb-1.5 block text-xs font-semibold text-slate-500 dark:text-slate-400">
        {label}
      </label>

      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`${FIELD_WRAPPER_BASE} w-full border-slate-200 hover:border-sky-300 hover:ring-4 hover:ring-sky-50 dark:border-slate-700 dark:hover:border-sky-500 dark:hover:ring-sky-500/10`}
      >
        <SubjectIconBadge subjectName={selectedOption?.name || 'Môn học'} compact />
        <span className="min-w-0 flex-1 text-left">
          {selectedOption ? (
            <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
              {selectedOption.name}
            </span>
          ) : (
            <span className="text-sm text-slate-400 dark:text-slate-500">Chọn môn học...</span>
          )}
        </span>
        <ChevronDown size={18} className="shrink-0 text-slate-400" />
      </button>

      <SubjectPickerPopup
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        options={options}
        value={value}
        onChange={onChange}
        onAddOption={onAddOption}
      />
    </div>
  );
};

const VisibilitySelect = ({ label, value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  useOutsideDismiss(wrapperRef, isOpen, () => setIsOpen(false));

  const selectedOption =
    VISIBILITY_OPTIONS.find((option) => option.value === value) || VISIBILITY_OPTIONS[0];

  return (
    <div ref={wrapperRef} className="relative" style={{ fontFamily: "'Google Sans', 'Product Sans', 'Inter', sans-serif" }}>
      <label className="mb-1.5 block text-xs font-semibold text-slate-500 dark:text-slate-400">
        {label}
      </label>

      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`${FIELD_WRAPPER_BASE} w-full ${
          isOpen
            ? 'border-sky-400 ring-4 ring-sky-100 dark:border-sky-400 dark:ring-sky-500/20'
            : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
        }`}
      >
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${selectedOption.iconWrap}`}>
          <selectedOption.Icon className="h-5 w-5" />
        </span>

        <span className="min-w-0 flex-1 text-left">
          <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
            {selectedOption.label}
          </span>
          <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
            {selectedOption.description}
          </span>
        </span>

        <ChevronDown
          size={18}
          className={`shrink-0 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            {...DROPDOWN_MOTION}
            className="absolute left-0 right-0 top-[calc(100%+10px)] z-30 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="space-y-2 p-2">
              {VISIBILITY_OPTIONS.map((option) => {
                const isSelected = option.value === value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-all ${
                      isSelected
                        ? 'border-sky-200 bg-sky-50 dark:border-sky-500/30 dark:bg-sky-500/10'
                        : 'border-transparent bg-slate-50/80 hover:border-slate-200 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:border-slate-700 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${option.iconWrap}`}>
                      <option.Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {option.label}
                      </span>
                      <span className="block text-xs text-slate-500 dark:text-slate-400">
                        {option.description}
                      </span>
                    </span>
                    {isSelected && (
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sky-600 shadow-sm dark:bg-slate-700 dark:text-sky-300">
                        <Check size={16} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const UploadModal = ({ isOpen, onClose, onSuccess, currentUser }) => {
  const MAX_FILE_SIZE_MB = 30;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

  const [file, setFile] = useState(null);
  const [name, setName] = useState('');
  const [course, setCourse] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [oversizeMessage, setOversizeMessage] = useState('');
  const [subjectOptions, setSubjectOptions] = useState(() => createFallbackSubjects());
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const fileInputRef = useRef(null);

  // Load subjects từ API mỗi khi mở modal
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setSubjectsLoading(true);
    documentService.getSubjects().then((apiSubjects) => {
      if (cancelled) return;
      if (apiSubjects && apiSubjects.length > 0) {
        setSubjectOptions(apiSubjectsToOptions(apiSubjects));
      } else {
        setSubjectOptions(createFallbackSubjects());
      }
      setSubjectsLoading(false);
    }).catch(() => {
      if (!cancelled) setSubjectsLoading(false);
    });
    return () => { cancelled = true; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    setFile(null);
    setName('');
    setCourse('');
    setVisibility('public');
    setDragActive(false);
    setOversizeMessage('');
  }, [isOpen]);

  // Gọi API khi thêm môn mới
  const addSubjectOption = async (subjectName) => {
    const trimmedSubject = subjectName.trim();
    if (!trimmedSubject) return null;

    // Kiểm tra đã có trong list nội bộ chưa
    const existingOption = subjectOptions.find(
      (option) => normalizeString(option.name) === normalizeString(trimmedSubject)
    );
    if (existingOption) return existingOption;

    // Gọi API tạo môn mới trong DB
    const result = await documentService.createSubject(
      trimmedSubject,
      currentUser?.username
    );
    if (!result?.success && !result?.alreadyExists) return null;

    const nextOption = {
      id: result.subject?._id || result.subject?.id,
      value: result.subject?.name || trimmedSubject,
      name: result.subject?.name || trimmedSubject,
    };
    setSubjectOptions((prev) => {
      // Tránh trùng nếu API trả về alreadyExists
      if (prev.some((o) => normalizeString(o.name) === normalizeString(nextOption.name))) return prev;
      return [nextOption, ...prev];
    });
    return nextOption;
  };

  const handleFile = (selectedFile) => {
    if (!selectedFile) return;

    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      setOversizeMessage(
        `File vượt quá ${MAX_FILE_SIZE_MB}MB. Vui lòng chọn file nhỏ hơn hoặc bằng ${MAX_FILE_SIZE_MB}MB.`
      );
      return;
    }

    setOversizeMessage('');
    setFile(selectedFile);
    setName(selectedFile.name.split('.').slice(0, -1).join('.'));
  };

  const handleFileChange = (event) => {
    handleFile(event.target.files?.[0]);
  };

  const handleDrag = (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (event.type === 'dragenter' || event.type === 'dragover') {
      setDragActive(true);
      return;
    }

    if (event.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);

    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      handleFile(event.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      toast.error('Vui lòng chọn file!', { duration: 3000, position: 'top-right' });
      return;
    }
    if (!name.trim()) {
      toast.error('Vui lòng nhập tên tài liệu!', { duration: 3000, position: 'top-right' });
      return;
    }
    if (!course) {
      toast.error('Vui lòng chọn môn học!', { duration: 3000, position: 'top-right' });
      return;
    }

    setIsSubmitting(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name.trim());
    formData.append('course', String(course).trim());
    formData.append('visibility', visibility);
    formData.append('username', currentUser.username);
    formData.append('uploader', currentUser.fullName);

    const ext = file.name.split('.').pop().toLowerCase();
    let type = 'other';

    if (['pdf'].includes(ext)) type = 'pdf';
    else if (['doc', 'docx'].includes(ext)) type = 'word';
    else if (['xls', 'xlsx'].includes(ext)) type = 'excel';
    else if (['ppt', 'pptx'].includes(ext)) type = 'ppt';
    else if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) type = 'image';

    formData.append('type', type);

    await onSuccess(formData);
    setIsSubmitting(false);
    onClose();
  };

  if (!isOpen) return null;

  const fileIconProps = file ? getFileIconProps(file.name) : null;
  const PreviewIcon = fileIconProps?.icon || FileText;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
      <div
        className="flex w-full max-w-lg flex-col overflow-visible rounded-[28px] border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        style={{ fontFamily: "'Google Sans', 'Product Sans', 'Inter', sans-serif" }}
      >
        <div className="flex items-center justify-between rounded-t-[28px] border-b border-slate-100 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-800/70">
          <div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white">
              Tải tài liệu lên
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Nâng cấp form tải lên với bộ chọn trực quan hơn.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 transition-colors hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            <X className="text-slate-500 dark:text-slate-300" size={20} />
          </button>
        </div>

        <div className="space-y-5 p-6">
          {!file ? (
            <div
              className={`relative cursor-pointer rounded-[24px] border-2 border-dashed p-8 text-center transition-all group ${
                dragActive
                  ? 'border-sky-400 bg-sky-50 dark:bg-sky-500/10'
                  : 'border-slate-300 hover:border-sky-300 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sky-100 text-sky-600 transition-transform group-hover:scale-110 dark:bg-sky-500/10 dark:text-sky-300">
                <CloudUpload size={32} />
              </div>
              <p className="font-bold text-slate-700 dark:text-slate-100">
                Nhấn để chọn hoặc kéo thả file vào đây
              </p>
              <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                Hỗ trợ PDF, Word, Excel, PowerPoint, Ảnh · Tối đa 30MB
              </p>
            </div>
          ) : (
            <div className="animate-fade-in-up relative flex items-center gap-4 rounded-2xl border border-sky-100 bg-sky-50 p-4 dark:border-sky-500/20 dark:bg-sky-500/10">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${fileIconProps?.bg || 'bg-white'} shadow-sm`}
              >
                <PreviewIcon size={24} className={fileIconProps?.color || 'text-slate-500'} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">
                  {file.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {(file.size / 1024 / 1024).toFixed(2)} MB · Sẵn sàng tải lên
                </p>
              </div>
              <Tooltip text="Hủy chọn file">
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="rounded-xl border border-slate-100 bg-white p-2 text-red-500 shadow-sm transition-colors hover:bg-red-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-red-500/10"
                >
                  <Trash2 size={18} />
                </button>
              </Tooltip>
            </div>
          )}

          {file && (
            <div className="animate-fade-in-up space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Tên hiển thị
                </label>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Ví dụ: Đề thi cuối kỳ Giải tích 1..."
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-sky-400 dark:focus:ring-sky-500/20"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <SubjectPicker
                  label="Môn học"
                  value={course}
                  options={subjectOptions}
                  onChange={setCourse}
                  onAddOption={addSubjectOption}
                />
                <VisibilitySelect
                  label="Quyền hạn"
                  value={visibility}
                  onChange={setVisibility}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 rounded-b-[28px] border-t border-slate-100 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-800/70">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-5 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !file}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:bg-black disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-700"
          >
            {isSubmitting ? (
              <>
                <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Đang tải...
              </>
            ) : (
              <>
                <Upload size={18} />
                Tải lên ngay
              </>
            )}
          </button>
        </div>
      </div>

      {oversizeMessage && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-red-200 bg-white shadow-2xl dark:border-red-900/50 dark:bg-slate-900">
            <div className="flex items-center gap-2 border-b border-red-100 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-950/30">
              <AlertCircle size={18} className="shrink-0 text-red-600 dark:text-red-400" />
              <h4 className="font-bold text-red-700 dark:text-red-300">
                File vượt giới hạn
              </h4>
            </div>
            <div className="p-4">
              <p className="text-sm text-slate-700 dark:text-slate-200">
                {oversizeMessage}
              </p>
            </div>
            <div className="flex justify-end border-t border-slate-100 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setOversizeMessage('')}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const EditDocModal = ({ isOpen, onClose, onSubmit, doc }) => {
  const [name, setName] = useState('');
  const [course, setCourse] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [subjectOptions, setSubjectOptions] = useState(() => createFallbackSubjects());

  // Load subjects từ API khi mở
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    documentService.getSubjects().then((apiSubjects) => {
      if (cancelled) return;
      const opts = apiSubjects && apiSubjects.length > 0
        ? apiSubjectsToOptions(apiSubjects)
        : createFallbackSubjects();
      setSubjectOptions((prev) => {
        const merged = [...opts];
        if (doc?.course) {
          const alreadyIn = merged.some((o) => normalizeString(o.name) === normalizeString(doc.course));
          if (!alreadyIn) merged.unshift({ id: `custom-${doc.course}`, value: doc.course, name: doc.course });
        }
        return merged;
      });
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [isOpen, doc?.course]);

  useEffect(() => {
    if (!doc) return;
    setName(doc.name || '');
    setCourse(doc.course || '');
    setVisibility(doc.visibility || 'public');
  }, [doc]);

  const addSubjectOption = async (subjectName) => {
    const trimmedSubject = subjectName.trim();
    if (!trimmedSubject) return null;

    const existingOption = subjectOptions.find(
      (option) => normalizeString(option.name) === normalizeString(trimmedSubject)
    );
    if (existingOption) return existingOption;

    const result = await documentService.createSubject(trimmedSubject);
    if (!result?.success && !result?.alreadyExists) {
      const fallback = createCustomSubjectOption(trimmedSubject);
      setSubjectOptions((prev) => [fallback, ...prev]);
      return fallback;
    }
    const nextOption = {
      id: result.subject?._id || result.subject?.id,
      value: result.subject?.name || trimmedSubject,
      name: result.subject?.name || trimmedSubject,
    };
    setSubjectOptions((prev) => {
      if (prev.some((o) => normalizeString(o.name) === normalizeString(nextOption.name))) return prev;
      return [nextOption, ...prev];
    });
    return nextOption;
  };

  const handleSubmit = () => {
    onSubmit({ docId: doc.id, name: name.trim(), course, visibility });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-xl overflow-visible rounded-[28px] border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        style={{ fontFamily: "'Google Sans', 'Product Sans', 'Inter', sans-serif" }}
      >
        <div className="flex items-center justify-between rounded-t-[28px] border-b border-slate-100 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-800/70">
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">
              Sửa thông tin
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Chỉnh lại tên, môn học và quyền riêng tư của tài liệu.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 transition-colors hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            <X className="text-slate-500 dark:text-slate-300" size={20} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-500 dark:text-slate-400">
              Tên tài liệu
            </label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm outline-none transition-all focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-sky-400 dark:focus:ring-sky-500/20"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <SubjectPicker
              label="Môn học"
              value={course}
              options={subjectOptions}
              onChange={setCourse}
              onAddOption={addSubjectOption}
            />
            <VisibilitySelect
              label="Quyền hạn"
              value={visibility}
              onChange={setVisibility}
            />
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            className="mt-2 w-full rounded-2xl bg-blue-600 py-3 font-bold text-white transition-colors hover:bg-blue-700"
          >
            Lưu thay đổi
          </button>
        </div>
      </div>
    </div>
  );
};
