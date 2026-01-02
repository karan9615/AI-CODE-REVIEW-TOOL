import express from "express";
import { validateToken } from "../middleware/authMiddleware.js";
import {
  validateMRCreation,
  validateReview,
  handleValidation,
} from "../middleware/validator.js";
import { createMR, reviewMR } from "../controllers/mrController.js";

const router = express.Router();

router.post(
  "/mr",
  validateToken,
  validateMRCreation,
  handleValidation,
  createMR
);
router.post(
  "/review-mr",
  validateToken,
  validateReview,
  handleValidation,
  reviewMR
);

export default router;
