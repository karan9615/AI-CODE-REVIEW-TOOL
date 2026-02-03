import express from "express";
import { validateToken } from "../middleware/authMiddleware.js";
import {
  getProjects,
  getBranches,
  getMergeRequests,
  getProjectMembers,
} from "../controllers/gitlabController.js";

const router = express.Router();

router.get("/projects", validateToken, getProjects);
router.post("/branches", validateToken, getBranches);
router.get("/projects/:projectId/members", validateToken, getProjectMembers);
router.post("/mrs", validateToken, getMergeRequests);

export default router;
