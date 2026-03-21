import React, { memo, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Handle, Position } from '@xyflow/react';
import { Plus, X } from 'lucide-react';

const MotionDiv = motion.div;

const sharedHandleClassName = '!h-2.5 !w-2.5 !border-0 !bg-transparent !opacity-0';

const getNodeClassName = ({ depth, isSelected }) => {
  const selectedRing = isSelected ? ' ring-4 ring-blue-200/70' : '';

  if (depth === 0) {
    return `min-w-[220px] rounded-full bg-blue-600 px-8 py-5 text-white shadow-[0_20px_55px_-22px_rgba(59,130,246,0.9)] shadow-blue-500/40 sm:min-w-[280px] sm:px-10 sm:py-6${selectedRing}`;
  }

  if (depth === 1) {
    return `min-w-[180px] rounded-[26px] border bg-white/75 px-5 py-3.5 backdrop-blur-xl shadow-[0_14px_38px_-28px_rgba(15,23,42,0.45)] sm:min-w-[220px] sm:px-6 sm:py-4${selectedRing}`;
  }

  return `min-w-[138px] bg-transparent px-2 py-1.5 sm:min-w-[156px]${selectedRing}`;
};

const getNodeStyle = ({ depth, selected, branchColor }) => {
  if (depth === 0) {
    return {
      boxShadow: selected
        ? '0 0 0 10px rgba(96,165,250,0.18), 0 20px 55px -22px rgba(59,130,246,0.82)'
        : '0 20px 55px -22px rgba(59,130,246,0.82)',
    };
  }

  if (depth === 1) {
    return {
      borderColor: branchColor,
      boxShadow: selected
        ? `0 0 0 8px ${branchColor}22, 0 14px 38px -28px rgba(15,23,42,0.45)`
        : '0 14px 38px -28px rgba(15,23,42,0.45)',
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
    className={`flex h-11 w-11 items-center justify-center rounded-full border border-white/70 bg-white/90 text-slate-700 shadow-lg backdrop-blur sm:h-9 sm:w-9 ${className}`}
    aria-label={ariaLabel}
  >
    {icon}
  </button>
);

const CustomNode = memo(({ id, data, selected }) => {
  const [isHovered, setIsHovered] = useState(false);
  const depth = Number(data.depth || 0);
  const isPrimaryBranch = depth === 1;
  const isSecondaryBranch = depth >= 2;
  const isMobile = data.layoutDirection === 'TB';
  const branchColor = data.branchColor || '#3b82f6';
  const showActions = isHovered || isMobile;

  const labelClassName = useMemo(() => {
    if (depth === 0) return 'text-center text-[1.3rem] font-extrabold leading-tight text-white sm:text-[1.6rem]';
    if (depth === 1) return 'text-sm font-semibold leading-6 text-slate-800 sm:text-[15px]';
    return 'text-sm font-medium leading-5 text-slate-700';
  }, [depth]);

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
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        onDoubleClick={(event) => {
          event.stopPropagation();
          data.onEdit?.(id);
        }}
        className={`group relative transition-all duration-200 ${getNodeClassName({ depth, isSelected: selected })}`}
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
                    icon={<Plus size={16} style={{ color: branchColor }} />}
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
                {!isMobile && depth > 0 && (
                  <ActionButton
                    onClick={(event) => {
                      event.stopPropagation();
                      data.onDeleteBranch?.(id);
                    }}
                    icon={<X size={16} />}
                    ariaLabel="Xóa nhánh"
                    className="text-red-500"
                  />
                )}
                <ActionButton
                  onClick={(event) => {
                    event.stopPropagation();
                    data.onQuickAdd?.(id, 'right');
                  }}
                  icon={<Plus size={16} style={{ color: branchColor }} />}
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
