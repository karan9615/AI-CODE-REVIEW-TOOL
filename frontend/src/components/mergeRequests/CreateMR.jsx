import React, { useEffect, useState } from "react";
import { GitBranch, Sparkles, FolderGit2, ArrowRight } from "lucide-react";
import { api } from "../../utils/api";
import { Alert } from "../common/Alert";
import { ProgressSteps } from "../common/ProgressSteps";
import { motion } from "framer-motion";
import { Loader } from "../common/Loader";

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
    if (!src || !tgt) {
      setError("Please select both source and target branches");
      return;
    }
    if (src === tgt) {
      setError("Source and target branches must be different");
      return;
    }

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
      setProgress((p) =>
        p.map((s, i) =>
          i === 0
            ? { ...s, status: "complete" }
            : i === 1
              ? { ...s, status: "active" }
              : s
        )
      );

      await new Promise((resolve) => setTimeout(resolve, 1500));
      setProgress((p) =>
        p.map((s, i) =>
          i <= 1
            ? { ...s, status: "complete" }
            : i === 2
              ? { ...s, status: "active" }
              : s
        )
      );

      const result = await api("/mr", {
        token,
        projectId: project.id,
        model,
        mr: { source_branch: src, target_branch: tgt },
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
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setProgress((p) => p.map((s) => ({ ...s, status: "complete" })));

      setSuccess({
        message: "Merge request created successfully!",
        iid: result.iid,
        url: result.web_url,
        comments: result.comments,
      });
    } catch (err) {
      setError(err.message || "Failed to create merge request");
      setProgress([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {error && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <Alert type="error">{error}</Alert>
        </motion.div>
      )}

      {success && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <Alert type="success">
            <div className="font-bold mb-1 text-white">
              {success.message}
            </div>
            <div className="text-sm text-white/80">
              MR #{success.iid} created
              {success.url && (
                <>
                  {" · "}
                  <a
                    href={success.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-white font-semibold transition-colors"
                  >
                    Open in GitLab →
                  </a>
                </>
              )}
              {success.comments && (
                <div className="mt-2 text-xs">
                  💬 {success.comments.posted} of {success.comments.total} AI
                  comments posted
                  {success.comments.failed > 0 &&
                    ` (${success.comments.failed} failed)`}
                </div>
              )}
            </div>
          </Alert>
        </motion.div>
      )}

      {loading && progress.length > 0 && <ProgressSteps steps={progress} />}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-8 rounded-2xl"
      >
        <div className="mb-6">
          <label className="block text-sm font-semibold text-surface-muted mb-2 ml-1">
            Source Branch <span className="text-accent-pink">*</span>
          </label>
          <div className="relative group">
            <select
              className="input-field appearance-none cursor-pointer hover:border-primary/50"
              onChange={(e) => setSrc(e.target.value)}
              disabled={loading || loadingBranches}
              value={src}
            >
              <option value="" className="bg-background-secondary text-surface-muted">Select source branch</option>
              {branches.map((b) => (
                <option key={b.name} value={b.name} className="bg-background-secondary text-white">
                  {b.name}
                </option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-surface-muted group-hover:text-primary transition-colors">
              <ArrowRight size={16} className="rotate-90" />
            </div>
          </div>
          <p className="text-xs text-surface-muted/60 mt-2 ml-1">The branch containing your changes</p>
        </div>

        <div className="mb-8">
          <label className="block text-sm font-semibold text-surface-muted mb-2 ml-1">
            Target Branch <span className="text-accent-pink">*</span>
          </label>
          <div className="relative group">
            <select
              className="input-field appearance-none cursor-pointer hover:border-primary/50"
              onChange={(e) => setTgt(e.target.value)}
              disabled={loading || loadingBranches}
              value={tgt}
            >
              <option value="" className="bg-background-secondary text-surface-muted">Select target branch</option>
              {branches.map((b) => (
                <option key={b.name} value={b.name} className="bg-background-secondary text-white">
                  {b.name}
                </option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-surface-muted group-hover:text-primary transition-colors">
              <ArrowRight size={16} className="rotate-90" />
            </div>
          </div>
          <p className="text-xs text-surface-muted/60 mt-2 ml-1">The branch to merge into</p>
        </div>

        {src && tgt && src !== tgt && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="flex items-center gap-3 p-4 bg-primary/10 border border-primary/20 rounded-xl mb-6 text-sm text-primary-light"
          >
            <GitBranch size={18} className="text-primary" />
            <span className="font-bold text-surface">{src}</span>
            <span className="text-surface-muted">→</span>
            <span className="font-bold text-surface">{tgt}</span>
          </motion.div>
        )}

        <div className="mb-8">
          <label className="block text-sm font-semibold text-surface-muted mb-2 ml-1">AI Model</label>
          <div className="relative group">
            <select
              className="input-field appearance-none cursor-pointer hover:border-primary/50"
              onChange={(e) => setModel(e.target.value)}
              disabled={loading}
              value={model}
            >
              <option value="chatgpt" className="bg-background-secondary text-surface">ChatGPT (GPT-4)</option>
              <option value="gemini" className="bg-background-secondary text-surface">Google Gemini</option>
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-surface-muted group-hover:text-primary transition-colors">
              <ArrowRight size={16} className="rotate-90" />
            </div>
          </div>
        </div>

        <button
          className={`w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-semibold text-white shadow-lg shadow-primary/20 border border-primary/50 transition-all ${loading || loadingBranches || !src || !tgt
            ? "bg-primary/30 cursor-not-allowed shadow-none border-transparent text-white/50"
            : "bg-primary hover:bg-primary-hover hover:scale-[1.01] active:scale-[0.98]"
            }`}
          onClick={create}
          disabled={loading || loadingBranches || !src || !tgt}
        >
          {loading ? (
            <>
              <Loader size="sm" text="" />
              <span className="ml-2">Creating...</span>
            </>
          ) : (
            <>
              <Sparkles size={18} />
              Create & Review MR
            </>
          )}
        </button>
      </motion.div>
    </div>
  );
}
