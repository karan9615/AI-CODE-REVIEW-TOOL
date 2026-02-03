import React, { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { api } from "../../utils/api";
import { Alert } from "../common/Alert";
import { ProgressSteps } from "../common/ProgressSteps";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "../ui/Card";
import { Button } from "../ui/Button";
import { Select } from "../ui/Select";
import { SearchableSelect } from "../ui/SearchableSelect";
import { useModels } from "../../contexts/ModelsContext";

import { useMergeRequest } from "../../hooks/useMergeRequest";

export function CreateMR({ project }) {
  const [src, setSrc] = useState("");
  const [tgt, setTgt] = useState("");
  const [assignee, setAssignee] = useState("");
  const [reviewers, setReviewers] = useState([]);
  const [removeSourceBranch, setRemoveSourceBranch] = useState(false);

  const [model, setModel] = useState("");

  // Use Custom Hook
  const {
    loading,
    error: mrError,
    success,
    progress,
    createMR,
    resetState,
  } = useMergeRequest(project.id);

  const { models: modelOptions } = useModels();

  const fetchBranches = async (query, page) => {
    try {
      const res = await api(
        `/branches?page=${page}&search=${query}`,
        { projectId: project.id },
        "POST",
      );
      return {
        options: res.data.map((b) => ({ label: b.name, value: b.name })),
        hasMore: !!res.pagination?.nextPage,
      };
    } catch (e) {
      console.error(e);
      return { options: [], hasMore: false };
    }
  };

  const fetchMembers = async (query, page) => {
    try {
      // Note: Project Members API in service doesn't return pagination meta yet, assuming simplified list or need update
      const res = await api(
        `/projects/${project.id}/members?search=${query}`,
        {},
        "GET",
      );
      // res is array
      return {
        options: res.map((u) => ({ label: u.name, value: u.id })),
        hasMore: res.length === 20, // heuristic
      };
    } catch (e) {
      return { options: [], hasMore: false };
    }
  };

  const handleCreate = async () => {
    try {
      if (!src || !tgt) return;
      await createMR({
        sourceBranch: src,
        targetBranch: tgt,
        model,
        assigneeId: assignee,
        reviewerIds: reviewers.length ? reviewers : undefined,
        removeSourceBranch,
      });

      setSrc("");
      setTgt("");
    } catch (e) {}
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <Card className="overflow-hidden border-0 ring-1 ring-border-color/10 shadow-2xl relative bg-background-secondary/40 backdrop-blur-xl">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-soft-light"></div>

        {/* Header Section */}
        <div className="relative p-8 border-b border-border-color/10 bg-background-secondary/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
              <Sparkles size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-surface">
                New Merge Request
              </h2>
              <p className="text-surface-muted text-sm">
                Select branches to analyze and merge
              </p>
            </div>
          </div>
        </div>

        <CardContent className="p-0 relative min-h-[400px]">
          <div className="p-8 sm:p-10 relative z-10">
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  className="flex flex-col items-center justify-center py-8"
                >
                  <ProgressSteps steps={progress} />
                </motion.div>
              ) : success ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center py-8 text-center"
                >
                  <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center text-green-500 mb-6">
                    <Sparkles size={40} />
                  </div>
                  <h3 className="text-2xl font-bold text-surface mb-2">
                    {success.message || "Operation Successful"}
                  </h3>
                  <Button
                    href={success.web_url || success.url}
                    target="_blank"
                    className="mt-6"
                  >
                    View in GitLab
                  </Button>
                  <Button variant="ghost" onClick={resetState} className="mt-2">
                    Back to Form
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-8"
                >
                  {mrError && <Alert type="error">{mrError}</Alert>}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <SearchableSelect
                      label="Source Branch"
                      value={src}
                      onChange={setSrc}
                      loadOptions={fetchBranches}
                      placeholder="Select source..."
                      required
                    />
                    <SearchableSelect
                      label="Target Branch"
                      value={tgt}
                      onChange={setTgt}
                      loadOptions={fetchBranches}
                      placeholder="Select target..."
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <SearchableSelect
                      label="Assignee (Optional)"
                      value={assignee}
                      onChange={setAssignee}
                      loadOptions={fetchMembers}
                      placeholder="Search users..."
                    />
                    <SearchableSelect
                      label="Reviewer (Optional)"
                      value={reviewers[0]} // Single reviewer for now
                      onChange={(val) => setReviewers(val ? [val] : [])}
                      loadOptions={fetchMembers}
                      placeholder="Search users..."
                    />
                  </div>

                  <div
                    onClick={() => setRemoveSourceBranch(!removeSourceBranch)}
                    className={`input-field flex items-center gap-4 cursor-pointer group relative overflow-hidden h-auto
                      ${
                        removeSourceBranch
                          ? "ring-2 ring-primary/50 border-primary/50 bg-primary/5"
                          : "hover:border-primary/50"
                      }
                    `}
                  >
                    <div
                      className={`relative flex items-center justify-center w-6 h-6 rounded-md border-2 transition-all duration-200 z-10 shrink-0
                        ${
                          removeSourceBranch
                            ? "bg-primary border-primary text-white scale-100"
                            : "bg-transparent border-surface-muted/30 text-transparent group-hover:border-primary/50"
                        }
                      `}
                    >
                      <motion.div
                        initial={false}
                        animate={{
                          scale: removeSourceBranch ? 1 : 0.5,
                          opacity: removeSourceBranch ? 1 : 0,
                        }}
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </motion.div>
                    </div>
                    <div className="flex flex-col z-10">
                      <span
                        className={`text-sm font-semibold transition-colors ${removeSourceBranch ? "text-primary" : "text-surface"}`}
                      >
                        Delete source branch
                      </span>
                      <span className="text-xs text-surface-muted">
                        Automatically delete the source branch after merging
                      </span>
                    </div>

                    {/* Subtle active background fill animation */}
                    {removeSourceBranch && (
                      <motion.div
                        layoutId="active-bg"
                        className="absolute inset-0 bg-primary/5 z-0"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      />
                    )}
                  </div>

                  <div className="pt-4 border-t border-border-color/5">
                    <Select
                      label="AI Model"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      options={modelOptions}
                      helperText="Choose the model for code analysis"
                    />
                  </div>

                  <Button
                    className="w-full h-14 text-lg shadow-primary/25 shadow-xl"
                    onClick={handleCreate}
                    disabled={!src || !tgt || !model}
                    title={!model ? "Please select an AI model" : ""}
                    icon={Sparkles}
                  >
                    Create Merge Request
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
