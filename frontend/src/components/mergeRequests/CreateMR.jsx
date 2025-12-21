import React, { useEffect, useState } from "react";
import { GitBranch, Sparkles } from "lucide-react";
import { api } from "../../utils/api";
import { Alert } from "../common/Alert";
import { ProgressSteps } from "../common/ProgressSteps";
import { motion } from "framer-motion";
import { Card, CardContent } from "../ui/Card";
import { Button } from "../ui/Button";
import { Select } from "../ui/Select";

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
  const [modelOptions, setModelOptions] = useState([
    { label: "ChatGPT (GPT-4)", value: "chatgpt" },
    { label: "Google Gemini", value: "gemini" },
  ]);

  useEffect(() => {
    loadBranches();
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      const models = await api("/config/models", null, "GET");
      if (models && Array.isArray(models)) {
        setModelOptions(models.map((m) => ({ label: m.label, value: m.key })));
      }
    } catch (err) {
      console.warn("Failed to load AI models from backend, using defaults:", err.message);
      // Keep default models if API fails
    }
  };

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

  const branchOptions = branches.map((b) => ({ label: b.name, value: b.name }));

  return (
    <div className="max-w-xl mx-auto">
      {error && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <Alert type="error">{error}</Alert>
        </motion.div>
      )}

      {success && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <Alert type="success">
            <div className="font-bold mb-1">{success.message}</div>
            <div className="text-sm opacity-90">
              MR #{success.iid} created
              {success.url && (
                <>
                  {" · "}
                  <a
                    href={success.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-semibold transition-colors hover:brightness-110"
                  >
                    Open in GitLab →
                  </a>
                </>
              )}
              {success.comments && (
                <div className="mt-2 text-xs opacity-90">
                  💬 {success.comments.posted} of {success.comments.total} AI comments posted
                  {success.comments.failed > 0 && ` (${success.comments.failed} failed)`}
                </div>
              )}
            </div>
          </Alert>
        </motion.div>
      )}

      {loading && progress.length > 0 && <ProgressSteps steps={progress} />}

      <Card className="p-8">
        <CardContent>
          <div className="space-y-6">
            <Select
              label="Source Branch"
              value={src}
              onChange={(e) => setSrc(e.target.value)}
              options={branchOptions}
              placeholder={loadingBranches ? "Loading branches..." : "Select source branch"}
              disabled={loading || loadingBranches}
              required
              helperText="The branch containing your changes"
            />

            <Select
              label="Target Branch"
              value={tgt}
              onChange={(e) => setTgt(e.target.value)}
              options={branchOptions}
              placeholder={loadingBranches ? "Loading branches..." : "Select target branch"}
              disabled={loading || loadingBranches}
              required
              helperText="The branch to merge into"
            />

            {src && tgt && src !== tgt && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="flex items-center gap-3 p-4 bg-primary/10 border border-primary/20 rounded-xl text-sm text-primary-light"
              >
                <GitBranch size={18} className="text-primary shrink-0" />
                <div className="flex flex-wrap items-center gap-2 overflow-hidden">
                  <span className="font-bold text-surface truncate max-w-[120px]">{src}</span>
                  <span className="text-surface-muted">→</span>
                  <span className="font-bold text-surface truncate max-w-[120px]">{tgt}</span>
                </div>
              </motion.div>
            )}

            <Select
              label="AI Model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              options={modelOptions}
              disabled={loading}
            />

            <Button
              className="w-full mt-2"
              onClick={create}
              disabled={loading || loadingBranches || !src || !tgt}
              isLoading={loading}
              loadingText="Creating..."
              icon={Sparkles}
              size="lg"
            >
              Create & Review MR
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
