import * as gl from "../gitlab/gitlabService.js";

export const getProjects = async (req, res) => {
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
};

export const getBranches = async (req, res) => {
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
};

export const getMergeRequests = async (req, res) => {
  try {
    const { token, projectId } = req.body;

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
