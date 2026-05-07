/**
 * @fileoverview Rate limiting middleware.
 * Uses express-rate-limit to throttle requests per IP.
 * Configurable via environment variables.
 */

const rateLimit = require("express-rate-limit");
const env = require("../config/env");

/**
 * Global rate limiter: 100 requests per 15-minute window per IP.
 * Returns 429 with a consistent error response when exceeded.
 */
const rateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS, // 15 minutes default
  max: env.RATE_LIMIT_MAX, // 100 requests default
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT",
      message: "Too many requests. Please try again later.",
    },
  },
  // Skip rate limiting for health checks
  skip: (req) => req.path === "/health",
});

/**
 * Stricter limiter for auth endpoints to prevent brute-force attacks.
 * 20 requests per 15 minutes per IP.
 */
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT",
      message: "Too many authentication attempts. Please try again later.",
    },
  },
});

module.exports = { rateLimiter, authRateLimiter };
