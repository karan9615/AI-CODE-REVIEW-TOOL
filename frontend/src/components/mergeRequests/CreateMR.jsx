import React, { useEffect, useState } from "react";
import { GitBranch, Sparkles, ArrowRight as ArrowIcon } from "lucide-react";
import { api } from "../../utils/api";
import { Alert } from "../common/Alert";
import { ProgressSteps } from "../common/ProgressSteps";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "../ui/Card";
import { Button } from "../ui/Button";
import { Select } from "../ui/Select";
import { useModels } from "../../contexts/ModelsContext";

export function CreateMR({ token, project }) {
  const [branches, setBranches] = useState([]);
  const [src, setSrc] = useState("");
  const [tgt, setTgt] = useState("");
  const [model, setModel] = useState("chatgpt");
  const [loading, setLoading] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [progress, setProgress] = useState([]);

  // Get models from context
  const { models: modelOptions } = useModels();

  useEffect(() => {
    loadBranches();
  }, []);

  const loadBranches = async () => {
    setLoadingBranches(true);
    try {
      const data = await api("/branches", { token, projectId: project.id });
      if (data.error) throw new Error(data.error);
      setBranches(data);
    } catch (err) {
      setError("Failed to load branches: " + err.message);
    } finally {
      setLoadingBranches(false);
    }
  };

  const create = async () => {
    if (!src || !tgt) return setError("Please select both source and target branches");
    if (src === tgt) return setError("Source and target branches must be different");

    setLoading(true);
    setError(null);
    setSuccess(null);
    setProgress([
      { id: 1, text: "Analyzing changes...", status: "active" },
      { id: 2, text: "Generating MR content...", status: "pending" },
      { id: 3, text: "Creating merge request...", status: "pending" },
      { id: 4, text: "Posting AI review comments...", status: "pending" },
    ]);

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      setProgress((p) => p.map((s, i) => (i === 0 ? { ...s, status: "complete" } : i === 1 ? { ...s, status: "active" } : s)));

      await new Promise((resolve) => setTimeout(resolve, 1500));
      setProgress((p) => p.map((s, i) => (i <= 1 ? { ...s, status: "complete" } : i === 2 ? { ...s, status: "active" } : s)));

      const result = await api("/mr", {
        token,
        projectId: project.id,
        model,
        mr: { source_branch: src, target_branch: tgt },
      });

      if (result.error) throw new Error(result.error);

      setProgress((p) => p.map((s, i) => (i <= 2 ? { ...s, status: "complete" } : i === 3 ? { ...s, status: "active" } : s)));
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setProgress((p) => p.map((s) => ({ ...s, status: "complete" })));

      setSuccess({
        message: "Merge Request Created",
        iid: result.iid,
        url: result.web_url,
        comments: result.comments,
      });
      // Reset form slightly but keep success state visible
      setSrc("");
      setTgt("");
    } catch (err) {
      setError(err.message || "Failed to create merge request");
      setProgress([]);
    } finally {
      setLoading(false);
    }
  };

  const branchOptions = branches.map((b) => ({ label: b.name, value: b.name }));

  return (
    <div className="w-full max-w-3xl mx-auto">
      <Card className="overflow-hidden border-0 ring-1 ring-border-color/10 shadow-2xl relative bg-background-secondary/40 backdrop-blur-xl">
        {/* Decorative Grid Background */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-soft-light"></div>

        {/* Header Section */}
        <div className="relative p-8 border-b border-border-color/10 bg-background-secondary/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
              <Sparkles size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-surface">New Merge Request</h2>
              <p className="text-surface-muted text-sm">Select branches to analyze and merge</p>
            </div>
          </div>
        </div>

        <CardContent className="p-0 relative min-h-[400px]">
          {/* Main Content Area */}
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
                          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        />
                        <Sparkles size={32} />
                      </div>
                      <h3 className="text-xl font-bold text-surface">Processing Request</h3>
                    </motion.div>

                    <ProgressSteps steps={progress} />
                  </div>
                </motion.div>
              ) : success ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center py-8 text-center"
                >
                  <div className="w-20 h-20 bg-accent-cyan/10 rounded-full flex items-center justify-center text-accent-cyan mb-6 shadow-[0_0_30px_rgba(34,211,238,0.2)]">
                    <Sparkles size={40} />
                  </div>
                  <h3 className="text-2xl font-bold text-surface mb-2">{success.message}</h3>
                  <p className="text-surface-muted mb-8 max-w-md">
                    MR #{success.iid} has been created and reviewed.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-4 mt-2">
                    <Button
                      href={success.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-w-[160px] shadow-lg shadow-primary/20"
                    >
                      View in GitLab
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => setSuccess(null)}
                      className="min-w-[140px]"
                    >
                      Create Another
                    </Button>
                  </div>

                  {success.comments && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className={`mt-10 p-4 rounded-xl border flex items-center gap-3 text-sm ${success.comments.posted === 0
                        ? "bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400"
                        : "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400"
                        }`}
                    >
                      {success.comments.posted === 0 ? (
                        <div className="p-1 rounded-full bg-green-500/20"><Sparkles size={14} /></div>
                      ) : (
                        <div className="p-1 rounded-full bg-blue-500/20"><Sparkles size={14} /></div>
                      )}

                      <div className="flex flex-col items-start text-left">
                        <span className="font-semibold">AI Review Completed</span>
                        <span className="opacity-90">
                          {success.comments.posted === 0
                            ? "No issues found. Code looks good!"
                            : `${success.comments.posted} comments posted for review.`}
                        </span>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-8"
                >
                  {error && (
                    <Alert type="error">{error}</Alert>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-4 items-end">
                    <Select
                      label="Source"
                      value={src}
                      onChange={(e) => setSrc(e.target.value)}
                      options={branchOptions}
                      placeholder={loadingBranches ? "Loading..." : "Select source"}
                      disabled={loadingBranches}
                      className="w-full"
                    />

                    <div className="hidden md:flex items-center justify-center pb-3 text-surface-muted/30">
                      <ArrowIcon size={24} />
                    </div>

                    <Select
                      label="Target"
                      value={tgt}
                      onChange={(e) => setTgt(e.target.value)}
                      options={branchOptions}
                      placeholder={loadingBranches ? "Loading..." : "Select target"}
                      disabled={loadingBranches}
                      className="w-full"
                    />
                  </div>

                  {/* Visual Connection Line */}
                  {src && tgt && (
                    <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-primary">
                        <GitBranch size={16} />
                        <span className="font-mono font-bold">{src}</span>
                      </div>
                      <div className="h-[1px] flex-1 bg-gradient-to-r from-primary/20 via-primary/50 to-primary/20 mx-4"></div>
                      <div className="flex items-center gap-2 text-surface-muted">
                        <GitBranch size={16} />
                        <span className="font-mono font-bold">{tgt}</span>
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-border-color/5">
                    <Select
                      label="AI Model"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      options={modelOptions}
                      helperText="Choose the model for code analysis"
                    />
                  </div>

                  <div className="pt-2">
                    <Button
                      className="w-full h-14 text-lg shadow-primary/25 shadow-xl"
                      onClick={create}
                      disabled={loadingBranches || !src || !tgt}
                      icon={Sparkles}
                    >
                      Process Merge Request
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
