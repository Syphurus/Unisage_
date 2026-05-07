/**
 * @fileoverview Admin role verification middleware.
 * Must be used AFTER the auth middleware so that `req.user` is populated.
 */

const { ForbiddenError } = require("../utils/errors");

/**
 * Express middleware that restricts access to admin users.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function adminAuth(req, res, next) {
  try {
    if (!req.user) {
      throw new ForbiddenError("Authentication required");
    }

    if (req.user.role !== "admin") {
      throw new ForbiddenError("Admin access required");
    }

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = adminAuth;
