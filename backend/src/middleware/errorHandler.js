import logger from "../utils/logger.js";

/**
 * Simple Error Handler for Local Development
 */
export const errorHandler = (err, req, res, next) => {
  // Log error
  logger.error("Request Error:", {
    message: err.message,
    path: req.path,
    method: req.method,
    stack: err.stack,
  });

  // Send error response
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: err.message || "Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

/**
 * Async Handler Wrapper
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
