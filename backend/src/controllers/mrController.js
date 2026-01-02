import { mrService } from "../services/mrService.js";
import { isValidModel, getValidModelKeys } from "../config/aiConfig.js";

/**
 * MR Controller - HTTP Request Handler Layer
 *
 * Controllers are thin wrappers that:
 * 1. Extract data from HTTP requests
 * 2. Validate request data
 * 3. Call service layer for business logic
 * 4. Format and send HTTP responses
 *
 * This keeps HTTP concerns separate from business logic,
 * making code more testable and maintainable.
 */

/**
 * Create a new Merge Request with AI review
 *
 * POST /api/mr
 *
 * Request Body:
 * {
 *   projectId: string|number,
 *   model: string (e.g., 'chatgpt', 'gemini'),
 *   mr: {
 *     source_branch: string,
 *     target_branch: string
 *   }
 * }
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
export const createMR = async (req, res) => {
  try {
    const { projectId, model, mr } = req.body;
    const token = req.token; // Set by authMiddleware

    // Validate AI model
    if (!model || !isValidModel(model)) {
      return res.status(400).json({
        error: `Valid model is required. Available: ${getValidModelKeys().join(
          ", "
        )}`,
      });
    }

    // Call service layer for business logic
    const result = await mrService.createAndReviewMR(
      token,
      projectId,
      model,
      mr
    );

    // Send success response
    res.json(result);
  } catch (e) {
    console.error("MR creation failed:", e.response?.data || e.message);
    res.status(500).json({
      error: e.message,
      details: e.response?.data,
    });
  }
};

/**
 * Review an existing Merge Request with AI
 *
 * POST /api/review-mr
 *
 * Request Body:
 * {
 *   projectId: string|number,
 *   mrIid: string|number,
 *   model: string (e.g., 'chatgpt', 'gemini')
 * }
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
export const reviewMR = async (req, res) => {
  try {
    const { projectId, mrIid, model } = req.body;
    const token = req.token; // Set by authMiddleware

    // Validate AI model
    if (!model || !isValidModel(model)) {
      return res.status(400).json({
        error: `Valid model is required. Available: ${getValidModelKeys().join(
          ", "
        )}`,
      });
    }

    // Call service layer
    const result = await mrService.reviewExistingMR(
      token,
      projectId,
      mrIid,
      model
    );

    // Send success response
    res.json(result);
  } catch (e) {
    console.error("MR review failed:", e.response?.data || e.message);
    res.status(500).json({
      error: e.message,
      details: e.response?.data,
    });
  }
};
