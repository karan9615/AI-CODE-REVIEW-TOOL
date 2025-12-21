import { client } from "./gitlabClient.js";

export const getProjects = async (token) =>
  (await client(token).get("/projects?min_access_level=30&per_page=100")).data;

export const getBranches = async (token, projectId) =>
  (
    await client(token).get(
      `/projects/${projectId}/repository/branches?per_page=100&sort=updated_desc`
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
 * Parse a diff to build a complete line mapping
 * @param {object} diff - GitLab diff object
 * @returns {object} - Line mappings and metadata
 */
const parseDiffLines = (diff) => {
  const result = {
    addedLines: new Map(), // new_line -> { content, old_line_equivalent }
    deletedLines: new Map(), // old_line -> { content }
    canComment: new Set(), // All line numbers that can receive comments
  };

  if (!diff || !diff.diff) return result;

  const lines = diff.diff.split("\n");
  let oldLine = 0;
  let newLine = 0;

  for (const line of lines) {
    // Parse hunk header: @@ -oldStart,oldCount +newStart,newCount @@
    const hunkMatch = line.match(/^@@ -(\d+),?\d* \+(\d+),?\d* @@/);
    if (hunkMatch) {
      oldLine = parseInt(hunkMatch[1]);
      newLine = parseInt(hunkMatch[2]);
      continue;
    }

    const content = line.substring(1); // Remove prefix (+, -, or space)

    if (line.startsWith("-")) {
      // Deleted line
      result.deletedLines.set(oldLine, { content });
      result.canComment.add(`old-${oldLine}`);
      oldLine++;
    } else if (line.startsWith("+")) {
      // Added line
      result.addedLines.set(newLine, { content, oldLine });
      result.canComment.add(`new-${newLine}`);
      newLine++;
    } else if (line.startsWith(" ")) {
      // Context line (unchanged) - cannot comment
      oldLine++;
      newLine++;
    }
  }

  return result;
};

/**
 * Create an inline comment (discussion) on a GitLab Merge Request
 * @param {string} token - GitLab API token
 * @param {string|number} projectId - GitLab project ID
 * @param {string|number} mrIid - Merge Request IID
 * @param {object} comment - Comment object
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
  if (!filePath || !body || !base_sha || !head_sha) {
    throw new Error(
      "Missing required fields: filePath, body, base_sha, head_sha"
    );
  }

  // Find the diff for this file
  const targetDiff = mrDiffs.find(
    (d) => d.new_path === filePath || d.old_path === (oldPath || filePath)
  );

  if (!targetDiff) {
    throw new Error(`File ${filePath} not found in MR diffs`);
  }

  if (targetDiff.binary) {
    throw new Error(`Cannot comment on binary file: ${filePath}`);
  }

  // Parse the diff to understand line mappings
  const diffData = parseDiffLines(targetDiff);

  // Determine the correct line number and type
  let finalLine = null;
  let finalOldLine = null;
  let useOldLine = false;

  if (line && !oldLine) {
    // Check if this line was added
    if (diffData.addedLines.has(line)) {
      finalLine = line;
    } else if (diffData.deletedLines.has(line)) {
      // Line was actually deleted, use old_line
      finalOldLine = line;
      useOldLine = true;
      console.log(
        `Auto-corrected: ${filePath} line ${line} is a deletion, using old_line`
      );
    } else {
      throw new Error(
        `Line ${line} in ${filePath} is not a changed line (not added or deleted)`
      );
    }
  } else if (oldLine && !line) {
    // Deleted line
    if (diffData.deletedLines.has(oldLine)) {
      finalOldLine = oldLine;
      useOldLine = true;
    } else {
      throw new Error(
        `Old line ${oldLine} in ${filePath} is not a deleted line`
      );
    }
  } else if (line && oldLine) {
    // Both provided - prefer the one that matches diff
    if (diffData.addedLines.has(line)) {
      finalLine = line;
    } else if (diffData.deletedLines.has(oldLine)) {
      finalOldLine = oldLine;
      useOldLine = true;
    } else {
      throw new Error(
        `Neither line ${line} nor oldLine ${oldLine} found in ${filePath} changes`
      );
    }
  } else {
    throw new Error("Either 'line' or 'oldLine' must be provided");
  }

  // Build position object for GitLab API
  const position = {
    position_type: "text",
    base_sha,
    head_sha,
    old_path: oldPath || filePath,
    new_path: filePath,
  };

  if (start_sha) {
    position.start_sha = start_sha;
  }

  if (useOldLine) {
    position.old_line = finalOldLine;
  } else {
    position.new_line = finalLine;
  }

  try {
    const response = await client(token).post(
      `/projects/${projectId}/merge_requests/${mrIid}/discussions`,
      { body, position }
    );
    return response.data;
  } catch (error) {
    const errorDetails = error.response?.data || error.message;
    console.error(
      `Failed to create inline comment on ${filePath}:${
        finalLine || finalOldLine
      }`,
      errorDetails,
      "Position:",
      position
    );

    throw new Error(
      `Failed to create inline comment: ${
        error.response?.data?.message || error.message
      }`
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

export const getDiffRefsWithRetry = async (
  token,
  projectId,
  iid,
  retries = 5,
  delayMs = 1000
) => {
  for (let i = 0; i < retries; i++) {
    try {
      const mr = await getMRDetails(token, projectId, iid);

      if (mr.diff_refs?.base_sha && mr.diff_refs?.head_sha) {
        return {
          base_sha: mr.diff_refs.base_sha,
          head_sha: mr.diff_refs.head_sha,
          start_sha: mr.diff_refs.start_sha || mr.diff_refs.base_sha,
        };
      }

      console.log(
        `Retry ${i + 1}/${retries}: diff_refs not ready for MR #${iid}`
      );
    } catch (error) {
      console.error(
        `Error fetching MR details on retry ${i + 1}:`,
        error.message
      );
    }

    await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
  }

  return null;
};
