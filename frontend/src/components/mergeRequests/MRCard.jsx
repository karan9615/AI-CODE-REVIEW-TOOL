import React from "react";
import { GitBranch, MessageSquare, Sparkles, ExternalLink } from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";

export function MRCard({ mr, onReview, onUpdate, isReviewing }) {
  return (
    <Card className="p-5 hover:bg-background-tertiary/30 transition-all group border-border-color/10 hover:border-primary/20">
      <div className="flex flex-col sm:flex-row gap-5 justify-between items-start sm:items-center">
        <div className="space-y-2 min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold text-primary/80 bg-primary/10 px-2 py-0.5 rounded">
              #{mr.iid}
            </span>
            <div className="flex items-center gap-2 text-xs text-surface-muted truncate">
              {mr.source_branch}
              <span className="text-surface-muted/40">→</span>
              {mr.target_branch}
            </div>
          </div>

          <h4
            className="text-base font-bold text-surface leading-tight hover:text-primary transition-colors cursor-pointer line-clamp-1"
            onClick={() =>
              window.open(mr.web_url, "_blank", "noopener,noreferrer")
            }
          >
            {mr.title}
          </h4>

          <div className="flex items-center gap-4 text-xs text-surface-muted font-medium">
            <div className="flex items-center gap-1.5">
              <MessageSquare size={14} className="text-surface-muted/70" />
              {mr.user_notes_count}{" "}
              <span className="hidden sm:inline">comments</span>
            </div>
            {mr.author && (
              <div className="flex items-center gap-1.5 text-surface-muted/70">
                <span>by {mr.author.name}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0">
          <Button
            variant="ghost"
            size="sm"
            className="!p-2 text-surface-muted hover:text-surface"
            href={mr.web_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink size={18} />
          </Button>
          <Button
            onClick={() => onReview(mr)}
            disabled={isReviewing}
            isLoading={isReviewing}
            loadingText="Reviewing"
            icon={Sparkles}
            size="sm"
            className="flex-1 sm:flex-initial shadow-lg shadow-primary/10"
          >
            Review
          </Button>
          <Button
            onClick={() => onUpdate && onUpdate(mr)}
            disabled={isReviewing}
            variant="secondary"
            icon={Sparkles}
            size="sm"
            className="flex-1 sm:flex-initial"
          >
            Enhance
          </Button>
        </div>
      </div>
    </Card>
  );
}
