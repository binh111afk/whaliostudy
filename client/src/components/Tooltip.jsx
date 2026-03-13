import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const Tooltip = ({ text, children }) => {
  const [open, setOpen] = useState(false);

  if (!text) return children;

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      <AnimatePresence>
        {open && (
          <motion.span
            initial={{ opacity: 0, scale: 0.95, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="pointer-events-none absolute left-1/2 top-0 z-[999] -translate-x-1/2 -translate-y-full"
          >
            <span className="relative inline-flex items-center whitespace-nowrap rounded-lg bg-white/80 px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-lg shadow-slate-900/10 backdrop-blur-md dark:bg-slate-900/80 dark:text-slate-200">
              {text}
              <span className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[2px] bg-white/80 dark:bg-slate-900/80" />
            </span>
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
};

export default Tooltip;
