/**
 * @fileoverview JWT authentication middleware.
 * Extracts the Bearer token from the Authorization header, verifies it,
 * loads the full user record from the database, and attaches it to `req.user`.
 */

const { verifyToken } = require("../utils/jwt");
const { supabase } = require("../config/database");
const { AuthError } = require("../utils/errors");
const logger = require("../utils/logger");

/**
 * Express middleware that requires a valid JWT.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function authMiddleware(req, res, next) {
  try {
    // 1. Extract token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AuthError("No authentication token provided");
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      throw new AuthError("No authentication token provided");
    }

    // 2. Verify the token (throws AuthError on failure)
    const decoded = verifyToken(token);

    // 3. Load user from database to confirm they still exist and are active
    const { data: user, error } = await supabase
      .from("users")
      .select(
        "id, email, full_name, role, permissions, is_active, college_id, branch_id, year, semester, specialization"
      )
      .eq("id", decoded.userId)
      .single();

    if (error || !user) {
      throw new AuthError("User account not found");
    }

    if (!user.is_active) {
      throw new AuthError("User account is deactivated");
    }

    // 4. Attach user to request object for downstream handlers
    req.user = {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      permissions: user.permissions || [],
      collegeId: user.college_id,
      branchId: user.branch_id,
      year: user.year,
      semester: user.semester,
      specialization: user.specialization,
    };

    // 5. Update last_active timestamp (fire-and-forget — don't block the request)
    supabase
      .from("users")
      .update({ last_active: new Date().toISOString() })
      .eq("id", user.id)
      .then(() => {})
      .catch((err) =>
        logger.warn("Failed to update last_active", {
          userId: user.id,
          error: err.message,
        })
      );

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = authMiddleware;
