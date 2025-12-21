import React, { useEffect, useState } from "react";
import { RefreshCw, FileCode } from "lucide-react";
import { api } from "../../utils/api";
import { Alert } from "../common/Alert";
import { ProgressSteps } from "../common/ProgressSteps";
import { MRCard } from "./MRCard";
import { motion, AnimatePresence } from "framer-motion";
import { Loader } from "../common/Loader";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Select } from "../ui/Select";
import { Card, CardContent } from "../ui/Card";
import { useModels } from "../../contexts/ModelsContext";

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

  // Get models from context (fetched once per session)
  const { models: modelOptions } = useModels();

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
      setProgress((p) => p.map((s, i) => (i === 0 ? { ...s, status: "complete" } : i === 1 ? { ...s, status: "active" } : s)));

      // Step 2: Analyzing changes
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setProgress((p) => p.map((s, i) => (i <= 1 ? { ...s, status: "complete" } : i === 2 ? { ...s, status: "active" } : s)));

      // Step 3: Call API
      const result = await api("/review-mr", {
        token,
        projectId: project.id,
        mrIid: selectedMR.iid,
        model: selectedModel,
      });

      if (result.error) throw new Error(result.error);

      setProgress((p) => p.map((s, i) => (i <= 2 ? { ...s, status: "complete" } : i === 3 ? { ...s, status: "active" } : s)));

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
          <p className="text-surface-muted">Review open MRs with AI assistance</p>
        </div>
        <Button onClick={loadMRs} disabled={loading} variant="secondary" icon={RefreshCw} size="sm">
          Refresh
        </Button>
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
              <div className="font-bold">Review completed for MR #{reviewSuccess.iid}</div>
              {reviewSuccess.comments && (
                <div className="text-sm mt-1 opacity-80">
                  💬 {reviewSuccess.comments.posted} of {reviewSuccess.comments.total} comments posted
                  {reviewSuccess.comments.failed > 0 && ` (${reviewSuccess.comments.failed} failed)`}
                </div>
              )}
            </div>
          </Alert>
        </div>
      )}

      {/* Progress Steps */}
      {reviewing && progress.length > 0 && <ProgressSteps steps={progress} />}

      {/* Model Selection Modal */}
      <Modal
        isOpen={showModelModal}
        onClose={() => setShowModelModal(false)}
        title="Select AI Model"
      >
        <div className="flex items-center gap-4 p-4 bg-background-tertiary/50 rounded-xl mb-6 border border-border-color/10">
          <div className="px-3 py-1.5 bg-primary/20 text-primary-light border border-primary/20 rounded-lg text-sm font-bold">
            #{selectedMR?.iid}
          </div>
          <div>
            <div className="font-semibold text-surface mb-1 line-clamp-1">{selectedMR?.title}</div>
            <div className="text-xs text-surface-muted font-mono">
              {selectedMR?.source_branch} → {selectedMR?.target_branch}
            </div>
          </div>
        </div>

        <div className="mb-8">
          <Select
            label="Choose AI Model"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            options={modelOptions}
            helperText="The AI will analyze code changes and post review comments"
          />
        </div>

        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => setShowModelModal(false)} className="flex-1">
            Cancel
          </Button>
          <Button onClick={startReview} className="flex-1">
            Start AI Review
          </Button>
        </div>
      </Modal>

      {mrs.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent>
            <FileCode className="w-12 h-12 text-surface-muted/50 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-surface mb-2">No merge requests found</h3>
            <p className="text-sm text-surface-muted">Create a new MR or check back later</p>
          </CardContent>
        </Card>
      ) : (
        <motion.div layout className="space-y-4">
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
