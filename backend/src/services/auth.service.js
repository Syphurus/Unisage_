/**
 * @fileoverview Authentication service — handles signup, login, and profile operations.
 * Encapsulates all auth-related business logic, keeping controllers thin.
 */

const bcrypt = require("bcrypt");
const { supabase } = require("../config/database");
const { generateToken } = require("../utils/jwt");
const {
  AuthError,
  ConflictError,
  NotFoundError,
  ValidationError,
  ServiceUnavailableError,
} = require("../utils/errors");
const logger = require("../utils/logger");

const BCRYPT_ROUNDS = 10;

/**
 * Register a new user.
 *
 * @param {Object} data
 * @param {string} data.email
 * @param {string} data.password
 * @param {string} data.fullName
 * @param {string} data.collegeCode
 * @param {string} data.branchCode
 * @param {number} data.year
 * @param {string} [data.enrollmentNumber]
 * @returns {Promise<{user: Object, token: string}>}
 */
async function signup(data) {
  const {
    email,
    password,
    fullName,
    collegeCode,
    branchCode,
    year,
    semester,
    specialization,
    enrollmentNumber,
  } = data;
  const normalizedSpecialization =
    semester >= 4 && specialization ? String(specialization).trim() : null;

  if (semester >= 4 && !normalizedSpecialization) {
    throw new ValidationError("Specialization is required for semester 4 and above");
  }

  // 1. Check if user already exists
  const { data: existingRows, error: existingErr } = await supabase
    .from("users")
    .select("id")
    .eq("email", email.toLowerCase())
    .limit(1);

  if (existingErr) {
    throw new Error("Failed to check existing account");
  }

  const existing = Array.isArray(existingRows) ? existingRows[0] : existingRows;

  if (existing) {
    throw new ConflictError("An account with this email already exists");
  }

  // 2. Resolve college
  const { data: college, error: collegeErr } = await supabase
    .from("colleges")
    .select("id")
    .eq("code", String(collegeCode).toLowerCase())
    .single();

  if (collegeErr || !college) {
    throw new ValidationError("Invalid college code");
  }

  // 3. Resolve branch
  const { data: branch, error: branchErr } = await supabase
    .from("branches")
    .select("id")
    .eq("code", String(branchCode).toLowerCase())
    .eq("college_id", college.id)
    .single();

  if (branchErr || !branch) {
    throw new ValidationError("Invalid branch code");
  }

  // 4. Hash password
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // 5. Insert user
  const { data: user, error: insertErr } = await supabase
    .from("users")
    .insert({
      email: email.toLowerCase(),
      password_hash: passwordHash,
      full_name: fullName,
      college_id: college.id,
      branch_id: branch.id,
      year,
      semester,
      specialization: normalizedSpecialization,
      enrollment_number: enrollmentNumber || null,
      role: "student",
      permissions: [],
    })
    .select(
      "id, email, full_name, role, permissions, year, semester, specialization, enrollment_number, created_at"
    )
    .single();

  if (insertErr) {
    logger.error("Signup insert failed", {
      error: insertErr.message,
      code: insertErr.code,
      details: insertErr.details,
      hint: insertErr.hint,
      email,
    });

    if (/specialization|schema cache/i.test(insertErr.message || "")) {
      throw new ServiceUnavailableError(
        "Signup is not fully configured. Run backend/database/migrations/20260511_add_user_specialization.sql in Supabase, then restart the backend."
      );
    }

    throw new Error("Failed to create account. Please try again.");
  }

  // 6. Generate JWT
  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  logger.info("User registered", { userId: user.id, email: user.email });

  return {
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      permissions: user.permissions || [],
      year: user.year,
      semester: user.semester,
      specialization: user.specialization,
      collegeCode: String(collegeCode).toLowerCase(),
      branchCode: String(branchCode).toLowerCase(),
      enrollmentNumber: user.enrollment_number,
      createdAt: user.created_at,
    },
    token,
  };
}

/**
 * Authenticate a user with email and password.
 *
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{user: Object, token: string}>}
 */
async function login(email, password) {
  // 1. Look up user by email
  const { data: userRows, error } = await supabase
    .from("users")
    .select(
      `
      id, email, password_hash, full_name, role, permissions, year, semester, specialization, enrollment_number, is_active,
      colleges!users_college_id_fkey(code),
      branches!users_branch_id_fkey(code)
      `
    )
    .eq("email", email.toLowerCase())
    .order("created_at", { ascending: false })
    .limit(1);

  const user = Array.isArray(userRows) ? userRows[0] : userRows;

  if (error) {
    if (error.code === "PGRST205") {
      throw new ServiceUnavailableError(
        "Database schema not initialized. Run backend/database/schema.sql in Supabase SQL Editor."
      );
    }

    logger.error("Login user lookup failed", {
      error: error.message,
      code: error.code,
      email: email.toLowerCase(),
    });
    throw new AuthError("Invalid email or password");
  }

  if (!user) {
    throw new AuthError("Invalid email or password");
  }

  if (!user.is_active) {
    throw new AuthError("Account is deactivated. Contact support.");
  }

  // 2. Compare password
  const isValidPassword = await bcrypt.compare(password, user.password_hash);
  if (!isValidPassword) {
    throw new AuthError("Invalid email or password");
  }

  // 3. Generate JWT
  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  // 4. Update last_active
  await supabase
    .from("users")
    .update({ last_active: new Date().toISOString() })
    .eq("id", user.id);

  logger.info("User logged in", { userId: user.id });

  return {
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      permissions: user.permissions || [],
      year: user.year,
      semester: user.semester,
      specialization: user.specialization,
      collegeCode: user.colleges?.code || null,
      branchCode: user.branches?.code || null,
      enrollmentNumber: user.enrollment_number,
    },
    token,
  };
}

/**
 * Get full profile for the authenticated user.
 *
 * @param {string} userId
 * @returns {Promise<Object>}
 */
async function getProfile(userId) {
  const { data: user, error } = await supabase
    .from("users")
    .select(
      `
      id, email, full_name, role, permissions, year, enrollment_number, is_active, created_at, last_active,
      semester, specialization,
      colleges!users_college_id_fkey(name, code),
      branches!users_branch_id_fkey(name, code)
    `
    )
    .eq("id", userId)
    .single();

  if (error || !user) {
    throw new NotFoundError("User");
  }

  return {
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    role: user.role,
    permissions: user.permissions || [],
    year: user.year,
    semester: user.semester,
    specialization: user.specialization,
    enrollmentNumber: user.enrollment_number,
    isActive: user.is_active,
    collegeCode: user.colleges?.code || null,
    branchCode: user.branches?.code || null,
    college: user.colleges,
    branch: user.branches,
    createdAt: user.created_at,
    lastActive: user.last_active,
  };
}

/**
 * Update profile for the authenticated user.
 *
 * @param {string} userId
 * @param {Object} updates
 * @returns {Promise<Object>}
 */
async function updateProfile(userId, updates) {
  const updateData = {};
  if (updates.fullName !== undefined) updateData.full_name = updates.fullName;
  if (updates.year !== undefined) updateData.year = updates.year;
  if (updates.semester !== undefined) updateData.semester = updates.semester;
  if (updates.specialization !== undefined) {
    updateData.specialization = updates.specialization || null;
  }
  if (updates.semester !== undefined && updates.semester < 4) {
    updateData.specialization = null;
  }
  if (updates.enrollmentNumber !== undefined)
    updateData.enrollment_number = updates.enrollmentNumber;

  if (updates.collegeCode || updates.branchCode) {
    if (!updates.collegeCode || !updates.branchCode) {
      throw new ValidationError(
        "collegeCode and branchCode must be provided together"
      );
    }

    const { data: college, error: collegeErr } = await supabase
      .from("colleges")
      .select("id")
      .eq("code", String(updates.collegeCode).toLowerCase())
      .single();

    if (collegeErr || !college)
      throw new ValidationError("Invalid college code");

    const { data: branch, error: branchErr } = await supabase
      .from("branches")
      .select("id")
      .eq("code", String(updates.branchCode).toLowerCase())
      .eq("college_id", college.id)
      .single();

    if (branchErr || !branch) throw new ValidationError("Invalid branch code");

    updateData.college_id = college.id;
    updateData.branch_id = branch.id;
  }

  const { data: user, error } = await supabase
    .from("users")
    .update(updateData)
    .eq("id", userId)
    .select(
      `
      id, email, full_name, role, year, semester, specialization, enrollment_number,
      colleges!users_college_id_fkey(code),
      branches!users_branch_id_fkey(code)
      `
    )
    .single();

  if (error) {
    logger.error("Profile update failed", { userId, error: error.message });
    throw new Error("Failed to update profile");
  }

  return {
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    role: user.role,
    permissions: user.permissions || [],
    year: user.year,
    semester: user.semester,
    specialization: user.specialization,
    collegeCode: user.colleges?.code || null,
    branchCode: user.branches?.code || null,
    enrollmentNumber: user.enrollment_number,
  };
}

module.exports = { signup, login, getProfile, updateProfile };
