import React from "react";
import { Sparkles, LogOut, ChevronRight, User } from "lucide-react";
import { motion } from "framer-motion";
import { ThemeToggle } from "./ThemeToggle";

export function Header({ title, onBack, onLogout, showBackButton = false, showThemeToggle = false }) {
  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-surface/5 shadow-sm transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ rotate: 15 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="p-2 bg-primary/10 rounded-lg border border-primary/20"
          >
            <Sparkles className="w-5 h-5 text-primary" />
          </motion.div>
          <span className="text-lg font-bold text-surface tracking-tight">{title}</span>
        </div>

        <div className="flex items-center gap-2">
          {showThemeToggle && <ThemeToggle />}

          {showBackButton && (
            <motion.button
              whileHover={{ x: -2, backgroundColor: "rgba(var(--surface-muted), 0.1)" }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-surface-muted hover:text-surface transition-colors border border-transparent hover:border-surface/5"
              onClick={onBack}
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
              <span className="text-sm font-medium">Projects</span>
            </motion.button>
          )}
          {onLogout && (
            <motion.button
              whileHover={{ scale: 1.05, backgroundColor: "rgba(var(--surface-muted), 0.1)" }}
              whileTap={{ scale: 0.95 }}
              className="p-2 rounded-lg text-surface-muted hover:text-accent-pink transition-colors"
              onClick={onLogout}
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </motion.button>
          )}
        </div>
      </div>
    </header>
  );
}
