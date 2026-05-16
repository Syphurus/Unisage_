/**
 * @fileoverview Admin controller — handles CRUD for subjects, units, content,
 * user listing, and platform analytics. All endpoints require admin role.
 */

const bcrypt = require("bcrypt");
const { supabase } = require("../config/database");
const {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} = require("../utils/errors");
const analyticsService = require("../services/analytics.service");
const { normalizePermissions } = require("../middleware/permissions");
const {
  invalidateContentCache,
  invalidateSubjectCache,
  getSubjectUnitsContent,
  getSubjectContent,
  ensureSubjectContentUnit,
} = require("../services/content.service");
const {
  saveFile,
  deleteFile,
  getFileByContentId,
} = require("../services/files.service");
const logger = require("../utils/logger");
const { formatPdfBuffer } = require("../services/pdfFormatter.service");

const BCRYPT_ROUNDS = 10;
const ADMIN_PERMISSION_VALUES = [
  "dashboard.view",
  "subjects.manage",
  "content.manage",
  "users.manage",
  "team.manage",
  "analytics.view",
  "coupons.manage",
  "payments.review",
  "payments.revoke",
];

function parseFlexibleJson(raw) {
  const normalized = String(raw)
    .trim()
    .replace(/```(?:json)?/gi, "")
    .replace(/```/g, "")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'");

  try {
    return JSON.parse(normalized);
  } catch {
    return JSON.parse(normalized.replace(/,\s*([}\]])/g, "$1"));
  }
}

function normalizePaperPredictorData(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return input;
  }

  const data = { ...input };

  if (typeof data.predictions === "string") {
    try {
      const parsed = parseFlexibleJson(data.predictions);
      if (Array.isArray(parsed)) data.predictions = parsed;
    } catch {
      // keep original; downstream validation/usage can handle reporting
    }
  }

  if (Array.isArray(data.questions) && !Array.isArray(data.predictions)) {
    data.predictions = data.questions;
  }

  return data;
}

function normalizeIncomingContentData(input, type) {
  let parsed = input;

  if (typeof parsed === "string") {
    parsed = parseFlexibleJson(parsed);
  }

  if (type === "paper_predictor") {
    return normalizePaperPredictorData(parsed);
  }

  return parsed;
}

function sanitizePermissions(value) {
  const permissions = normalizePermissions(value);
  return permissions.filter((permission) =>
    ADMIN_PERMISSION_VALUES.includes(permission)
  );
}

function serializeManagedUser(user) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    role: user.role,
    permissions: normalizePermissions(user.permissions),
    year: user.year,
    semester: user.semester,
    enrollmentNumber: user.enrollment_number,
    isActive: user.is_active,
    createdAt: user.created_at,
    lastActive: user.last_active,
  };
}

async function listUsersByRole(role, req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const offset = (page - 1) * limit;
    const search = String(req.query.search || "").trim();

    const baseSelect =
      "id, email, full_name, role, permissions, year, semester, enrollment_number, is_active, created_at, last_active";

    const query = supabase.from("users").select(baseSelect, { count: "exact" }).eq("role", role);
    let explicitCount = null;

    if (search) {
      // Tokenize search so multi-word queries match any token across fields.
      // Remove characters that would interfere with PostgREST filter syntax.
      const safeSearch = search.replace(/[%_,()]/g, " ").trim();
      if (safeSearch) {
        const tokens = safeSearch.split(/\s+/).filter(Boolean).slice(0, 5); // limit tokens
        const orClauses = tokens
          .map(
            (t) =>
              `full_name.ilike.%${t}%` + `,email.ilike.%${t}%` + `,enrollment_number.ilike.%${t}%`
          )
          .join(",");

        if (orClauses) query.or(orClauses);
        // If search is present, run an explicit count query so pagination reflects
        // the total number of matching rows (Supabase may not always return
        // accurate counts for complex filters with range queries).
        if (orClauses) {
          const countQuery = supabase
            .from("users")
            .select("id", { count: "exact", head: true })
            .eq("role", role)
            .or(orClauses);
          const { count: counted, error: countError } = await countQuery;
          if (countError) {
            logger.error("Admin listUsersByRole count error", {
              error: countError,
              admin: req.user?.id,
              search: safeSearch,
            });
          } else {
            explicitCount = counted;
          }
        }
      }
    }

    query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    const finalCount = (typeof explicitCount !== "undefined" && explicitCount !== null)
      ? explicitCount
      : count;

    if (error) {
      logger.error("Admin listUsersByRole DB error", {
        error,
        admin: req.user?.id,
        search,
      });
      throw new Error("Failed to fetch users");
    }

    res.json({
      success: true,
      data: (data || []).map(serializeManagedUser),
      pagination: {
        page,
        limit,
        total: finalCount || 0,
        totalPages: Math.ceil((finalCount || 0) / limit),
      },
    });
  } catch (err) {
    next(err);
  }
}

async function upsertManagedUser(req, res, next, role) {
  try {
    const managedUserId = req.params.id || req.body.id || null;
    const {
      email,
      fullName,
      password,
      year,
      semester,
      enrollmentNumber,
      isActive,
      permissions,
    } = req.body;

    const normalizedEmail = String(email || "").toLowerCase();
    const allowedPermissions =
      role === "admin" ? sanitizePermissions(permissions) : [];

    if (role === "admin" && allowedPermissions.length === 0) {
      throw new ValidationError(
        "At least one permission is required for a team member"
      );
    }

    if (role === "student" && (year == null || semester == null)) {
      throw new ValidationError("year and semester are required for users");
    }

    const payload = {
      email: normalizedEmail,
      full_name: fullName,
      role,
      year: role === "student" ? year : (year ?? null),
      semester: role === "student" ? semester : (semester ?? null),
      enrollment_number: enrollmentNumber || null,
      is_active: isActive !== undefined ? isActive : true,
      permissions: allowedPermissions,
    };

    if (password) {
      payload.password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    }

    let result;
    if (managedUserId) {
      const updates = { ...payload };
      if (!updates.password_hash) delete updates.password_hash;
      if (updates.password_hash) {
        updates.password_hash = payload.password_hash;
      }
      if (updates.email === undefined) delete updates.email;
      const { data, error } = await supabase
        .from("users")
        .update(updates)
        .eq("id", managedUserId)
        .select(
          "id, email, full_name, role, permissions, year, semester, enrollment_number, is_active, created_at, last_active"
        )
        .single();

      if (error || !data) throw new NotFoundError("User");
      result = data;
    } else {
      if (!password) {
        throw new ValidationError("Password is required");
      }

      const { data, error } = await supabase
        .from("users")
        .insert({
          ...payload,
          password_hash: payload.password_hash,
        })
        .select(
          "id, email, full_name, role, permissions, year, semester, enrollment_number, is_active, created_at, last_active"
        )
        .single();

      if (error || !data) {
        if (error?.code === "23505") {
          throw new ValidationError("A user with this email already exists");
        }
        throw new Error("Failed to create user");
      }
      result = data;
    }

    res.status(managedUserId ? 200 : 201).json({
      success: true,
      data: serializeManagedUser(result),
    });
  } catch (err) {
    next(err);
  }
}

async function removeManagedUser(req, res, next, role) {
  try {
    const { id } = req.params;

    if (req.user?.id === id) {
      throw new ForbiddenError("You cannot delete your own account");
    }

    const { data: existing, error: lookupError } = await supabase
      .from("users")
      .select("id, role")
      .eq("id", id)
      .single();

    if (lookupError || !existing || existing.role !== role) {
      throw new NotFoundError("User");
    }

    const { error } = await supabase.from("users").delete().eq("id", id);
    if (error) throw new Error("Failed to delete user");

    res.json({ success: true, data: { message: "User deleted successfully" } });
  } catch (err) {
    next(err);
  }
}

function requireManagementAccess(req, requiredPermissions = []) {
  const permissions = normalizePermissions(req.user?.permissions);
  if (permissions.includes("*") || permissions.includes("all")) {
    return;
  }

  const allowed = requiredPermissions.some((permission) =>
    permissions.includes(permission)
  );

  if (!allowed) {
    throw new ForbiddenError(
      "You do not have permission to manage this section"
    );
  }
}

async function getStudentUsers(req, res, next) {
  try {
    requireManagementAccess(req, ["users.manage"]);
    return listUsersByRole("student", req, res, next);
  } catch (err) {
    next(err);
  }
}

async function createStudentUser(req, res, next) {
  try {
    requireManagementAccess(req, ["users.manage"]);
    req.body.role = "student";
    return upsertManagedUser(req, res, next, "student");
  } catch (err) {
    next(err);
  }
}

async function updateStudentUser(req, res, next) {
  try {
    requireManagementAccess(req, ["users.manage"]);
    req.body.role = "student";
    return upsertManagedUser(req, res, next, "student");
  } catch (err) {
    next(err);
  }
}

async function deleteStudentUser(req, res, next) {
  try {
    requireManagementAccess(req, ["users.manage"]);
    return removeManagedUser(req, res, next, "student");
  } catch (err) {
    next(err);
  }
}

async function getTeamMembers(req, res, next) {
  try {
    requireManagementAccess(req, ["team.manage"]);
    return listUsersByRole("admin", req, res, next);
  } catch (err) {
    next(err);
  }
}

async function createTeamMember(req, res, next) {
  try {
    requireManagementAccess(req, ["team.manage"]);
    req.body.role = "admin";
    return upsertManagedUser(req, res, next, "admin");
  } catch (err) {
    next(err);
  }
}

async function updateTeamMember(req, res, next) {
  try {
    requireManagementAccess(req, ["team.manage"]);
    req.body.role = "admin";
    return upsertManagedUser(req, res, next, "admin");
  } catch (err) {
    next(err);
  }
}

async function deleteTeamMember(req, res, next) {
  try {
    requireManagementAccess(req, ["team.manage"]);
    return removeManagedUser(req, res, next, "admin");
  } catch (err) {
    next(err);
  }
}

// ──────────────────────────────────────────────
// SUBJECTS
// ──────────────────────────────────────────────

/**
 * POST /api/admin/subjects
 */
async function createSubject(req, res, next) {
  try {
    const {
      branchId,
      name,
      code,
      year,
      semester,
      credits,
      description,
      predictorVisible,
    } = req.body;

    let resolvedBranchId = branchId || req.user?.branchId || null;

    if (!resolvedBranchId) {
      const { data: fallbackBranch, error: branchLookupError } = await supabase
        .from("branches")
        .select("id")
        .limit(1)
        .single();

      if (branchLookupError || !fallbackBranch) {
        throw new ValidationError(
          "No valid branch found for subject creation. Please contact support."
        );
      }

      resolvedBranchId = fallbackBranch.id;
    }

    const { data, error } = await supabase
      .from("subjects")
      .insert({
        branch_id: resolvedBranchId,
        name,
        code,
        year,
        semester,
        credits: credits || null,
        description: description || null,
        predictor_visible: predictorVisible ?? true,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        // unique constraint violation
        return res.status(409).json({
          success: false,
          error: {
            code: "CONFLICT",
            message: "Subject with this code already exists for this branch",
          },
        });
      }

      if (error.code === "23503") {
        throw new ValidationError("Invalid branch selected for this subject.");
      }

      logger.error("Create subject DB error", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        admin: req.user?.id,
      });
      throw new Error("Failed to create subject");
    }

    invalidateSubjectCache();
    logger.info("Subject created", { subjectId: data.id, admin: req.user.id });

    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/admin/subjects/:id
 */
async function updateSubject(req, res, next) {
  try {
    const { id } = req.params;
    const updates = {};

    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.code !== undefined) updates.code = req.body.code;
    if (req.body.year !== undefined) updates.year = req.body.year;
    if (req.body.semester !== undefined) updates.semester = req.body.semester;
    if (req.body.credits !== undefined) updates.credits = req.body.credits;
    if (req.body.description !== undefined)
      updates.description = req.body.description;
    if (req.body.isActive !== undefined) updates.is_active = req.body.isActive;
    if (req.body.predictorVisible !== undefined)
      updates.predictor_visible = req.body.predictorVisible;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("subjects")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error || !data) throw new NotFoundError("Subject");

    invalidateSubjectCache();
    logger.info("Subject updated", { subjectId: id, admin: req.user.id });

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/admin/subjects/:id
 */
async function deleteSubject(req, res, next) {
  try {
    const { id } = req.params;

    const { error } = await supabase.from("subjects").delete().eq("id", id);

    if (error) throw new Error("Failed to delete subject");

    invalidateSubjectCache();
    invalidateContentCache();
    logger.info("Subject deleted", { subjectId: id, admin: req.user.id });

    res.json({
      success: true,
      data: { message: "Subject deleted successfully" },
    });
  } catch (err) {
    next(err);
  }
}

// ──────────────────────────────────────────────
// UNITS
// ──────────────────────────────────────────────

/**
 * POST /api/admin/units
 */
async function createUnit(req, res, next) {
  try {
    const { subjectId, unitNumber, title, description, orderIndex } = req.body;

    const { data, error } = await supabase
      .from("units")
      .insert({
        subject_id: subjectId,
        unit_number: unitNumber,
        title,
        description: description || null,
        order_index: orderIndex || 0,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return res.status(409).json({
          success: false,
          error: {
            code: "CONFLICT",
            message: "Unit number already exists for this subject",
          },
        });
      }
      throw new Error("Failed to create unit");
    }

    invalidateSubjectCache();
    logger.info("Unit created", { unitId: data.id, admin: req.user.id });

    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/admin/units/:id
 */
async function updateUnit(req, res, next) {
  try {
    const { id } = req.params;
    const updates = {};

    if (req.body.unitNumber !== undefined)
      updates.unit_number = req.body.unitNumber;
    if (req.body.title !== undefined) updates.title = req.body.title;
    if (req.body.description !== undefined)
      updates.description = req.body.description;
    if (req.body.orderIndex !== undefined)
      updates.order_index = req.body.orderIndex;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("units")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error || !data) throw new NotFoundError("Unit");

    invalidateSubjectCache();
    logger.info("Unit updated", { unitId: id, admin: req.user.id });

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/admin/units/:id
 */
async function deleteUnit(req, res, next) {
  try {
    const { id } = req.params;

    const { error } = await supabase.from("units").delete().eq("id", id);

    if (error) throw new Error("Failed to delete unit");

    invalidateSubjectCache();
    invalidateContentCache();
    logger.info("Unit deleted", { unitId: id, admin: req.user.id });

    res.json({ success: true, data: { message: "Unit deleted successfully" } });
  } catch (err) {
    next(err);
  }
}

// ──────────────────────────────────────────────
// CONTENT
// ──────────────────────────────────────────────

/**
 * POST /api/admin/content
 * Supports file uploads for PYQs type
 */
async function createContent(req, res, next) {
  try {
    const {
      subjectId,
      unitId,
      type,
      title,
      data: contentData,
      orderIndex,
      isPublished,
    } = req.body;

    let parsedContentData = contentData;
    if (parsedContentData !== undefined) {
      try {
        parsedContentData = normalizeIncomingContentData(
          parsedContentData,
          type
        );
      } catch {
        throw new ValidationError("Invalid content data JSON");
      }
    }

    let resolvedSubjectId = subjectId || null;
    let resolvedUnitId = unitId || null;

    if (resolvedUnitId && !resolvedSubjectId) {
      const { data: unit, error: unitErr } = await supabase
        .from("units")
        .select("subject_id")
        .eq("id", resolvedUnitId)
        .single();

      if (unitErr || !unit) {
        throw new ValidationError("Invalid unit selected for this content.");
      }

      resolvedSubjectId = unit.subject_id;
    }

    if (resolvedSubjectId && !resolvedUnitId) {
      resolvedUnitId = await ensureSubjectContentUnit(resolvedSubjectId);
    }

    if (resolvedSubjectId) {
      const { data: subject, error: subjectErr } = await supabase
        .from("subjects")
        .select("id")
        .eq("id", resolvedSubjectId)
        .single();

      if (subjectErr || !subject) {
        throw new ValidationError("Invalid subject selected for this content.");
      }
    }

    const baseInsertPayload = {
      unit_id: resolvedUnitId,
      type,
      title: title || null,
      data: parsedContentData,
      order_index: orderIndex || 0,
      is_published: isPublished || false,
    };

    const insertWithSubjectPayload = {
      ...baseInsertPayload,
      subject_id: resolvedSubjectId,
    };

    let { data, error } = await supabase
      .from("content")
      .insert(insertWithSubjectPayload)
      .select()
      .single();

    // Some deployed DBs don't have content.subject_id.
    // Retry insert with unit_id-only payload for backward compatibility.
    if (
      error &&
      typeof error.message === "string" &&
      error.message.includes("Could not find the 'subject_id' column")
    ) {
      ({ data, error } = await supabase
        .from("content")
        .insert(baseInsertPayload)
        .select()
        .single());
    }

    if (error) {
      logger.error("Create content DB error", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        type,
        subjectId: resolvedSubjectId,
        unitId: resolvedUnitId,
      });

      if (
        type === "paper_predictor" &&
        typeof error.message === "string" &&
        error.message.includes(
          'invalid input value for enum content_type: "paper_predictor"'
        )
      ) {
        throw new ValidationError(
          "Database enum content_type is missing 'paper_predictor'. Run migration backend/database/migrations/20260510_add_paper_predictor_enum.sql and retry."
        );
      }

      throw new ValidationError(error.message || "Failed to create content");
    }

    // Handle file upload for file-backed content types (PYQs, syllabus, assignments)
    if (["pyqs", "syllabus", "assignments"].includes(type) && req.file) {
      try {
        const fileInfo = await saveFile(
          req.file.buffer,
          req.file.originalname,
          req.file.mimetype,
          data.id
        );
        data.fileId = fileInfo.id;
        data.filename = fileInfo.originalFilename;
      } catch (fileErr) {
        await supabase.from("content").delete().eq("id", data.id);
        logger.error("File upload failed; removed created content", {
          contentId: data.id,
          error: fileErr.message,
        });
        throw new ValidationError(
          "File upload failed. Check the Supabase Storage bucket and try again."
        );
      }
    }

    invalidateContentCache();
    logger.info("Content created", {
      contentId: data.id,
      type,
      admin: req.user.id,
    });

    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/admin/content/:id
 */
async function updateContent(req, res, next) {
  try {
    const { id } = req.params;
    // Fetch existing content to determine type and allow file replacement
    const { data: existing, error: existingErr } = await supabase
      .from("content")
      .select("id, type")
      .eq("id", id)
      .single();

    if (existingErr || !existing) throw new NotFoundError("Content");
    const updates = {};

    if (req.body.title !== undefined) updates.title = req.body.title;
    if (req.body.data !== undefined) {
      try {
        updates.data = normalizeIncomingContentData(
          req.body.data,
          existing.type
        );
      } catch {
        throw new ValidationError("Invalid content data JSON");
      }
    }
    if (req.body.orderIndex !== undefined)
      updates.order_index = req.body.orderIndex;
    if (req.body.isPublished !== undefined)
      updates.is_published = req.body.isPublished;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("content")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error || !data) throw new NotFoundError("Content");

    invalidateContentCache();
    logger.info("Content updated", { contentId: id, admin: req.user.id });

    // If a new file was uploaded for file-backed types, replace stored file
    try {
      if (
        req.file &&
        ["pyqs", "syllabus", "assignments"].includes(existing.type)
      ) {
        // remove old file if any
        const old = await getFileByContentId(id);
        if (old) {
          await deleteFile(old.id);
        }
        const fileInfo = await saveFile(
          req.file.buffer,
          req.file.originalname,
          req.file.mimetype,
          id
        );
        // attach metadata to response data for convenience
        data.fileId = fileInfo.id;
        data.filename =
          fileInfo.original_filename ||
          fileInfo.originalFilename ||
          req.file.originalname;
      }
    } catch (fileErr) {
      logger.error("Failed to replace file during update", {
        contentId: id,
        error: fileErr.message,
      });
      throw new ValidationError(
        "File replacement failed. Check the Supabase Storage bucket and try again."
      );
    }

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/admin/content/:id
 */
async function deleteContent(req, res, next) {
  try {
    const { id } = req.params;

    // Delete associated file if exists (for PYQs)
    try {
      const fileInfo = await getFileByContentId(id);
      if (fileInfo) {
        await deleteFile(fileInfo.id);
      }
    } catch (fileErr) {
      logger.warn("Failed to delete associated file", {
        contentId: id,
        error: fileErr.message,
      });
    }

    const { error } = await supabase.from("content").delete().eq("id", id);

    if (error) throw new Error("Failed to delete content");

    invalidateContentCache();
    logger.info("Content deleted", { contentId: id, admin: req.user.id });

    res.json({
      success: true,
      data: { message: "Content deleted successfully" },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/content/:id
 * Get a single content item (including unpublished) — admin only.
 */
async function getContentAdmin(req, res, next) {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("content")
      .select(
        `
        *,
        units!content_unit_id_fkey(
          id, title, unit_number,
          subjects!units_subject_id_fkey(id, name, code)
        )
      `
      )
      .eq("id", id)
      .single();

    if (error || !data) throw new NotFoundError("Content");

    res.json({
      success: true,
      data: {
        id: data.id,
        type: data.type,
        title: data.title,
        data: data.data,
        orderIndex: data.order_index,
        isPublished: data.is_published,
        unit: data.units
          ? {
              id: data.units.id,
              title: data.units.title,
              unitNumber: data.units.unit_number,
              subject: data.units.subjects
                ? {
                    id: data.units.subjects.id,
                    name: data.units.subjects.name,
                    code: data.units.subjects.code,
                  }
                : null,
            }
          : null,
        subject: data.units?.subjects
          ? {
              id: data.units.subjects.id,
              name: data.units.subjects.name,
              code: data.units.subjects.code,
            }
          : null,
        createdAt: data.created_at,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/units/:id/content
 * Get ALL content for a unit (including unpublished) — admin only.
 */
async function getUnitContentAdmin(req, res, next) {
  try {
    const { id } = req.params;

    // Verify unit exists
    const { data: unit, error: unitErr } = await supabase
      .from("units")
      .select("id, title")
      .eq("id", id)
      .single();

    if (unitErr || !unit) throw new NotFoundError("Unit");

    const { data, error } = await supabase
      .from("content")
      .select("*")
      .eq("unit_id", id)
      .order("order_index", { ascending: true });

    if (error) throw new Error("Failed to fetch unit content");

    // Group content by type (same shape as public endpoint)
    const grouped = {
      long_notes: [],
      short_notes: [],
      flashcard: [],
      quiz: [],
      paper_predictor: [],
      exam_tips: [],
      pyqs: [],
      syllabus: [],
      assignments: [],
    };

    for (const item of data) {
      if (grouped[item.type]) {
        grouped[item.type].push({
          id: item.id,
          title: item.title,
          data: item.data,
          orderIndex: item.order_index,
          isPublished: item.is_published,
          createdAt: item.created_at,
        });
      }
    }

    res.json({
      success: true,
      data: {
        unit: { id: unit.id, title: unit.title },
        content: grouped,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/subjects/:id/units/content
 * Batched admin endpoint: all units and all grouped content for a subject.
 */
async function getSubjectUnitsContentAdmin(req, res, next) {
  try {
    const { id } = req.params;

    const { data: subject, error: subErr } = await supabase
      .from("subjects")
      .select("id, name, code")
      .eq("id", id)
      .single();

    if (subErr || !subject) throw new NotFoundError("Subject");

    const units = await getSubjectUnitsContent(id, {
      includeUnpublished: true,
    });

    res.json({
      success: true,
      data: {
        subject,
        units,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/subjects/:id/content
 * Get grouped subject-level content, including legacy unit-linked content.
 */
async function getSubjectContentAdmin(req, res, next) {
  try {
    const { id } = req.params;

    const result = await getSubjectContent(id, { includeUnpublished: true });

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/admin/content/format-pdf
 * Multipart field: file (PDF)
 * Body optional: title
 */
async function formatPdfContent(req, res, next) {
  try {
    if (!req.file || !req.file.buffer) {
      throw new ValidationError("PDF file is required");
    }

    const title = req.body?.title || "Formatted Notes";
    const result = await formatPdfBuffer(req.file.buffer, { title });

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/admin/content/:id/publish
 * Toggle publish state.
 */
async function publishContent(req, res, next) {
  try {
    const { id } = req.params;
    const { isPublished } = req.body;

    const { data, error } = await supabase
      .from("content")
      .update({
        is_published: isPublished,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error || !data) throw new NotFoundError("Content");

    invalidateContentCache();
    logger.info("Content publish toggled", {
      contentId: id,
      isPublished,
      admin: req.user.id,
    });

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// ──────────────────────────────────────────────
// USERS & ANALYTICS
// ──────────────────────────────────────────────

/**
 * GET /api/admin/users
 * Get all users with pagination.
 */
async function getUsers(req, res, next) {
  try {
    const role = req.query.role;
    if (role === "admin") {
      return getTeamMembers(req, res, next);
    }

    return getStudentUsers(req, res, next);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/analytics
 * Get platform-wide analytics.
 */
async function getAnalytics(req, res, next) {
  try {
    const analytics = await analyticsService.getPlatformAnalytics();

    res.json({
      success: true,
      data: analytics,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  // Subjects
  createSubject,
  updateSubject,
  deleteSubject,
  // Units
  createUnit,
  updateUnit,
  deleteUnit,
  // Content
  createContent,
  updateContent,
  deleteContent,
  publishContent,
  getUnitContentAdmin,
  getSubjectUnitsContentAdmin,
  getSubjectContentAdmin,
  getContentAdmin,
  formatPdfContent,
  // Users & Analytics
  getUsers,
  getStudentUsers,
  createStudentUser,
  updateStudentUser,
  deleteStudentUser,
  getTeamMembers,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
  getAnalytics,
};
