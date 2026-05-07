/**
 * @fileoverview Custom error classes for consistent API error handling.
 * All custom errors extend AppError which is caught by the global error handler.
 */

/**
 * Base application error. All custom errors should extend this class.
 * @extends Error
 */
class AppError extends Error {
  /**
   * @param {string} message - User-friendly error message
   * @param {number} statusCode - HTTP status code
   * @param {string} [code] - Machine-readable error code
   */
  constructor(message, statusCode, code) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code || "INTERNAL_ERROR";
    this.isOperational = true; // Distinguishes expected errors from programming bugs

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 400 Bad Request — invalid user input.
 */
class ValidationError extends AppError {
  /**
   * @param {string} [message]
   * @param {Object} [details] - Field-level validation errors
   */
  constructor(message = "Validation failed", details = null) {
    super(message, 400, "VALIDATION_ERROR");
    this.details = details;
  }
}

/**
 * 401 Unauthorized — missing or invalid authentication.
 */
class AuthError extends AppError {
  /** @param {string} [message] */
  constructor(message = "Authentication required") {
    super(message, 401, "AUTH_ERROR");
  }
}

/**
 * 403 Forbidden — authenticated but insufficient permissions.
 */
class ForbiddenError extends AppError {
  /** @param {string} [message] */
  constructor(message = "Insufficient permissions") {
    super(message, 403, "FORBIDDEN");
  }
}

/**
 * 404 Not Found — requested resource does not exist.
 */
class NotFoundError extends AppError {
  /** @param {string} [resource] - Name of the missing resource */
  constructor(resource = "Resource") {
    super(`${resource} not found`, 404, "NOT_FOUND");
  }
}

/**
 * 409 Conflict — duplicate entry or conflicting state.
 */
class ConflictError extends AppError {
  /** @param {string} [message] */
  constructor(message = "Resource already exists") {
    super(message, 409, "CONFLICT");
  }
}

/**
 * 429 Too Many Requests — rate limit exceeded.
 */
class RateLimitError extends AppError {
  /** @param {string} [message] */
  constructor(message = "Too many requests. Please try again later.") {
    super(message, 429, "RATE_LIMIT");
  }
}

/**
 * 503 Service Unavailable — backend dependency/configuration issue.
 */
class ServiceUnavailableError extends AppError {
  /** @param {string} [message] */
  constructor(message = "Service temporarily unavailable") {
    super(message, 503, "SERVICE_UNAVAILABLE");
  }
}

module.exports = {
  AppError,
  ValidationError,
  AuthError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ServiceUnavailableError,
};
