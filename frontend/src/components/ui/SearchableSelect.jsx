import React, { useState, useEffect, useRef, useCallback } from "react";
import { ChevronDown, Search, Check, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function SearchableSelect({
  label,
  value,
  onChange,
  loadOptions,
  placeholder = "Select...",
  disabled = false,
  error,
  helperText,
  required = false,
  className = "",
  preload = false, // If true, loads options on mount
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedLabel, setSelectedLabel] = useState("");

  const containerRef = useRef(null);
  const listRef = useRef(null);
  const searchTimeout = useRef(null);

  // Initial load
  useEffect(() => {
    if (preload && !disabled) {
      fetchOptions(1, "");
    }
  }, [preload, disabled]);

  // Update selected label when value or options change
  useEffect(() => {
    if (value) {
      const option = options.find((o) => o.value === value);
      if (option) {
        setSelectedLabel(option.label);
      }
      // If valid value but not in options (e.g. initial load), we might want to fetch or just show value
      // ideally loadOptions should allow fetching by ID, but for now we rely on the list
    } else {
      setSelectedLabel("");
    }
  }, [value, options]);

  const fetchOptions = async (pageNum, searchTerm, append = false) => {
    setLoading(true);
    try {
      const result = await loadOptions(searchTerm, pageNum);
      if (append) {
        setOptions((prev) => [...prev, ...result.options]);
      } else {
        setOptions(result.options);
      }
      setHasMore(result.hasMore);
      setPage(pageNum);
    } catch (err) {
      console.error("Failed to load options", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    const term = e.target.value;
    setSearch(term);
    setPage(1);

    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    searchTimeout.current = setTimeout(() => {
      fetchOptions(1, term, false);
    }, 300);
  };

  const handleScroll = (e) => {
    const { scrollTop, clientHeight, scrollHeight } = e.target;
    if (scrollHeight - scrollTop <= clientHeight + 50 && hasMore && !loading) {
      fetchOptions(page + 1, search, true);
    }
  };

  const toggleOpen = () => {
    if (disabled) return;
    if (!isOpen) {
      setIsOpen(true);
      // Reset search on open if we want, or keep it.
      // If we haven't loaded yet (and not preloaded), load now
      if (options.length === 0) {
        fetchOptions(1, "");
      }
    } else {
      setIsOpen(false);
    }
  };

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

  return (
    <div className={`w-full ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-sm font-semibold text-surface-muted mb-2 ml-1">
          {label} {required && <span className="text-accent-pink">*</span>}
        </label>
      )}

      <div className="relative">
        <div
          onClick={toggleOpen}
          className={`
            input-field relative flex items-center justify-between cursor-pointer
            ${disabled ? "opacity-60 cursor-not-allowed" : "hover:border-primary/50"}
            ${error ? "border-red-500/50 ring-1 ring-red-500/20" : ""}
            ${isOpen ? "ring-2 ring-primary/50 border-primary/50 shadow-md" : ""}
          `}
        >
          <span
            className={`block truncate ${!selectedLabel ? "text-surface-muted" : "text-surface"}`}
          >
            {selectedLabel || placeholder}
          </span>
          <ChevronDown
            size={16}
            className={`text-surface-muted transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          />
        </div>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute z-50 w-full mt-2 bg-background-secondary/95 backdrop-blur-xl border border-border-color/20 rounded-xl shadow-2xl overflow-hidden"
            >
              {/* Search Box */}
              <div className="p-2 border-b border-border-color/10">
                <div className="relative">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-muted"
                  />
                  <input
                    type="text"
                    className="w-full pl-9 pr-3 py-2 bg-background-tertiary/50 rounded-lg text-sm text-surface outline-none focus:ring-1 focus:ring-primary/50"
                    placeholder="Search..."
                    value={search}
                    onChange={handleSearch}
                    autoFocus
                  />
                  {loading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2
                        size={14}
                        className="animate-spin text-primary"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Options List */}
              <ul
                ref={listRef}
                onScroll={handleScroll}
                className="max-h-60 overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent"
              >
                {options.length === 0 && !loading ? (
                  <li className="px-4 py-3 text-center text-sm text-surface-muted">
                    No options found
                  </li>
                ) : (
                  options.map((option) => (
                    <li
                      key={option.value}
                      onClick={() => {
                        onChange(option.value);
                        setIsOpen(false);
                        setSearch("");
                      }}
                      className={`
                        px-4 py-2.5 text-sm cursor-pointer flex items-center justify-between
                        transition-colors duration-150
                        ${value === option.value ? "bg-primary/10 text-primary" : "text-surface hover:bg-white/5"}
                        `}
                    >
                      <span>{option.label}</span>
                      {value === option.value && <Check size={14} />}
                    </li>
                  ))
                )}
                {loading && (
                  <li className="px-4 py-2 text-center text-xs text-surface-muted animate-pulse">
                    Loading...
                  </li>
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
