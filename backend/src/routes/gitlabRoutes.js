import express from "express";
import { validateToken } from "../middleware/authMiddleware.js";
import {
  getProjects,
  getBranches,
  getMergeRequests,
} from "../controllers/gitlabController.js";

const router = express.Router();

router.post("/projects", validateToken, getProjects);
router.post("/branches", validateToken, getBranches);
router.post("/mrs", validateToken, getMergeRequests);

export default router;
