/**
 * @fileoverview Optional JWT authentication middleware.
 * If a valid token is present, attaches req.user. If absent/invalid, continues anonymously.
 */

const { verifyToken } = require("../utils/jwt");
const { supabase } = require("../config/database");

async function optionalAuth(req, _res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) return next();

    const token = authHeader.split(" ")[1];
    if (!token) return next();

    const decoded = verifyToken(token);
    const { data: user, error } = await supabase
      .from("users")
      .select("id, email, full_name, role, college_id, branch_id, year, semester, specialization, is_active")
      .eq("id", decoded.userId)
      .single();

    if (error || !user || !user.is_active) return next();

    req.user = {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      collegeId: user.college_id,
      branchId: user.branch_id,
      year: user.year,
      semester: user.semester,
      specialization: user.specialization,
    };
  } catch (_) {
    // Ignore invalid optional auth token and continue anonymous.
  }

  next();
}

module.exports = optionalAuth;
