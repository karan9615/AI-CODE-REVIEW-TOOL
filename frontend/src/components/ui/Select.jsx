import React from "react";
import { ArrowRight } from "lucide-react";

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
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className={`block text-sm font-semibold text-surface-muted mb-2 ml-1 ${labelClassName}`}>
          {label} {required && <span className="text-accent-pink">*</span>}
        </label>
      )}
      <div className="relative group">
        <select
          className={`input-field appearance-none cursor-pointer hover:border-primary/50 text-surface bg-background-secondary disabled:opacity-60 disabled:cursor-not-allowed ${error ? "border-red-500/50 focus:border-red-500" : ""
            }`}
          value={value}
          onChange={onChange}
          disabled={disabled}
        >
          {placeholder && (
            <option value="" className="bg-background-secondary text-surface-muted">
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              className="bg-background-secondary text-surface"
            >
              {option.label}
            </option>
          ))}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-surface-muted group-hover:text-primary transition-colors">
          <ArrowRight size={16} className="rotate-90" />
        </div>
      </div>
      {error ? (
        <p className="text-xs text-red-400 mt-2 ml-1">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-surface-muted/60 mt-2 ml-1">{helperText}</p>
      ) : null}
    </div>
  );
}
