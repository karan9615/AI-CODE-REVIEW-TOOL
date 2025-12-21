import React from "react";
import { motion } from "framer-motion";

export function Card({ children, className = "", animate = true }) {
  const content = (
    <div
      className={`glass-panel rounded-2xl border border-border-color/20 dark:border-white/5 shadow-xl ${className}`}
    >
      {children}
    </div>
  );

  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {content}
      </motion.div>
    );
  }

  return content;
}

export function CardHeader({ title, subtitle, className = "" }) {
  return (
    <div className={`mb-6 ${className}`}>
      {title && <h3 className="text-lg font-bold text-surface">{title}</h3>}
      {subtitle && <p className="text-sm text-surface-muted mt-1">{subtitle}</p>}
    </div>
  );
}

export function CardContent({ children, className = "" }) {
  return <div className={className}>{children}</div>;
}
