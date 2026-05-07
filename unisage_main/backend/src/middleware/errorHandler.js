/**
 * @fileoverview Global error handling middleware.
 * Catches all errors thrown or passed via `next(err)` and returns
 * a consistent JSON error response.
 */

const logger = require("../utils/logger");
const env = require("../config/env");

/**
 * Global Express error handler.
 * Must be registered LAST with `app.use(errorHandler)`.
 *
 * @param {Error} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} _next
 */
function errorHandler(err, req, res, _next) {
  // Default to 500 for unexpected errors
  const statusCode = err.statusCode || 500;
  const isOperational = err.isOperational || false;

  // Log the error — full stack for 500s, brief message for operational errors
  if (statusCode >= 500) {
    logger.error("Unhandled error", {
      message: err.message,
      stack: err.stack,
      path: req.originalUrl,
      method: req.method,
      ip: req.ip,
    });
  } else {
    logger.warn("Operational error", {
      code: err.code,
      message: err.message,
      path: req.originalUrl,
      method: req.method,
    });
  }

  // Build error response
  const response = {
    success: false,
    error: {
      code: err.code || "INTERNAL_ERROR",
      message: isOperational ? err.message : "An unexpected error occurred",
    },
  };

  // Include details only in development
  if (env.isDevelopment) {
    response.error.details = {
      stack: err.stack,
      ...(err.details ? { validation: err.details } : {}),
    };
  }

  res.status(statusCode).json(response);
}

module.exports = errorHandler;
