import { body, validationResult } from "express-validator";

// Validation Rules
export const validateMRCreation = [
  body("projectId").notEmpty().withMessage("Project ID is required"),
  body("model").notEmpty().withMessage("Model is required").isString(),
  body("mr").isObject().withMessage("MR object is required"),
  body("mr.source_branch").notEmpty().withMessage("Source branch is required"),
  body("mr.target_branch").notEmpty().withMessage("Target branch is required"),
];

export const validateReview = [
  body("projectId").notEmpty().withMessage("Project ID is required"),
  body("mrIid").notEmpty().withMessage("MR IID is required"),
  body("model").notEmpty().withMessage("Model is required"),
];

// Reusable middleware to handle validation errors
export const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: "Validation failed",
      details: errors.array().map((err) => `${err.path}: ${err.msg}`),
    });
  }
  next();
};
