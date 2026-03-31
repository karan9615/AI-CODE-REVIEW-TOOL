import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save, Book, Trash2 } from "lucide-react";
import { Button } from "../ui/Button";

export function ProjectContextModal({ isOpen, onClose, project }) {
  const [context, setContext] = useState("");
  const storageKey = `ai_context_${project?.id}`;

  useEffect(() => {
    if (isOpen && project) {
      const savedContext = localStorage.getItem(storageKey);
      if (savedContext) {
        setContext(savedContext);
      }
    }
  }, [isOpen, project, storageKey]);

  const handleSave = () => {
    if (context.trim()) {
      localStorage.setItem(storageKey, context.trim());
    } else {
      localStorage.removeItem(storageKey);
    }
    onClose();
  };

  const handleClear = () => {
    setContext("");
    localStorage.removeItem(storageKey);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-2xl bg-background border border-border-color rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border-color/50 bg-background-secondary/50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Book size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-surface">
                  Project AI Context
                </h3>
                <p className="text-xs text-surface-muted truncate max-w-[300px]">
                  {project?.name}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-surface-muted hover:text-surface hover:bg-surface/10 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6">
            <p className="text-sm text-surface-muted mb-4">
              Add specific instructions, coding standards, or architecture rules 
              for this project. The AI will use this context when reviewing Merge Requests 
              or drafting summaries.
            </p>

            <textarea
              className="w-full h-48 bg-background-secondary border border-border-color/30 rounded-xl p-4 text-sm text-surface placeholder:text-surface-muted/50 focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all outline-none resize-none font-mono"
              placeholder="e.g. 'Use React 18 standards. Omit console logs. Favor functional components. Verify ARIA tags are present.'"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              spellCheck="false"
            />
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border-color/50 bg-background-secondary/30 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={handleClear}
              className="text-surface-muted hover:text-red-400"
              icon={Trash2}
            >
              Clear
            </Button>
            <div className="flex items-center gap-3">
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSave} icon={Save}>
                Save Context
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
