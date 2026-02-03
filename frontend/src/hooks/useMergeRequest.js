import { useState } from "react";
import { api } from "../utils/api";

export const useMergeRequest = (projectId) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [progress, setProgress] = useState([]);

  // Create MR
  const createMR = async ({
    sourceBranch,
    targetBranch,
    model,
    assigneeId,
    reviewerIds,
    removeSourceBranch,
  }) => {
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
      // Fake progress for UX (since Backend doesn't stream progress yet)
      await updateProgressFake();

      const result = await api("/mr", {
        projectId,
        model,
        mr: {
          source_branch: sourceBranch,
          target_branch: targetBranch,
          assignee_id: assigneeId,
          reviewer_ids: reviewerIds,
          remove_source_branch: removeSourceBranch,
        },
      });

      if (result.error) throw new Error(result.error);

      // Complete progress
      setProgress((p) => p.map((s) => ({ ...s, status: "complete" })));

      setSuccess({
        message: "Merge Request Created",
        iid: result.iid,
        url: result.web_url,
        comments: result.comments,
      });

      return result;
    } catch (err) {
      setError(err.message || "Failed to create merge request");
      setProgress([]);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Review Existing MR
  const reviewMR = async (mrIid, model) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    setProgress([
      { id: 1, text: "Fetching MR details...", status: "active" },
      { id: 2, text: "Analyzing code changes...", status: "pending" },
      { id: 3, text: "Generating AI review...", status: "pending" },
      { id: 4, text: "Posting comments...", status: "pending" },
    ]);

    try {
      await updateProgressFake();

      const result = await api("/review-mr", {
        projectId,
        mrIid,
        model,
      });

      if (result.error) throw new Error(result.error);

      setProgress((p) => p.map((s) => ({ ...s, status: "complete" })));

      setSuccess({
        iid: mrIid,
        comments: result.comments,
      });

      return result;
    } catch (err) {
      setError(err.message);
      setProgress([]);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateMRContent = async (mrIid, model) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    setProgress([
      { id: 1, text: "Fetching MR diffs...", status: "active" },
      {
        id: 2,
        text: "Generating improved title & description...",
        status: "pending",
      },
      { id: 3, text: "Updating Merge Request...", status: "pending" },
    ]);

    try {
      await updateProgressFake();

      const result = await api(
        "/update-content",
        {
          projectId,
          mrIid,
          model,
        },
        "POST",
      );

      if (result.error) throw new Error(result.error);
      setSuccess({
        message: "MR Title & Description updated successfully!",
        iid: mrIid,
        url: result.url,
      });
    } catch (err) {
      setError(err.message || "Failed to update MR content");
    } finally {
      setLoading(false);
    }
  };

  // Helper to simulate smooth progress steps (UX)
  const updateProgressFake = async () => {
    await new Promise((r) => setTimeout(r, 800));
    setProgress((p) =>
      p.map((s, i) =>
        i === 0
          ? { ...s, status: "complete" }
          : i === 1
            ? { ...s, status: "active" }
            : s,
      ),
    );
    await new Promise((r) => setTimeout(r, 1500));
    setProgress((p) =>
      p.map((s, i) =>
        i <= 1
          ? { ...s, status: "complete" }
          : i === 2
            ? { ...s, status: "active" }
            : s,
      ),
    );
  };

  return {
    loading,
    error,
    success,
    progress,
    createMR,
    reviewMR,
    updateMRContent,
    resetState: () => {
      setError(null);
      setSuccess(null);
      setProgress([]);
    },
  };
};
