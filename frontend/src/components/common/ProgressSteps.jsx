import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Loader } from '../common/Loader';

export function ProgressSteps({ steps }) {
  return (
    <div className="space-y-2">
      {steps.map((step, index) => (
        <motion.div
          key={step.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className="flex items-center gap-4 py-2"
        >
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 border ${step.status === "complete"
            ? "bg-accent-cyan/20 border-accent-cyan text-accent-cyan"
            : step.status === "active"
              ? "bg-primary/20 border-primary text-primary shadow-[0_0_10px_rgba(124,58,237,0.3)]"
              : "bg-background-tertiary border-border-color/10 text-surface-muted"
            }`}>
            {step.status === "complete" ? (
              <CheckCircle2 size={16} />
            ) : step.status === "active" ? (
              <div className="scale-75"><Loader size="sm" text="" /></div>
            ) : (
              <span className="text-xs font-semibold">{step.id}</span>
            )}
          </div>
          <span className={`text-sm font-medium transition-colors duration-300 ${step.status === "active" ? "text-primary font-bold dark:text-white" : "text-surface-muted"
            } ${step.status === "complete" ? "text-accent-cyan" : ""}`}>{step.text}</span>
        </motion.div>
      ))}
    </div>
  );
}