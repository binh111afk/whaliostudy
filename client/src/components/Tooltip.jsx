import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";

const Tooltip = ({ text, children }) => {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ left: 0, top: 0 });
  const triggerRef = useRef(null);

  if (!text) return children;

  const updatePosition = useCallback(() => {
    const node = triggerRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    setCoords({
      left: rect.left + rect.width / 2,
      top: rect.bottom + 8,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const handleScroll = () => updatePosition();
    const handleResize = () => updatePosition();
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [open, updatePosition]);

  return (
    <span
      ref={triggerRef}
      className="inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.span
                initial={{ opacity: 0, scale: 0.95, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="pointer-events-none fixed z-[9999] -translate-x-1/2"
                style={{ left: coords.left, top: coords.top }}
              >
                <span className="relative inline-flex items-center whitespace-nowrap rounded-lg bg-white/80 px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-lg shadow-slate-900/10 backdrop-blur-md dark:bg-slate-900/80 dark:text-slate-200">
                  {text}
                </span>
              </motion.span>
            )}
          </AnimatePresence>,
          document.body
        )}
    </span>
  );
};

export default Tooltip;
