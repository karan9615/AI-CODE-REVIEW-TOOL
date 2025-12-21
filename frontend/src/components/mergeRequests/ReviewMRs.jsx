import React, { useEffect, useState } from "react";
import { RefreshCw, FileCode, X } from "lucide-react";
import { api } from "../../utils/api";
import { Alert } from "../common/Alert";
import { ProgressSteps } from "../common/ProgressSteps";
import { MRCard } from "./MRCard";
import { motion, AnimatePresence } from "framer-motion";
import { Loader } from "../common/Loader";

export function ReviewMRs({ token, project }) {
  const [mrs, setMrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reviewing, setReviewing] = useState(null);
  const [reviewSuccess, setReviewSuccess] = useState(null);
  const [progress, setProgress] = useState([]);

  const [showModelModal, setShowModelModal] = useState(false);
  const [selectedMR, setSelectedMR] = useState(null);
  const [selectedModel, setSelectedModel] = useState("chatgpt");

  useEffect(() => {
    loadMRs();
  }, []);

  const loadMRs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api("/mrs", { token, projectId: project.id });
      if (data.error) throw new Error(data.error);
      setMrs(data);
    } catch (err) {
      setError("Failed to load merge requests: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewClick = (mr) => {
    setSelectedMR(mr);
    setShowModelModal(true);
    setReviewSuccess(null);
    setError(null);
  };

  const startReview = async () => {
    if (!selectedMR) return;

    setShowModelModal(false);
    setReviewing(selectedMR.iid);
    setReviewSuccess(null);
    setError(null);

    // Show progress steps
    setProgress([
      { id: 1, text: "Fetching MR details...", status: "active" },
      { id: 2, text: "Analyzing code changes...", status: "pending" },
      { id: 3, text: "Generating AI review...", status: "pending" },
      { id: 4, text: "Posting comments...", status: "pending" },
    ]);

    try {
      // Step 1: Fetching details
      await new Promise((resolve) => setTimeout(resolve, 800));
      setProgress((p) =>
        p.map((s, i) =>
          i === 0
            ? { ...s, status: "complete" }
            : i === 1
              ? { ...s, status: "active" }
              : s
        )
      );

      // Step 2: Analyzing changes
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setProgress((p) =>
        p.map((s, i) =>
          i <= 1
            ? { ...s, status: "complete" }
            : i === 2
              ? { ...s, status: "active" }
              : s
        )
      );

      // Step 3: Call API
      const result = await api("/review-mr", {
        token,
        projectId: project.id,
        mrIid: selectedMR.iid,
        model: selectedModel,
      });

      if (result.error) throw new Error(result.error);

      setProgress((p) =>
        p.map((s, i) =>
          i <= 2
            ? { ...s, status: "complete" }
            : i === 3
              ? { ...s, status: "active" }
              : s
        )
      );

      // Step 4: Complete
      await new Promise((resolve) => setTimeout(resolve, 500));
      setProgress((p) => p.map((s) => ({ ...s, status: "complete" })));

      setReviewSuccess({
        iid: selectedMR.iid,
        comments: result.comments,
      });
    } catch (err) {
      setError(`Failed to review MR #${selectedMR.iid}: ${err.message}`);
      setProgress([]);
    } finally {
      setReviewing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader size="lg" text="Loading Merge Requests..." />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h3 className="text-2xl font-bold text-surface mb-2">Assigned Merge Requests</h3>
          <p className="text-surface-muted">
            Review open MRs with AI assistance
          </p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 glass-button rounded-xl text-sm font-medium text-surface shadow-sm"
          onClick={loadMRs}
          disabled={loading}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-6">
          <Alert type="error">{error}</Alert>
        </div>
      )}

      {reviewSuccess && (
        <div className="mb-6">
          <Alert type="success">
            <div>
              <div className="font-bold">
                Review completed for MR #{reviewSuccess.iid}
              </div>
              {reviewSuccess.comments && (
                <div className="text-sm mt-1 opacity-80">
                  💬 {reviewSuccess.comments.posted} of{" "}
                  {reviewSuccess.comments.total} comments posted
                  {reviewSuccess.comments.failed > 0 &&
                    ` (${reviewSuccess.comments.failed} failed)`}
                </div>
              )}
            </div>
          </Alert>
        </div>
      )}

      {/* Progress Steps */}
      {reviewing && progress.length > 0 && <ProgressSteps steps={progress} />}

      {/* Model Selection Modal */}
      <AnimatePresence>
        {showModelModal && (
          <ModelSelectionModal
            mr={selectedMR}
            model={selectedModel}
            setModel={setSelectedModel}
            onConfirm={startReview}
            onCancel={() => setShowModelModal(false)}
          />
        )}
      </AnimatePresence>

      {mrs.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20 glass-panel rounded-2xl"
        >
          <FileCode className="w-12 h-12 text-surface-muted/50 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">
            No merge requests found
          </h3>
          <p className="text-sm text-surface-muted">
            Create a new MR or check back later
          </p>
        </motion.div>
      ) : (
        <motion.div
          layout
          className="space-y-4"
        >
          {mrs.map((mr) => (
            <MRCard
              key={mr.iid}
              mr={mr}
              onReview={handleReviewClick}
              isReviewing={reviewing === mr.iid}
            />
          ))}
        </motion.div>
      )}
    </div>
  );
}

function ModelSelectionModal({ mr, model, setModel, onConfirm, onCancel }) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 z-50 backdrop-blur-sm"
        onClick={onCancel}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: '-50%', x: '-50%' }}
        animate={{ opacity: 1, scale: 1, y: '-50%', x: '-50%' }}
        exit={{ opacity: 0, scale: 0.95, y: '-50%', x: '-50%' }}
        className="fixed top-1/2 left-1/2 w-[90%] max-w-lg glass-panel rounded-2xl shadow-2xl z-50 overflow-hidden border border-border-color/10"
      >
        <div className="flex justify-between items-center px-6 py-5 border-b border-border-color/10">
          <h3 className="text-xl font-bold text-surface">Select AI Model</h3>
          <button className="p-2 hover:bg-background-tertiary rounded-lg transition-colors text-surface-muted hover:text-surface" onClick={onCancel}>
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-center gap-4 p-4 bg-background-tertiary/50 rounded-xl mb-6 border border-border-color/10">
            <div className="px-3 py-1.5 bg-primary/20 text-primary-light border border-primary/20 rounded-lg text-sm font-bold">
              #{mr.iid}
            </div>
            <div>
              <div className="font-semibold text-surface mb-1 line-clamp-1">{mr.title}</div>
              <div className="text-xs text-surface-muted font-mono">
                {mr.source_branch} → {mr.target_branch}
              </div>
            </div>
          </div>

          <div className="mb-8">
            <label className="block text-sm font-semibold text-surface-muted mb-2 ml-1">Choose AI Model</label>
            <div className="relative group">
              <select
                className="input-field appearance-none cursor-pointer hover:border-primary/50 text-surface"
                value={model}
                onChange={(e) => setModel(e.target.value)}
              >
                <option value="chatgpt" className="bg-background-secondary text-surface">ChatGPT (GPT-4) - Recommended</option>
                <option value="gemini" className="bg-background-secondary text-surface">Google Gemini Pro</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-surface-muted group-hover:text-primary transition-colors">
                <ArrowRight size={16} className="rotate-90" />
              </div>
            </div>
            <p className="text-xs text-surface-muted/60 mt-2 ml-1">
              The AI will analyze code changes and post review comments
            </p>
          </div>

          <div className="flex gap-3">
            <button
              className="flex-1 py-2.5 px-4 rounded-xl font-medium text-surface-muted glass-button transition-colors"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              className="flex-1 py-2.5 px-4 rounded-xl font-medium text-white bg-primary hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] border border-primary/50"
              onClick={onConfirm}
            >
              Start AI Review
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// Helper icon
function ArrowRight(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  )
}
