import express from "express";
import configRoutes from "./configRoutes.js";
import gitlabRoutes from "./gitlabRoutes.js";
import mrRoutes from "./mrRoutes.js";

const router = express.Router();

// Config routes (public)
router.use("/config", configRoutes);

// GitLab routes (authenticated)
router.use("/", gitlabRoutes);

// MR routes (authenticated)
router.use("/", mrRoutes);

export default router;
