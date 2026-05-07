/**
 * @fileoverview Authentication controller — handles signup, login, logout, and profile endpoints.
 */

const authService = require("../services/auth.service");
const logger = require("../utils/logger");

/**
 * POST /api/auth/signup
 * Register a new user account.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function signup(req, res, next) {
  try {
    const result = await authService.signup(req.body);

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/login
 * Authenticate and return a JWT.
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/logout
 * Stateless JWT — nothing to invalidate server-side for MVP.
 * Client should discard the token.
 */
async function logout(req, res, next) {
  try {
    logger.info("User logged out", { userId: req.user?.id });

    res.json({
      success: true,
      data: { message: "Logged out successfully" },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/me
 * Return the current user's profile.
 */
async function getMe(req, res, next) {
  try {
    const profile = await authService.getProfile(req.user.id);

    res.json({
      success: true,
      data: profile,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/auth/me
 * Update the current user's profile.
 */
async function updateMe(req, res, next) {
  try {
    const updated = await authService.updateProfile(req.user.id, req.body);

    res.json({
      success: true,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { signup, login, logout, getMe, updateMe };
