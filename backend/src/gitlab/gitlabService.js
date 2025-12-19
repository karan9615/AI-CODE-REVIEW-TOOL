import { client } from "./gitlabClient.js";

/**
 * Validate if a comment position matches a valid diff
 * @param {Array} mrDiffs - Array of MR diff objects
 * @param {object} comment - Comment object with filePath, line, oldLine
 * @returns {boolean}
 */
export function isValidCommentPosition(mrDiffs, comment) {
  const { filePath, line, oldLine, oldPath } = comment;
  // Find the diff for the file
  const diff = mrDiffs.find(
    (d) => d.new_path === filePath || d.old_path === (oldPath || filePath)
  );
  if (!diff) return false;
  // For new files or additions, check new_line
  if (typeof line === "number" && diff.diff) {
    // Check if the line exists in the diff
    const lines = diff.diff.split("\n");
    return line > 0 && line <= lines.length;
  }
  // For deletions, check old_line
  if (typeof oldLine === "number" && diff.diff) {
    const lines = diff.diff.split("\n");
    return oldLine > 0 && oldLine <= lines.length;
  }
  return false;
}

export const getProjects = async (token) =>
  (await client(token).get("/projects?min_access_level=30&per_page=100")).data;

export const getBranches = async (token, projectId) =>
  (
    await client(token).get(
      `/projects/${projectId}/repository/branches?per_page=100`
    )
  ).data;

export const createMR = async (token, pid, payload) =>
  (await client(token).post(`/projects/${pid}/merge_requests`, payload)).data;

export const getDiffs = async (token, projectId, mrIid) =>
  (
    await client(token).get(
      `/projects/${projectId}/merge_requests/${mrIid}/changes`
    )
  ).data.changes;

export const comment = async (token, pid, iid, body) =>
  client(token).post(`/projects/${pid}/merge_requests/${iid}/notes`, { body });

/**
 * Create an inline comment (discussion) on a GitLab Merge Request.
 * Validates position before posting.
 * @param {string} token - GitLab API token
 * @param {string|number} projectId - GitLab project ID
 * @param {string|number} mrIid - Merge Request IID
 * @param {object} comment - Comment object with filePath, line, body, base_sha, start_sha, head_sha
 * @param {Array} mrDiffs - Array of MR diff objects
 * @returns {Promise<object>} - GitLab API response
 */
export const createInlineComment = async (
  token,
  projectId,
  mrIid,
  comment,
  mrDiffs = []
) => {
  const {
    filePath,
    oldPath,
    line,
    oldLine,
    comment: body,
    base_sha,
    start_sha,
    head_sha,
  } = comment;

  // Validate required fields
  if (!filePath || !body || !base_sha || !start_sha || !head_sha) {
    throw new Error(
      "Missing required fields for inline comment: filePath, body, base_sha, start_sha, head_sha"
    );
  }

  // Validate position against MR diffs
  if (mrDiffs.length && !isValidCommentPosition(mrDiffs, comment)) {
    console.warn(
      `Skipped invalid inline comment: filePath=${filePath}, line=${line}, oldLine=${oldLine}`
    );
    throw new Error("Invalid comment position: Not present in MR diff");
  }

  // Build position object
  const position = {
    position_type: "text",
    base_sha,
    start_sha,
    head_sha,
    old_path: oldPath || filePath, // Use oldPath for renamed/deleted files
    new_path: filePath,
  };

  // Support both new_line and old_line (for deletions)
  if (typeof line === "number") {
    position.new_line = line;
  } else if (typeof oldLine === "number") {
    position.old_line = oldLine;
  } else {
    throw new Error(
      "Either 'line' (new_line) or 'oldLine' (old_line) must be provided"
    );
  }

  try {
    const response = await client(token).post(
      `/projects/${projectId}/merge_requests/${mrIid}/discussions`,
      {
        body,
        position,
      }
    );
    return response.data;
  } catch (error) {
    // Log and rethrow for higher-level error handling
    console.error(
      "Failed to create inline comment:",
      error.response?.data || error.message,
      "Position:",
      position
    );
    throw new Error(
      "Failed to create inline comment: " +
        (error.response?.data?.message || error.message)
    );
  }
};

export const updateMR = async (token, projectId, iid, payload) =>
  client(token).put(`/projects/${projectId}/merge_requests/${iid}`, payload);

export const compareBranches = async (token, projectId, from, to) => {
  const data = await client(token).get(
    `/projects/${projectId}/repository/compare`,
    {
      params: { from, to, straight: true },
    }
  );
  return data.data.diffs;
};

export const getMRDetails = async (token, projectId, mrIid) =>
  (await client(token).get(`/projects/${projectId}/merge_requests/${mrIid}`))
    .data;
