/**
 * @fileoverview JWT authentication middleware.
 * Extracts the Bearer token from the Authorization header, verifies it,
 * loads the full user record from the database, and attaches it to `req.user`.
 */

const { verifyToken } = require("../utils/jwt");
const { supabase } = require("../config/database");
const { AuthError } = require("../utils/errors");
const logger = require("../utils/logger");
const env = require("../config/env");
const NodeCache = require("node-cache");

const userCache = new NodeCache({
  stdTTL: env.AUTH_USER_CACHE_TTL_SECONDS,
  checkperiod: 120,
  useClones: false,
});
const lastActiveWrites = new NodeCache({
  stdTTL: Math.ceil(env.LAST_ACTIVE_WRITE_INTERVAL_MS / 1000),
  checkperiod: 120,
  useClones: false,
});

function toRequestUser(user) {
  return {
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
}

async function loadUser(userId) {
  const cached = userCache.get(userId);
  if (cached) return cached;

  const { data: user, error } = await supabase
    .from("users")
    .select(
      "id, email, full_name, role, permissions, is_active, college_id, branch_id, year, semester, specialization"
    )
    .eq("id", userId)
    .single();

  if (error || !user) {
    throw new AuthError("User account not found");
  }

  if (!user.is_active) {
    userCache.delete(userId);
    throw new AuthError("User account is deactivated");
  }

  userCache.set(userId, user);
  return user;
}

function touchLastActive(userId) {
  const now = Date.now();
  if (lastActiveWrites.get(userId)) return;
  lastActiveWrites.set(userId, true);

  supabase
    .from("users")
    .update({ last_active: new Date(now).toISOString() })
    .eq("id", userId)
    .then(({ error }) => {
      if (error) throw error;
    })
    .catch((err) =>
      logger.warn("Failed to update last_active", {
        userId,
        error: err.message,
      })
    );
}

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

    // 3. Load user from cache/DB to confirm they still exist and are active
    const user = await loadUser(decoded.userId);

    // 4. Attach user to request object for downstream handlers
    req.user = toRequestUser(user);

    // 5. Update last_active at most once per user per interval.
    touchLastActive(user.id);

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = authMiddleware;
