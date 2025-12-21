import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export function Loader({ size = "md", text = "Loading..." }) {
  const sizes = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16"
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className={`${sizes[size]} rounded-full border-2 border-primary/20 border-t-primary border-r-primary shadow-[0_0_15px_rgba(124,58,237,0.3)]`}
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <Sparkles className="w-1/2 h-1/2 text-primary-light" strokeWidth={3} />
        </motion.div>
      </div>
      {text && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-surface-muted text-sm font-medium tracking-wide"
        >
          {text}
        </motion.p>
      )}
    </div>
  );
}
