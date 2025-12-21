import express from "express";
import { validateToken } from "../middleware/authMiddleware.js";
import { createMR, reviewMR } from "../controllers/mrController.js";

const router = express.Router();

router.post("/mr", validateToken, createMR);
router.post("/review-mr", validateToken, reviewMR);

export default router;
