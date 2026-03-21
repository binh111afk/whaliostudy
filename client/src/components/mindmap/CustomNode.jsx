import React, { memo, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Handle, Position } from '@xyflow/react';
import { Plus, X } from 'lucide-react';

const MotionDiv = motion.div;

const sharedHandleClassName = '!h-2.5 !w-2.5 !border-0 !bg-transparent !opacity-0';

const getNodeClassName = ({ depth, isSelected }) => {
  const selectedRing = isSelected ? ' ring-4 ring-slate-300/70' : '';

  if (depth === 0) {
    return `min-w-[212px] rounded-full px-6 py-4 text-white shadow-2xl sm:min-w-[280px] sm:px-10 sm:py-6${selectedRing}`;
  }

  if (depth === 1) {
    return `min-w-[168px] rounded-xl border bg-white/72 px-4 py-2.5 backdrop-blur-xl shadow-[0_18px_44px_-30px_rgba(15,23,42,0.42)] sm:min-w-[220px] sm:px-6 sm:py-4${selectedRing}`;
  }

  return `min-w-[128px] bg-transparent px-1 py-0.5 sm:min-w-[156px]${selectedRing}`;
};

const getNodeStyle = ({ depth, selected, branchColor }) => {
  if (depth === 0) {
    return {
      background: 'linear-gradient(135deg, #0f172a 0%, #2563eb 58%, #38bdf8 100%)',
      boxShadow: selected
        ? '0 0 0 10px rgba(148,163,184,0.2), 0 28px 64px -28px rgba(15,23,42,0.72)'
        : '0 28px 64px -28px rgba(15,23,42,0.72)',
    };
  }

  if (depth === 1) {
    return {
      borderColor: branchColor,
      background: 'rgba(255,255,255,0.74)',
      boxShadow: selected
        ? `0 0 0 8px ${branchColor}1f, 0 18px 44px -30px rgba(15,23,42,0.45)`
        : '0 18px 44px -30px rgba(15,23,42,0.45)',
    };
  }

  return {
    borderBottom: `2px solid ${branchColor}`,
  };
};

const ActionButton = ({ onClick, icon, ariaLabel, className = '' }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex h-11 w-11 items-center justify-center rounded-full border border-white/70 bg-white/90 text-slate-700 shadow-lg backdrop-blur ${className}`}
    aria-label={ariaLabel}
  >
    {icon}
  </button>
);

const CustomNode = memo(({ id, data, selected }) => {
  const depth = Number(data.depth || 0);
  const isPrimaryBranch = depth === 1;
  const isSecondaryBranch = depth >= 2;
  const isMobile = data.layoutDirection === 'TB';
  const branchColor = data.color || data.branchColor || '#3b82f6';
  const showActions = Boolean(selected);

  const labelClassName = useMemo(() => {
    if (depth === 0) {
      return isMobile
        ? 'font-["Plus_Jakarta_Sans"] text-center text-[1.04rem] font-extrabold leading-tight tracking-tight text-white'
        : 'font-["Plus_Jakarta_Sans"] text-center text-[1.65rem] font-extrabold leading-tight tracking-tight text-white';
    }

    if (depth === 1) {
      return isMobile
        ? 'font-["Plus_Jakarta_Sans"] text-xs font-semibold leading-5 tracking-tight text-slate-800'
        : 'font-["Plus_Jakarta_Sans"] text-[15px] font-semibold leading-6 tracking-tight text-slate-800';
    }

    return isMobile
      ? 'font-["Plus_Jakarta_Sans"] text-[11px] font-medium leading-4 tracking-tight text-slate-700'
      : 'font-["Plus_Jakarta_Sans"] text-sm font-medium leading-5 tracking-tight text-slate-700';
  }, [depth, isMobile]);

  return (
    <>
      <Handle type="target" id="left" position={Position.Left} className={sharedHandleClassName} />
      <Handle type="target" id="right" position={Position.Right} className={sharedHandleClassName} />
      <Handle type="target" id="top" position={Position.Top} className={sharedHandleClassName} />
      <Handle type="target" id="bottom" position={Position.Bottom} className={sharedHandleClassName} />

      <MotionDiv
        initial={{ scale: data.isNew ? 0.7 : 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        onDoubleClick={(event) => {
          event.stopPropagation();
          data.onEdit?.(id);
        }}
        className={`group relative font-["Plus_Jakarta_Sans"] transition-all duration-200 ${getNodeClassName({ depth, isSelected: selected })}`}
        style={getNodeStyle({ depth, selected, branchColor })}
      >
        {depth === 1 && (
          <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[linear-gradient(135deg,rgba(255,255,255,0.38),rgba(255,255,255,0.08))]" />
        )}

        <div className={`relative ${isSecondaryBranch ? 'pb-1' : ''}`}>
          <p className={labelClassName}>{data.label}</p>
        </div>

        <AnimatePresence>
          {showActions && (
            <>
              {isPrimaryBranch && (
                <MotionDiv
                  initial={{ opacity: 0, x: -6, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -6, scale: 0.9 }}
                  className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2"
                >
                  <ActionButton
                    onClick={(event) => {
                      event.stopPropagation();
                      data.onQuickAdd?.(id, 'left');
                    }}
                    icon={<Plus size={15} style={{ color: branchColor }} />}
                    ariaLabel="Thêm nhánh bên trái"
                  />
                </MotionDiv>
              )}

              <MotionDiv
                initial={{ opacity: 0, x: 6, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 6, scale: 0.9 }}
                className={`absolute right-0 top-1/2 flex -translate-y-1/2 items-center gap-2 ${isPrimaryBranch ? 'translate-x-1/2' : 'translate-x-[55%]'}`}
              >
                {depth > 0 && (
                  <ActionButton
                    onClick={(event) => {
                      event.stopPropagation();
                      data.onDeleteBranch?.(id);
                    }}
                    icon={<X size={15} />}
                    ariaLabel="Xóa nhánh"
                    className="text-red-500"
                  />
                )}
                <ActionButton
                  onClick={(event) => {
                    event.stopPropagation();
                    data.onQuickAdd?.(id, 'right');
                  }}
                  icon={<Plus size={15} style={{ color: branchColor }} />}
                  ariaLabel="Thêm nhánh"
                />
              </MotionDiv>
            </>
          )}
        </AnimatePresence>
      </MotionDiv>

      <Handle type="source" id="left" position={Position.Left} className={sharedHandleClassName} />
      <Handle type="source" id="right" position={Position.Right} className={sharedHandleClassName} />
      <Handle type="source" id="top" position={Position.Top} className={sharedHandleClassName} />
      <Handle type="source" id="bottom" position={Position.Bottom} className={sharedHandleClassName} />
    </>
  );
});

CustomNode.displayName = 'CustomNode';

export default CustomNode;
