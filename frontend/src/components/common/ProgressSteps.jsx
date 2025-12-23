import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Loader } from '../common/Loader';

export function ProgressSteps({ steps }) {
  return (
    <div className="max-w-xs mx-auto space-y-3">
      {steps.map((step, index) => (
        <motion.div
          key={step.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className="flex items-center gap-3"
        >
          {/* Status Icon/Bubble */}
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border transition-colors duration-300 ${step.status === "complete"
              ? "bg-accent-cyan/20 border-accent-cyan text-accent-cyan"
              : step.status === "active"
                ? "bg-primary/20 border-primary text-primary shadow-[0_0_10px_rgba(124,58,237,0.3)]"
                : "bg-surface/5 border-surface/10 text-surface-muted"
            }`}>
            {step.status === "complete" ? (
              <CheckCircle2 size={16} />
            ) : step.status === "active" ? (
              <div className="scale-75"><Loader size="sm" text="" /></div>
            ) : (
              <span className="text-xs font-semibold">{step.id}</span>
            )}
          </div>

          {/* Text */}
          <span className={`text-sm font-medium transition-colors duration-300 ${step.status === "active"
              ? "text-primary font-bold shadow-sm"
              : step.status === "complete"
                ? "text-accent-cyan"
                : "text-surface-muted"
            }`}>
            {step.text}
          </span>
        </motion.div>
      ))}
    </div>
  );
}