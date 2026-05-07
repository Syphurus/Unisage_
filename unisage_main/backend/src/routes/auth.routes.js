/**
 * @fileoverview Authentication routes.
 *
 * POST /api/auth/signup  — Register
 * POST /api/auth/login   — Login
 * POST /api/auth/logout  — Logout (requires auth)
 * GET  /api/auth/me      — Get profile (requires auth)
 * PUT  /api/auth/me      — Update profile (requires auth)
 */

const { Router } = require("express");
const authController = require("../controllers/auth.controller");
const authMiddleware = require("../middleware/auth");
const validate = require("../middleware/validation");
const validators = require("../utils/validators");
const { authRateLimiter } = require("../middleware/rateLimiter");

const router = Router();

// Public routes (with stricter rate limiting)
router.post(
  "/signup",
  authRateLimiter,
  validate(validators.signup),
  authController.signup
);
router.post(
  "/login",
  authRateLimiter,
  validate(validators.login),
  authController.login
);

// Protected routes
router.post("/logout", authMiddleware, authController.logout);
router.get("/me", authMiddleware, authController.getMe);
router.put(
  "/me",
  authMiddleware,
  validate(validators.updateProfile),
  authController.updateMe
);

module.exports = router;
