/**
 * @fileoverview JWT helper functions for token generation and verification.
 */

const jwt = require("jsonwebtoken");
const env = require("../config/env");
const { AuthError } = require("./errors");

/**
 * Generate a signed JWT for the given user payload.
 *
 * @param {Object} payload
 * @param {string} payload.userId - UUID of the user
 * @param {string} payload.email - User's email
 * @param {string} payload.role - User role ('student' | 'admin')
 * @returns {string} Signed JWT token
 */
function generateToken(payload) {
  return jwt.sign(
    {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
}

/**
 * Generate a short-lived token for password reset.
 *
 * @param {Object} payload
 * @param {string} payload.userId
 * @param {string} payload.email
 * @returns {string}
 */
function generatePasswordResetToken(payload) {
  return jwt.sign(
    {
      userId: payload.userId,
      email: payload.email,
      type: "password_reset",
    },
    env.JWT_SECRET,
    { expiresIn: "30m" }
  );
}

/**
 * Verify and decode a JWT token.
 *
 * @param {string} token - JWT to verify
 * @returns {Object} Decoded payload
 * @throws {AuthError} If the token is invalid or expired
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, env.JWT_SECRET);
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      throw new AuthError("Token has expired. Please login again.");
    }
    if (err.name === "JsonWebTokenError") {
      throw new AuthError("Invalid token. Please login again.");
    }
    throw new AuthError("Token verification failed.");
  }
}

/**
 * Verify a password reset token.
 *
 * @param {string} token
 * @returns {Object}
 */
function verifyPasswordResetToken(token) {
  const decoded = verifyToken(token);
  if (decoded.type !== "password_reset") {
    throw new AuthError("Invalid reset token. Please request a new one.");
  }

  return decoded;
}

module.exports = {
  generateToken,
  generatePasswordResetToken,
  verifyToken,
  verifyPasswordResetToken,
};
