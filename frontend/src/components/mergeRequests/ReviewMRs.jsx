import React, { useEffect, useState } from "react";
import { RefreshCw, FileCode, Sparkles } from "lucide-react";
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
    <div className="w-full max-w-3xl mx-auto">
      <Card className="overflow-hidden border-0 ring-1 ring-border-color/10 shadow-2xl relative bg-background-secondary/40 backdrop-blur-xl min-h-[600px]">
        {/* Decorative Grid Background */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-soft-light"></div>

        {/* Header Section */}
        <div className="relative p-8 border-b border-border-color/10 bg-background-secondary/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-accent-cyan/10 flex items-center justify-center text-accent-cyan shadow-inner">
              <FileCode size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-surface">Merge Requests</h3>
              <p className="text-surface-muted text-sm">Select an MR to review with AI</p>
            </div>
          </div>
          <Button
            onClick={loadMRs}
            disabled={loading}
            variant="secondary"
            size="sm"
            className="shrink-0 rounded-full px-4 font-medium text-sm gap-2 hover:bg-surface-muted/20"
            icon={RefreshCw}
          >
            Refresh
          </Button>
        </div>

        <CardContent className="p-0 relative z-10">
          {error && (
            <div className="p-8 pb-0">
              <Alert type="error">{error}</Alert>
            </div>
          )}

          {reviewSuccess && (
            <div className="p-8 pb-0">
              <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
                <Alert type="success">
                  <div className="flex flex-col gap-1">
                    <span className="font-bold">Review Complete for MR #{reviewSuccess.iid}</span>
                    <span className="text-sm opacity-90">
                      {reviewSuccess.comments?.posted} comments posted successfully.
                    </span>
                  </div>
                </Alert>
              </motion.div>
            </div>
          )}

          {/* Progress Steps Overlay */}
          <AnimatePresence>
            {reviewing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-50 bg-background/80 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center"
              >
                <div className="w-full max-w-md">
                  <div className="mb-8 w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center text-primary relative">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 border-2 border-primary/30 border-t-transparent rounded-full"
                    />
                    <Sparkles size={32} />
                  </div>
                  <ProgressSteps steps={progress} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="p-6 sm:p-8 space-y-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4 text-surface-muted">
                <Loader size="lg" text="" />
                <p>Fetching merge requests...</p>
              </div>
            ) : mrs.length === 0 ? (
              <div className="text-center py-20 px-4">
                <div className="w-16 h-16 mx-auto bg-surface-muted/10 rounded-full flex items-center justify-center text-surface-muted mb-4">
                  <FileCode size={32} opacity={0.5} />
                </div>
                <h3 className="text-lg font-semibold text-surface mb-2">No Open Merge Requests</h3>
                <p className="text-sm text-surface-muted max-w-xs mx-auto">
                  There are no open merge requests in this project. Create one to get started!
                </p>
              </div>
            ) : (
              <motion.div layout className="grid grid-cols-1 gap-4">
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
        </CardContent>

        {/* Modal remains unchanged logically but structurally inside the fragment if needed, 
            though it renders via Portal usually or absolute. 
            We'll stick to keeping the Modal code as is but just outside this main return block 
            or ensure it's still in the component tree.
            Wait, I am replacing the return block of ReviewMRs. 
            I need to keep the Modal rendering. */}
      </Card>

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
          <Button onClick={startReview} className="flex-1" icon={Sparkles}>
            Start AI Review
          </Button>
        </div>
      </Modal>
    </div>
  );
}
