import * as gl from "../gitlab/gitlabService.js";

export const getProjects = async (req, res) => {
  try {
    const { page, per_page, search } = req.query;
    const result = await gl.getProjects(req.token, {
      page,
      perPage: per_page,
      search,
    });
    res.json(result);
  } catch (error) {
    console.error("Failed to fetch projects:", error.message);
    if (error.response?.status === 401) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "GitLab token expired or invalid",
      });
    }
    res.status(500).json({
      error: "Failed to fetch projects",
      message: error.message,
    });
  }
};

export const getBranches = async (req, res) => {
  try {
    const { projectId } = req.body;
    const { page, search } = req.query;
    const token = req.token;

    if (!projectId) {
      return res.status(400).json({ error: "projectId is required" });
    }

    const result = await gl.getBranches(token, projectId, { page, search });
    res.json(result);
  } catch (error) {
    console.error("Failed to fetch branches:", error.message);
    res.status(500).json({
      error: "Failed to fetch branches",
      message: error.message,
    });
  }
};

export const getProjectMembers = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { search } = req.query;
    const token = req.token;

    if (!projectId) {
      return res.status(400).json({ error: "projectId is required" });
    }

    const members = await gl.getProjectMembers(token, projectId, search);
    res.json(members);
  } catch (error) {
    console.error("Failed to fetch project members:", error.message);
    res.status(500).json({
      error: "Failed to fetch project members",
      message: error.message,
    });
  }
};

export const getMergeRequests = async (req, res) => {
  try {
    const { projectId } = req.body;
    const token = req.token;

    if (!projectId) {
      return res.status(400).json({ error: "projectId is required" });
    }

    const mrs = await gl.getMergeRequests(token, projectId);
    res.json(mrs);
  } catch (error) {
    console.error("Failed to fetch merge requests:", error.message);
    res.status(500).json({
      error: "Failed to fetch merge requests",
      message: error.message,
    });
  }
};
