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
    const mrDiffs = await gl.getDiffs(token, projectId, created.iid);
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

    // Step 4: Generate AI reviews
    const comments = await generateInlineReviews(model, mrDiffs);
    logger.info(`Generated ${comments.length} inline comments`);

    // If no issues found, post a success message
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
    for (const comment of comments) {
      try {
        // Try posting as inline comment (attached to specific line)
        await gl.createInlineComment(
          token,
          projectId,
          mrIid,
          { ...comment, ...shas },
          mrDiffs
        );
        successCount++;
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
          successCount++; // Count fallback as success
        } catch (fallbackError) {
          logger.error(
            `Failed to post fallback comment: ${fallbackError.message}`
          );
          failCount++;
        }
      }
    }

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
