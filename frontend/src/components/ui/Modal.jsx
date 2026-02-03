import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = "max-w-lg",
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: "-50%", x: "-50%" }}
            animate={{ opacity: 1, scale: 1, y: "-50%", x: "-50%" }}
            exit={{ opacity: 0, scale: 0.95, y: "-50%", x: "-50%" }}
            className={`fixed top-1/2 left-1/2 w-[90%] ${maxWidth} glass-panel rounded-2xl shadow-2xl z-50 border border-border-color/10 outline-none`}
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-5 border-b border-border-color/10 bg-background-tertiary/20">
              <h3 className="text-xl font-bold text-surface">{title}</h3>
              <button
                className="p-2 hover:bg-background-tertiary rounded-lg transition-colors text-surface-muted hover:text-surface"
                onClick={onClose}
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 max-h-[80vh] overflow-visible w-full">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
