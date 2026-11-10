import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = "max-w-lg",
  className = "",
}) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-sky-950/40 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          onClick={(e) => e.stopPropagation()}
          className={`relative w-full ${maxWidth} rounded-3xl bg-white border border-sky-100 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${className}`}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-sky-100 bg-sky-50/50 flex-shrink-0">
            <h3 className="text-base font-bold text-sky-950 tracking-tight">{title}</h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-sky-500 hover:text-sky-900 hover:bg-sky-100/60 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto space-y-4 bg-white text-slate-700">{children}</div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
