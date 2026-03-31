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
          ", ",
        )}`,
      });
    }

    // Extract custom AI API key from session (Secure Cookie) or headers (optional fallback)
    const customApiKey = req.session?.apiKey || req.headers["x-ai-api-key"];

    // Call service layer for business logic
    const result = await mrService.createAndReviewMR(
      token,
      projectId,
      model,
      mr,
      customApiKey,
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
          ", ",
        )}`,
      });
    }

    // Extract custom AI API key from session (Secure Cookie) or headers (optional fallback)
    const customApiKey = req.session?.apiKey || req.headers["x-ai-api-key"];

    // Call service layer
    const result = await mrService.reviewExistingMR(
      token,
      projectId,
      mrIid,
      model,
      customApiKey,
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

export const updateMRContent = async (req, res) => {
  try {
    const { projectId, mrIid, model } = req.body;
    const token = req.token;

    if (!projectId || !mrIid || !model) {
      return res.status(400).json({
        error: "projectId, mrIid, and model are required",
      });
    }

    const customApiKey = req.session?.apiKey || req.headers["x-ai-api-key"];

    const result = await mrService.updateMRContent(
      token,
      projectId,
      mrIid,
      model,
      customApiKey,
    );

    res.json({
      success: true,
      iid: result?.iid || mrIid,
      url: result?.web_url || null,
      title: result?.title || null,
    });
  } catch (e) {
    console.error("MR update failed:", e.message);
    res.status(500).json({
      error: e.message,
      details: e.response?.data,
    });
  }
};
