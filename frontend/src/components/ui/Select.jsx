import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function Select({
  label,
  value,
  onChange,
  options = [],
  placeholder = "Select an option",
  disabled = false,
  error,
  helperText,
  required = false,
  className = "",
  labelClassName = "",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((o) => o.value === value);

  const toggleOpen = () => {
    if (!disabled) setIsOpen(!isOpen);
  };

  const handleSelect = (optionValue) => {
    onChange({ target: { value: optionValue } }); // Mock event for compatibility
    setIsOpen(false);
  };

  return (
    <div className={`w-full ${className}`} ref={containerRef}>
      {label && (
        <label
          className={`block text-sm font-semibold text-surface-muted mb-2 ml-1 ${labelClassName}`}
        >
          {label} {required && <span className="text-accent-pink">*</span>}
        </label>
      )}
      <div className="relative">
        <div
          onClick={toggleOpen}
          className={`input-field relative flex items-center justify-between cursor-pointer 
            ${disabled ? "opacity-60 cursor-not-allowed" : "hover:border-primary/50"}
            ${error ? "border-red-500/50 ring-1 ring-red-500/20" : ""}
            ${isOpen ? "ring-2 ring-primary/50 border-primary/50 shadow-md" : ""}
          `}
        >
          <span
            className={`block truncate ${!selectedOption ? "text-surface-muted" : "text-surface"}`}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown
            size={16}
            className={`text-surface-muted transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          />
        </div>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="absolute z-50 w-full mt-2 bg-background-secondary/95 dark:bg-[#1e1e2e]/95 backdrop-blur-xl border border-border-color/40 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden ring-1 ring-black/5 dark:ring-white/5"
              style={{ maxHeight: "240px", overflowY: "auto" }}
            >
              <ul className="p-1.5 space-y-0.5">
                {options.length === 0 ? (
                  <li className="px-4 py-8 text-center text-sm text-surface-muted flex flex-col items-center justify-center gap-2">
                    <span className="opacity-50">No options</span>
                  </li>
                ) : (
                  options.map((option) => {
                    const isSelected = value === option.value;
                    return (
                      <li
                        key={option.value}
                        onClick={() => handleSelect(option.value)}
                        className={`
                          relative px-3 py-2.5 text-sm cursor-pointer flex items-center justify-between rounded-xl
                          transition-all duration-200 group
                          ${
                            isSelected
                              ? "bg-primary/10 text-primary font-semibold"
                              : "text-surface/80 hover:bg-surface/5 dark:hover:bg-white/5 hover:text-surface"
                          }
                        `}
                      >
                        <span className="flex-1 truncate pr-3 relative z-10">
                          {option.label}
                        </span>
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="text-primary flex-shrink-0"
                          >
                            <Check size={16} strokeWidth={2.5} />
                          </motion.div>
                        )}
                      </li>
                    );
                  })
                )}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {error ? (
        <p className="text-xs text-red-400 mt-2 ml-1">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-surface-muted/60 mt-2 ml-1">{helperText}</p>
      ) : null}
    </div>
  );
}
