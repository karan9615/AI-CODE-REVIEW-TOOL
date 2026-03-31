import { client } from "./gitlabClient.js";
import { parseDiffLines } from "../utils/diffUtils.js";

export const getProjects = async (token, options = {}) => {
  const { page = 1, perPage = 20, search = "" } = options;
  const api = client(token);

  const response = await api.get("/projects", {
    params: {
      membership: true,
      archived: false,
      order_by: "updated_at",
      sort: "desc",
      per_page: perPage,
      page,
      search,
    },
  });

  return {
    data: response.data,
    pagination: {
      nextPage: response.headers["x-next-page"],
      total: response.headers["x-total"],
      totalPages: response.headers["x-total-pages"],
    },
  };
};

export const getBranches = async (token, projectId, options = {}) => {
  const { page = 1, search = "" } = options;
  const params = {
    per_page: 20,
    page,
    sort: "updated_desc",
  };

  if (search) {
    params.search = search;
  }

  const response = await client(token).get(
    `/projects/${projectId}/repository/branches`,
    { params },
  );

  return {
    data: response.data,
    pagination: {
      nextPage: response.headers["x-next-page"],
      total: response.headers["x-total"],
      totalPages: response.headers["x-total-pages"],
    },
  };
};

export const getProjectMembers = async (token, projectId, search = "") => {
  const params = {
    per_page: 20, // Limit to 20 for dropdowns
  };
  if (search) params.search = search;

  const response = await client(token).get(`/projects/${projectId}/users`, {
    params,
  });
  return response.data;
};

export const createMR = async (token, pid, payload) =>
  (await client(token).post(`/projects/${pid}/merge_requests`, payload)).data;

export const getDiffs = async (token, projectId, mrIid) =>
  (
    await client(token).get(
      `/projects/${projectId}/merge_requests/${mrIid}/changes`,
    )
  ).data.changes;

export const comment = async (token, pid, iid, body) =>
  client(token).post(`/projects/${pid}/merge_requests/${iid}/notes`, { body });

/**
 * Get merge requests for a project
 * @param {string} token - GitLab API token
 * @param {string|number} projectId - Project ID
 * @param {object} options - Query options
 * @returns {Promise<Array>} - Array of MR objects
 */
export const getMergeRequests = async (token, projectId, options = {}) => {
  const {
    state = "opened", // opened, closed, merged, all
    scope = "all", // created_by_me, assigned_to_me, all
    perPage = 50,
    orderBy = "updated_at",
    sort = "desc",
  } = options;

  try {
    const response = await client(token).get(
      `/projects/${projectId}/merge_requests`,
      {
        params: {
          state,
          scope,
          per_page: perPage,
          order_by: orderBy,
          sort,
        },
      },
    );

    return response.data;
  } catch (error) {
    console.error("Failed to fetch merge requests:", error.message);
    throw error;
  }
};

/**
 * Get MRs assigned to the authenticated user across all projects
 * @param {string} token - GitLab API token
 * @returns {Promise<Array>} - Array of MR objects
 */
export const getMyAssignedMRs = async (token) => {
  try {
    const response = await client(token).get("/merge_requests", {
      params: {
        scope: "assigned_to_me",
        state: "opened",
        per_page: 100,
        order_by: "updated_at",
        sort: "desc",
      },
    });

    return response.data;
  } catch (error) {
    console.error("Failed to fetch assigned MRs:", error.message);
    throw error;
  }
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
  mrDiffs = [],
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
      "Missing required fields: filePath, body, base_sha, head_sha",
    );
  }

  // Find the diff for this file
  const targetDiff = mrDiffs.find(
    (d) => d.new_path === filePath || d.old_path === (oldPath || filePath),
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
    // Check if this line was added or is context
    if (diffData.addedLines.has(line) || diffData.contextLines.has(line)) {
      finalLine = line;
    } else if (diffData.deletedLines.has(line)) {
      // Line was actually deleted, use old_line
      finalOldLine = line;
      useOldLine = true;
      console.log(
        `Auto-corrected: ${filePath} line ${line} is a deletion, using old_line`,
      );
    } else {
      throw new Error(
        `Line ${line} in ${filePath} is not a valid line (not added, deleted, or context)`,
      );
    }
  } else if (oldLine && !line) {
    // Deleted line or context old line
    if (diffData.deletedLines.has(oldLine) || diffData.contextLines.has(oldLine)) {
      finalOldLine = oldLine;
      useOldLine = true;
    } else {
      throw new Error(
        `Old line ${oldLine} in ${filePath} is not a deleted or context line`,
      );
    }
  } else if (line && oldLine) {
    // Both provided - prefer the one that matches diff
    if (diffData.addedLines.has(line) || diffData.contextLines.has(line)) {
      finalLine = line;
    } else if (diffData.deletedLines.has(oldLine)) {
      finalOldLine = oldLine;
      useOldLine = true;
    } else {
      throw new Error(
        `Neither line ${line} nor oldLine ${oldLine} found in ${filePath} changes`,
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
      { body, position },
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
      position,
    );

    throw new Error(
      `Failed to create inline comment: ${
        error.response?.data?.message || error.message
      }`,
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
    },
  );
  return data.data.diffs;
};

export const getMRDetails = async (token, projectId, mrIid) =>
  (await client(token).get(`/projects/${projectId}/merge_requests/${mrIid}`))
    .data;

export const getMRDiscussions = async (token, projectId, mrIid) =>
  (
    await client(token).get(
      `/projects/${projectId}/merge_requests/${mrIid}/discussions`,
    )
  ).data;

export const getDiffRefsWithRetry = async (
  token,
  projectId,
  iid,
  retries = 5,
  delayMs = 1000,
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
        `Retry ${i + 1}/${retries}: diff_refs not ready for MR #${iid}`,
      );
    } catch (error) {
      console.error(
        `Error fetching MR details on retry ${i + 1}:`,
        error.message,
      );
    }

    await new Promise((r) => setTimeout(r, delayMs * Math.pow(2, i)));
  }

  return null;
};
