import express from "express";
import * as gl from "./gitlab/gitlabService.js";
import {
  generateMRContent,
  generateInlineReviews,
} from "./review/reviewService.js";

const r = express.Router();

// Validation middleware
const validateToken = (req, res, next) => {
  if (!req.body.token || typeof req.body.token !== "string") {
    return res.status(400).json({ error: "Valid token is required" });
  }
  next();
};

r.post("/projects", validateToken, async (req, res) => {
  try {
    const projects = await gl.getProjects(req.body.token);
    res.json(projects);
  } catch (error) {
    console.error("Failed to fetch projects:", error.message);
    res.status(500).json({
      error: "Failed to fetch projects",
      message: error.message,
    });
  }
});

r.post("/branches", validateToken, async (req, res) => {
  try {
    const { token, projectId } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: "projectId is required" });
    }

    const branches = await gl.getBranches(token, projectId);
    res.json(branches);
  } catch (error) {
    console.error("Failed to fetch branches:", error.message);
    res.status(500).json({
      error: "Failed to fetch branches",
      message: error.message,
    });
  }
});

r.post("/mr", validateToken, async (req, res) => {
  try {
    const { token, projectId, model, mr } = req.body;

    // Validate required fields
    if (!projectId) {
      return res.status(400).json({ error: "projectId is required" });
    }
    if (!model || !["chatgpt", "gemini"].includes(model)) {
      return res
        .status(400)
        .json({ error: "Valid model (chatgpt/gemini) is required" });
    }
    if (!mr || !mr.source_branch || !mr.target_branch) {
      return res
        .status(400)
        .json({ error: "source_branch and target_branch are required" });
    }
    if (mr.source_branch === mr.target_branch) {
      return res
        .status(400)
        .json({ error: "Source and target branches cannot be the same" });
    }

    const { source_branch, target_branch } = mr;

    console.log(`Creating MR: ${source_branch} -> ${target_branch}`);

    // 1️⃣ Compare branches (NO MR yet)
    const diffs = await gl.compareBranches(
      token,
      projectId,
      source_branch,
      target_branch
    );

    if (!diffs || diffs.length === 0) {
      return res.status(400).json({
        error: "No differences found between branches",
      });
    }

    console.log(`Found ${diffs.length} file changes`);

    // 2️⃣ Generate title + description
    const { title, description } = await generateMRContent(model, diffs);
    console.log(`Generated MR title: ${title}`);

    // 3️⃣ Create MR with VALID payload
    const created = await gl.createMR(token, projectId, {
      source_branch,
      target_branch,
      title,
      description,
    });

    console.log(`Created MR #${created.iid}`);

    // 4️⃣ Fetch MR details to get diff_refs (SHAs)
    const mrDetails = await gl.getMRDetails(token, projectId, created.iid);
    let diffRefs = mrDetails.diff_refs || null;

    if (!diffRefs?.base_sha || !diffRefs?.head_sha) {
      diffRefs = await gl.getDiffRefsWithRetry(token, projectId, created.iid);
    }

    if (!diffRefs?.base_sha || !diffRefs?.head_sha) {
      console.warn(
        `diff_refs not available for MR #${created.iid}. Skipping inline comments.`
      );

      return res.json({
        success: true,
        iid: created.iid,
        web_url: created.web_url,
        comments: {
          total: 0,
          posted: 0,
          failed: 0,
          skipped: true,
          reason: "diff_refs not ready yet",
        },
      });
    }

    const { base_sha, start_sha, head_sha } = diffRefs;

    if (!base_sha || !start_sha || !head_sha) {
      throw new Error("Missing diff_refs SHAs from MR details");
    }

    // 5️⃣ Fetch MR diffs using IID
    const mrDiffs = await gl.getDiffs(token, projectId, created.iid);
    console.log(`Fetched ${mrDiffs.length} diffs for inline review`);

    // 6️⃣ Inline reviews
    const comments = await generateInlineReviews(model, mrDiffs);
    console.log(`Generated ${comments.length} inline comments`);

    // Post comments with error handling for each
    let successCount = 0;
    let failCount = 0;

    for (const c of comments) {
      try {
        await gl.createInlineComment(
          token,
          projectId,
          created.iid,
          {
            ...c,
            base_sha,
            start_sha,
            head_sha,
          },
          mrDiffs
        );
        successCount++;
      } catch (commentError) {
        console.error(
          `Failed to post comment on ${c.filePath}:`,
          commentError.message
        );
        try {
          await gl.comment(
            token,
            projectId,
            created.iid,
            `**Review (${c.filePath}):** ${c.comment}`
          );
        } catch (error) {
          failCount++;
        }
      }
    }

    console.log(
      `Posted ${successCount}/${comments.length} comments successfully`
    );

    res.json({
      success: true,
      iid: created.iid,
      web_url: created.web_url,
      comments: {
        total: comments.length,
        posted: successCount,
        failed: failCount,
      },
    });
  } catch (e) {
    console.error("MR creation failed:", e.response?.data || e.message);
    res.status(500).json({
      error: e.message,
      details: e.response?.data,
    });
  }
});

export default r;
