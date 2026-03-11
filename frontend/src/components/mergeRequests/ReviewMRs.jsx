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
import { useModels } from "../../context/ModelsContext";
import { useToast } from "../../context/ToastContext";

import { useMergeRequest } from "../../hooks/useMergeRequest";

export function ReviewMRs({ project }) {
  const [mrs, setMrs] = useState([]);
  const [loadingMrs, setLoadingMrs] = useState(true);
  const [listError, setListError] = useState(null);
  const [reviewingIid, setReviewingIid] = useState(null);

  const [showModelModal, setShowModelModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedMR, setSelectedMR] = useState(null);
  const [selectedModel, setSelectedModel] = useState("");

  const [actionType, setActionType] = useState("review");

  // Custom Hook
  const {
    loading: reviewLoading,
    error: reviewError,
    success: reviewSuccess,
    progress,
    reviewMR,
    updateMRContent,
    resetState,
  } = useMergeRequest(project.id);

  // Get models from context
  const { models: modelOptions } = useModels();

  // Combine errors
  const error = listError || reviewError;

  useEffect(() => {
    loadMRs();
  }, []);

  const loadMRs = async () => {
    setLoadingMrs(true);
    setListError(null);
    try {
      const data = await api("/mrs", { projectId: project.id });
      if (data.error) throw new Error(data.error);
      setMrs(data);
    } catch (err) {
      setListError("Failed to load merge requests: " + err.message);
    } finally {
      setLoadingMrs(false);
    }
  };

  const handleReviewClick = (mr) => {
    setSelectedMR(mr);
    setShowModelModal(true);
    resetState();
  };

  const handleUpdateClick = (mr) => {
    setSelectedMR(mr);
    setShowUpdateModal(true);
    resetState();
  };

  const { success: toastSuccess, error: toastError } = useToast();

  const startReview = async () => {
    if (!selectedMR) return;

    setShowModelModal(false);
    setReviewingIid(selectedMR.iid);
    setActionType("review");
    resetState();

    try {
      await reviewMR(selectedMR.iid, selectedModel);
      toastSuccess(`Code Review completed for MR #${selectedMR.iid}`);
    } catch (err) {
      toastError(err.message || "Failed to complete AI review.");
    } finally {
      setReviewingIid(null);
    }
  };

  const startUpdate = async () => {
    if (!selectedMR) return;
    setShowUpdateModal(false);
    setReviewingIid(selectedMR.iid);
    setActionType("update");
    resetState();

    try {
      await updateMRContent(selectedMR.iid, selectedModel);
      toastSuccess(`MR details enhanced for #${selectedMR.iid}`);
    } catch (err) {
      toastError(err.message || "Failed to enhance MR details.");
    } finally {
      setReviewingIid(null);
    }
  };

  if (loadingMrs) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader size="lg" text="Loading Merge Requests..." />
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      <Card className="border-0 ring-1 ring-border-color/10 shadow-2xl relative bg-background-secondary/40 backdrop-blur-xl">
        {/* Decorative Grid Background */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-soft-light rounded-2xl overflow-hidden"></div>

        {/* Header Section */}
        <div className="relative p-6 sm:p-8 border-b border-border-color/10 bg-background-secondary/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 rounded-t-2xl">
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner transition-colors duration-300 ${
                reviewingIid
                  ? "bg-primary/10 text-primary"
                  : "bg-accent-cyan/10 text-accent-cyan"
              }`}
            >
              {reviewingIid ? <Sparkles size={24} /> : <FileCode size={24} />}
            </div>
            <div>
              <h3 className="text-xl font-bold text-surface transition-all duration-300">
                {reviewingIid
                  ? actionType === "review"
                    ? "Code Review"
                    : "Enhance MR Details"
                  : "Merge Requests"}
              </h3>
              <p className="text-surface-muted text-sm transition-all duration-300">
                {reviewingIid
                  ? actionType === "review"
                    ? "Analyzing code changes and generating comments..."
                    : "Optimizing title and description..."
                  : "Select an MR to review or enhance with AI"}
              </p>
            </div>
          </div>
          <Button
            onClick={loadMRs}
            disabled={loadingMrs || reviewingIid}
            variant="secondary"
            size="sm"
            className={`shrink-0 rounded-full px-4 font-medium text-sm gap-2 hover:bg-surface-muted/20 ${reviewingIid ? "opacity-0 pointer-events-none" : "opacity-100"}`}
            icon={RefreshCw}
          >
            Refresh
          </Button>
        </div>

        <CardContent className="p-0 relative z-10 transition-all duration-300 ease-in-out">
          {/* Main Content / Loading Switcher */}
          <AnimatePresence mode="wait">
            {reviewingIid ? (
              <motion.div
                key="reviewing"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-col items-center justify-center py-16 px-8"
              >
                <div className="w-full max-w-sm mx-auto flex flex-col items-center">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="mb-8 flex flex-col items-center gap-4"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-lg shadow-primary/20 relative overflow-hidden">
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-tr from-transparent via-primary/20 to-transparent"
                        animate={{ x: ["-100%", "100%"] }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      />
                      <Sparkles size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-surface">
                      {actionType === "review"
                        ? "AI Review in Progress"
                        : "AI Enhancement in Progress"}
                    </h3>
                  </motion.div>

                  <ProgressSteps steps={progress} />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {error && (
                  <div className="p-8 pb-0">
                    <Alert type="error">{error}</Alert>
                  </div>
                )}

                {reviewSuccess && (
                  <div className="p-8 pb-0">
                    <motion.div
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <Alert type="success">
                        <div className="flex flex-col gap-1">
                          <span className="font-bold">
                            {actionType === "review"
                              ? `Review Complete for MR #${reviewSuccess.iid}`
                              : `Enhancement Complete for MR #${reviewSuccess.iid}`}
                          </span>
                          <span className="text-sm opacity-90">
                            {actionType === "review"
                              ? `${reviewSuccess.comments?.posted} comments posted successfully.`
                              : "Title & Description have been updated."}
                          </span>
                        </div>
                      </Alert>
                    </motion.div>
                  </div>
                )}

                <div className="p-6 sm:p-8 space-y-4 min-h-[400px]">
                  {loadingMrs ? (
                    <div className="flex flex-col items-center justify-center py-20 space-y-4 text-surface-muted">
                      <Loader size="lg" text="" />
                      <p>Fetching merge requests...</p>
                    </div>
                  ) : mrs.length === 0 ? (
                    <div className="text-center py-20 px-4">
                      <div className="w-16 h-16 mx-auto bg-surface-muted/10 rounded-full flex items-center justify-center text-surface-muted mb-4">
                        <FileCode size={32} opacity={0.5} />
                      </div>
                      <h3 className="text-lg font-semibold text-surface mb-2">
                        No Open Merge Requests
                      </h3>
                      <p className="text-sm text-surface-muted max-w-xs mx-auto">
                        There are no open merge requests in this project. Create
                        one to get started!
                      </p>
                    </div>
                  ) : (
                    <motion.div layout className="grid grid-cols-1 gap-4">
                      {mrs.map((mr) => (
                        <MRCard
                          key={mr.iid}
                          mr={mr}
                          onReview={handleReviewClick}
                          onUpdate={handleUpdateClick}
                          isReviewing={reviewingIid === mr.iid}
                        />
                      ))}
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
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
            <div className="font-semibold text-surface mb-1 line-clamp-1">
              {selectedMR?.title}
            </div>
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
          <Button
            variant="ghost"
            onClick={() => setShowModelModal(false)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={startReview}
            className="flex-1"
            icon={Sparkles}
            disabled={!selectedModel}
            title={!selectedModel ? "Please select an AI model" : ""}
          >
            Start AI Review
          </Button>
        </div>
      </Modal>

      {/* Update MR Modal */}
      <Modal
        isOpen={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
        title="Enhance MR Details"
      >
        <div className="mb-6 text-sm text-surface-muted">
          This will use AI to analyze the diffs and <strong>overwrite</strong>{" "}
          the current title and description of the merge request.
        </div>

        <div className="mb-8">
          <Select
            label="Choose AI Model"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            options={modelOptions}
          />
        </div>

        <div className="flex gap-3">
          <Button
            variant="ghost"
            onClick={() => setShowUpdateModal(false)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={startUpdate}
            className="flex-1"
            icon={Sparkles}
            disabled={!selectedModel}
            title={!selectedModel ? "Please select an AI model" : ""}
          >
            Enhance Content
          </Button>
        </div>
      </Modal>
    </div>
  );
}
