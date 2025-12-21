import React from "react";
import { GitBranch, MessageSquare, Sparkles, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import { Loader } from "../common/Loader";

export function MRCard({ mr, onReview, isReviewing }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel p-6 rounded-2xl hover:border-primary/30 transition-all group"
    >
      <div className="flex items-start gap-4 mb-4">
        <span className="bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 font-mono shadow-[0_0_10px_rgba(124,58,237,0.1)]">
          #{mr.iid}
        </span>
        <h4 className="text-base font-bold text-surface leading-tight group-hover:text-primary-light transition-colors">{mr.title}</h4>
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-surface-muted mb-6">
        <span className="flex items-center gap-2 px-3 py-1.5 bg-background-tertiary/50 rounded-lg border border-border-color/10">
          <GitBranch size={14} className="text-surface-muted" />
          <span className="font-mono text-xs text-surface/90">{mr.source_branch}</span>
          <span className="text-surface-muted/50">→</span>
          <span className="font-mono text-xs text-surface/90">{mr.target_branch}</span>
        </span>
        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-background-tertiary/50 rounded-lg border border-border-color/10">
          <MessageSquare size={14} className="text-surface-muted" />
          <span className="text-surface/90">{mr.user_notes_count || 0} comments</span>
        </span>
      </div>

      <div className="flex gap-3">
        {mr.web_url && (
          <a
            href={mr.web_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 glass-button text-surface-muted hover:text-surface rounded-xl text-sm font-medium"
          >
            View in GitLab
            <ExternalLink size={14} />
          </a>
        )}
        <button
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium shadow-lg transition-all text-sm border ${isReviewing
            ? "bg-primary/20 border-primary/20 cursor-not-allowed text-primary dark:text-white"
            : "bg-primary border-primary/50 hover:bg-primary-hover shadow-primary/20 text-white"
            }`}
          onClick={() => onReview(mr)}
          disabled={isReviewing}
        >
          {isReviewing ? (
            <>
              <div className="scale-75"><Loader size="sm" text="" /></div>
              <span>Reviewing...</span>
            </>
          ) : (
            <>
              <Sparkles size={16} />
              AI Review
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}
