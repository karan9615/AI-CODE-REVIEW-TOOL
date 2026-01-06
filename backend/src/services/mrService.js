import * as gl from "../gitlab/gitlabService.js";
import {
  generateMRContent,
  generateInlineReviews,
} from "../review/reviewService.js";
import logger from "../utils/logger.js";

/**
 * MR Service - Business Logic Layer
 *
 * This service handles the complex orchestration of creating merge requests
 * and performing AI-powered code reviews. It separates business logic from
 * HTTP request handling (controllers).
 *
 * Key Responsibilities:
 * - Orchestrate multi-step MR creation workflow
 * - Handle AI review generation and posting
 * - Manage error recovery (fallbacks for inline comments)
 * - Return structured results for controllers
 */
export const mrService = {
  /**
   * Create a new Merge Request with AI-generated content and review
   *
   * Workflow:
   * 1. Compare source and target branches to get diffs
   * 2. Use AI to generate MR title and description
   * 3. Create the MR on GitLab
   * 4. Wait for diff_refs (commit SHAs) to be ready
   * 5. Generate AI review comments for changed code
   * 6. Post inline comments (with fallback to general comments)
   *
   * @param {string} token - GitLab API token
   * @param {string|number} projectId - GitLab project ID
   * @param {string} model - AI model name (e.g., 'chatgpt', 'gemini')
   * @param {Object} branches - Branch configuration
   * @param {string} branches.source_branch - Source branch name
   * @param {string} branches.target_branch - Target branch name (usually 'main')
   * @returns {Promise<Object>} Result object with MR details and comment statistics
   */
  async createAndReviewMR(
    token,
    projectId,
    model,
    { source_branch, target_branch }
  ) {
    logger.info(`Creating MR: ${source_branch} -> ${target_branch}`);

    // Step 1: Compare branches to get code changes
    const diffs = await gl.compareBranches(
      token,
      projectId,
      target_branch, // Base branch
      source_branch // Branch with changes
    );

    if (!diffs || diffs.length === 0) {
      throw new Error("No differences found between branches");
    }

    logger.info(`Found ${diffs.length} file changes`);

    // Step 2: Generate MR title and description using AI
    const { title, description } = await generateMRContent(model, diffs);
    logger.info(`Generated MR title: ${title}`);

    // Step 3: Create the Merge Request
    const created = await gl.createMR(token, projectId, {
      source_branch,
      target_branch,
      title,
      description,
    });

    logger.info(`Created MR #${created.iid}`);

    // Step 4: Get diff_refs (commit SHAs needed for inline comments)
    // GitLab needs time to process the MR, so we retry if not ready
    const mrDetails = await gl.getMRDetails(token, projectId, created.iid);
    let diffRefs = mrDetails.diff_refs || null;

    if (!diffRefs?.base_sha || !diffRefs?.head_sha) {
      diffRefs = await gl.getDiffRefsWithRetry(token, projectId, created.iid);
    }

    // If still not ready, skip inline comments (MR is still created)
    if (!diffRefs?.base_sha || !diffRefs?.head_sha) {
      logger.warn(
        `diff_refs not available for MR #${created.iid}. Skipping inline comments.`
      );
      return {
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
      };
    }

    const { base_sha, start_sha, head_sha } = diffRefs;

    // Step 5: Fetch detailed diffs for the MR
    // Retry fetching diffs until they actually contain diff content (GitLab async calculation)
    let mrDiffs = [];
    let diffRetries = 5;

    while (diffRetries > 0) {
      mrDiffs = await gl.getDiffs(token, projectId, created.iid);

      // Check if we have valid diff strings (at least one file has a diff)
      const hasContent = mrDiffs.some((d) => d.diff && d.diff.length > 0);

      if (hasContent || mrDiffs.length === 0) {
        break;
      }

      logger.warn(
        `Diff content empty for MR #${created.iid}, retrying... (${diffRetries})`
      );
      await new Promise((r) => setTimeout(r, 1000));
      diffRetries--;
    }

    logger.info(`Fetched ${mrDiffs.length} diffs for inline review`);

    // Step 6: Generate AI review comments
    const comments = await generateInlineReviews(model, mrDiffs);
    logger.info(`Generated ${comments.length} inline comments`);

    // Step 7: Post inline comments (with error handling per comment)
    const result = await this._postComments(
      token,
      projectId,
      created.iid,
      comments,
      mrDiffs,
      { base_sha, start_sha, head_sha }
    );

    return {
      success: true,
      iid: created.iid,
      web_url: created.web_url,
      comments: result,
    };
  },

  /**
   * Review an existing Merge Request with AI
   *
   * @param {string} token - GitLab API token
   * @param {string|number} projectId - GitLab project ID
   * @param {string|number} mrIid - Merge Request IID (internal ID)
   * @param {string} model - AI model name
   * @returns {Promise<Object>} Result object with comment statistics
   */
  async reviewExistingMR(token, projectId, mrIid, model) {
    logger.info(`Starting AI review for MR #${mrIid}`);

    // Step 1: Get MR details and validate state
    const mrDetails = await gl.getMRDetails(token, projectId, mrIid);

    if (mrDetails.state === "merged" || mrDetails.state === "closed") {
      throw new Error(`Cannot review ${mrDetails.state} merge request`);
    }

    // Step 2: Get diff_refs (may need retry)
    let diffRefs = mrDetails.diff_refs || null;

    if (!diffRefs?.base_sha || !diffRefs?.head_sha) {
      diffRefs = await gl.getDiffRefsWithRetry(token, projectId, mrIid);
    }

    if (!diffRefs?.base_sha || !diffRefs?.head_sha) {
      throw new Error(
        "MR diff_refs not ready yet. Please try again in a few seconds."
      );
    }

    const { base_sha, start_sha, head_sha } = diffRefs;

    // Step 3: Fetch MR diffs
    const mrDiffs = await gl.getDiffs(token, projectId, mrIid);
    logger.info(`Fetched ${mrDiffs.length} diffs for MR #${mrIid}`);

    if (!mrDiffs || mrDiffs.length === 0) {
      throw new Error("No diffs found for this merge request");
    }

    // Step 4: Fetch existing comments to prevent duplicates (Context for AI)
    let existingCommentsForAI = [];
    try {
      const existingDiscussions = await gl.getMRDiscussions(
        token,
        projectId,
        mrIid
      );

      existingDiscussions.forEach((discussion) => {
        discussion.notes.forEach((note) => {
          if (note.position && note.position.new_path && note.body) {
            const line = note.position.new_line || note.position.old_line;
            // Only include relevant fields to save token context
            existingCommentsForAI.push({
              filePath: note.position.new_path,
              line: line,
              preview: note.body.substring(0, 100).replace(/\n/g, " "), // Condensed preview
            });
          }
        });
      });
    } catch (err) {
      logger.warn(
        `Failed to fetch existing comments for context: ${err.message}`
      );
    }

    // Step 5: Generate AI reviews
    let comments = await generateInlineReviews(
      model,
      mrDiffs,
      existingCommentsForAI
    );
    logger.info(
      `Generated ${comments.length} inline comments (AI aware of ${existingCommentsForAI.length} existing)`
    );

    // If no issues found (after filtering), post a success message
    if (comments.length === 0) {
      await gl.comment(
        token,
        projectId,
        mrIid,
        "✅ **AI Review Complete**: No major issues found. The code looks good!"
      );

      return {
        success: true,
        iid: mrIid,
        comments: {
          total: 0,
          posted: 1,
          failed: 0,
          message: "No issues found",
        },
      };
    }

    // Step 5: Post comments
    const result = await this._postComments(
      token,
      projectId,
      mrIid,
      comments,
      mrDiffs,
      { base_sha, start_sha, head_sha }
    );

    return {
      success: true,
      iid: mrIid,
      comments: result,
    };
  },

  /**
   * Post inline comments to GitLab MR (private helper method)
   *
   * Attempts to post each comment as an inline comment.
   * If inline comment fails (e.g., line number mismatch), falls back to general comment.
   *
   * @private
   * @param {string} token - GitLab API token
   * @param {string|number} projectId - Project ID
   * @param {string|number} mrIid - MR IID
   * @param {Array} comments - Array of comment objects from AI
   * @param {Array} mrDiffs - MR diff objects
   * @param {Object} shas - Commit SHAs (base_sha, start_sha, head_sha)
   * @returns {Promise<Object>} Statistics: {total, posted, failed}
   */
  async _postComments(token, projectId, mrIid, comments, mrDiffs, shas) {
    let successCount = 0;
    let failCount = 0;

    // Post each comment individually (allows partial success)
    // Post comments in parallel to speed up the process
    const postPromises = comments.map(async (comment) => {
      try {
        // Try posting as inline comment (attached to specific line)
        await gl.createInlineComment(
          token,
          projectId,
          mrIid,
          { ...comment, ...shas },
          mrDiffs
        );
        return true; // Success
      } catch (commentError) {
        logger.warn(
          `Failed to post inline comment on ${comment.filePath}: ${commentError.message}`
        );

        try {
          // Fallback: Post as general MR comment
          await gl.comment(
            token,
            projectId,
            mrIid,
            `**Review (${comment.filePath}):** ${comment.comment}`
          );
          return true; // Success (fallback)
        } catch (fallbackError) {
          logger.error(
            `Failed to post fallback comment: ${fallbackError.message}`
          );
          return false; // Failure
        }
      }
    });

    const results = await Promise.all(postPromises);
    successCount = results.filter((r) => r === true).length;
    failCount = results.filter((r) => r === false).length;

    logger.info(
      `Posted ${successCount}/${comments.length} comments successfully`
    );

    return {
      total: comments.length,
      posted: successCount,
      failed: failCount,
    };
  },
};
