import React from "react";
import { motion } from "framer-motion";
import { Loader } from "../common/Loader";

export function Button({
  children,
  onClick,
  variant = "primary",
  size = "md",
  className = "",
  disabled = false,
  isLoading = false,
  loadingText = "Loading...",
  icon: Icon,
  type = "button",
  ...props
}) {
  const baseStyles =
    "flex items-center justify-center font-medium rounded-xl transition-all duration-200 outline-none focus:ring-2 focus:ring-primary/50 disabled:cursor-not-allowed";

  const variants = {
    primary:
      "bg-primary text-white border border-primary/50 shadow-lg shadow-primary/20 hover:bg-primary-hover hover:scale-[1.02] active:scale-[0.98] disabled:bg-primary/30 disabled:border-transparent disabled:text-white/50 disabled:shadow-none disabled:hover:scale-100",
    secondary:
      "glass-button text-surface shadow-sm border border-border-color/20 hover:border-primary/30 disabled:opacity-50 disabled:hover:scale-100",
    ghost:
      "bg-transparent text-surface-muted hover:text-surface hover:bg-background-tertiary disabled:opacity-50",
    danger:
      "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2.5 text-sm",
    lg: "px-6 py-3.5 text-base",
  };

  if (props.href) {
    return (
      <a
        href={props.href}
        target={props.target}
        rel={props.rel}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      >
        {Icon && <Icon size={size === "sm" ? 14 : size === "lg" ? 20 : 18} className="mr-2" />}
        {children}
      </a>
    );
  }

  return (
    <button
      type={type}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      onClick={onClick}
      disabled={disabled || isLoading}
    >
      {isLoading ? (
        <>
          <div className="scale-75 mr-2">
            <Loader size="sm" text="" />
          </div>
          {loadingText && <span>{loadingText}</span>}
        </>
      ) : (
        <>
          {Icon && <Icon size={size === "sm" ? 14 : size === "lg" ? 20 : 18} className="mr-2" />}
          {children}
        </>
      )}
    </button>
  );
}
