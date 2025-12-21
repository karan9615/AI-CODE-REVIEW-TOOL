import React from "react";
import { GitBranch, MessageSquare, Sparkles, ExternalLink } from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";

export function MRCard({ mr, onReview, isReviewing }) {
  return (
    <Card className="p-6 hover:border-primary/30 transition-all group">
      <div className="flex items-start gap-4 mb-4">
        <span className="bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 font-mono shadow-[0_0_10px_rgba(124,58,237,0.1)]">
          #{mr.iid}
        </span>
        <h4 className="text-base font-bold text-surface leading-tight group-hover:text-primary-light transition-colors">
          {mr.title}
        </h4>
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
          <Button
            href={mr.web_url}
            target="_blank"
            rel="noopener noreferrer"
            variant="secondary"
            icon={ExternalLink}
            className="flex-1"
          >
            View in GitLab
          </Button>
        )}
        <Button
          onClick={() => onReview(mr)}
          disabled={isReviewing}
          isLoading={isReviewing}
          loadingText="Reviewing..."
          icon={Sparkles}
          className="flex-1"
        >
          AI Review
        </Button>
      </div>
    </Card>
  );
}
