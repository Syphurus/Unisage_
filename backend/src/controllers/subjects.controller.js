/**
 * @fileoverview Subjects controller — handles subject listing and detail endpoints.
 */

const { supabase } = require("../config/database");
const { NotFoundError } = require("../utils/errors");
const { cache } = require("../services/content.service");
const contentService = require("../services/content.service");
const { stripPremiumGrouped } = require("../modules/entitlements/strip");
const {
  canAccessSubject,
  filterSubjectsForStudent,
} = require("../utils/semesterSubjects");

/**
 * GET /api/subjects
 * List all active subjects with optional year/semester filter and pagination.
 */
async function getSubjects(req, res, next) {
  try {
    const queryYear = req.query.year;
    const querySemester = req.query.semester;
    const queryBranchId = req.query.branchId;

    // If the client explicitly sends "all", do not fall back to profile defaults.
    const year =
      queryYear === undefined
        ? req.user?.year
        : queryYear === "all"
          ? undefined
          : queryYear;
    const semester =
      querySemester === undefined
        ? req.user?.semester
        : querySemester === "all"
          ? undefined
          : querySemester;
    const branchId = queryBranchId || req.user?.branchId;

    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const offset = (page - 1) * limit;

    const specialization = req.user?.specialization || "all";
    const shouldFilterSpecialization =
      req.user && Number(semester || req.user?.semester) >= 4;

    // Build cache key from filters
    const cacheKey = `subjects_${branchId || "all"}_${year || "all"}_${semester || "all"}_${specialization}_p${page}_l${limit}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json({ success: true, ...cached });
    }

    let query = supabase
      .from("subjects")
      .select(
        "id, name, code, year, semester, credits, description, predictor_visible, created_at",
        { count: "exact" }
      )
      .eq("is_active", true)
      .order("year", { ascending: true })
      .order("semester", { ascending: true })
      .order("name", { ascending: true });

    if (year) query = query.eq("year", year);
    if (semester) query = query.eq("semester", semester);
    if (branchId) query = query.eq("branch_id", branchId);

    if (!shouldFilterSpecialization) {
      query = query.range(offset, offset + limit - 1);
    }

    const { data, error, count } = await query;

    if (error) throw new Error("Failed to fetch subjects");

    const filtered = shouldFilterSpecialization
      ? filterSubjectsForStudent(data || [], req.user)
      : data || [];
    const paged = shouldFilterSpecialization
      ? filtered.slice(offset, offset + limit)
      : filtered;
    const total = shouldFilterSpecialization ? filtered.length : count || 0;

    const result = {
      data: paged.map((s) => ({
        id: s.id,
        name: s.name,
        code: s.code,
        year: s.year,
        semester: s.semester,
        credits: s.credits,
        description: s.description,
        predictorVisible: s.predictor_visible,
        createdAt: s.created_at,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    cache.set(cacheKey, result, 600); // 10 min cache
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/subjects/:id
 * Get a single subject with its units.
 */
async function getSubjectById(req, res, next) {
  try {
    const { id } = req.params;

    const cacheKey = `subject_${id}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached });
    }

    const { data, error } = await supabase
      .from("subjects")
      .select(
        `
        id, name, code, year, semester, credits, description, predictor_visible, created_at,
        units(id, unit_number, title, description, order_index)
      `
      )
      .eq("id", id)
      .eq("is_active", true)
      .single();

    if (error || !data) throw new NotFoundError("Subject");
    if (!canAccessSubject(data, req.user)) throw new NotFoundError("Subject");

    // Sort units by order_index
    const units = (data.units || [])
      .filter((u) => u.unit_number !== 0)
      .sort((a, b) => a.order_index - b.order_index)
      .map((u) => ({
        id: u.id,
        unitNumber: u.unit_number,
        title: u.title,
        description: u.description,
        orderIndex: u.order_index,
      }));

    const result = {
      id: data.id,
      name: data.name,
      code: data.code,
      year: data.year,
      semester: data.semester,
      credits: data.credits,
      description: data.description,
      predictorVisible: data.predictor_visible,
      units,
      createdAt: data.created_at,
    };

    cache.set(cacheKey, result, 600);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/subjects/:id/units
 * Get all units for a specific subject.
 */
async function getSubjectUnits(req, res, next) {
  try {
    const { id } = req.params;

    // Verify subject exists and is active
    const { data: subject, error: subErr } = await supabase
      .from("subjects")
      .select("id, name, code, year, semester, predictor_visible")
      .eq("id", id)
      .eq("is_active", true)
      .single();

    if (subErr || !subject) throw new NotFoundError("Subject");
    if (!canAccessSubject(subject, req.user))
      throw new NotFoundError("Subject");

    const { data: units, error } = await supabase
      .from("units")
      .select("id, unit_number, title, description, order_index, created_at")
      .eq("subject_id", id)
      .order("order_index", { ascending: true });

    if (error) throw new Error("Failed to fetch units");

    res.json({
      success: true,
      data: {
        subject: { id: subject.id, name: subject.name },
        units: (units || [])
          .filter((u) => u.unit_number !== 0)
          .map((u) => ({
            id: u.id,
            unitNumber: u.unit_number,
            title: u.title,
            description: u.description,
            orderIndex: u.order_index,
            createdAt: u.created_at,
          })),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/subjects/:id/units/content
 * Get all units for a subject with grouped content for each unit.
 */
async function getSubjectUnitsContent(req, res, next) {
  try {
    const { id } = req.params;

    const { data: subject, error: subErr } = await supabase
      .from("subjects")
      .select("id, name, code, year, semester, predictor_visible")
      .eq("id", id)
      .eq("is_active", true)
      .single();

    if (subErr || !subject) throw new NotFoundError("Subject");
    if (!canAccessSubject(subject, req.user))
      throw new NotFoundError("Subject");

    const units = await contentService.getSubjectUnitsContent(id, {
      includeUnpublished: false,
    });

    // Strip premium content (`paper_predictor`) from each unit's grouped content
    // when the caller lacks the entitlement. Backend is authoritative.
    const filteredUnits = (units || []).map((u) => ({
      ...u,
      content: stripPremiumGrouped(u.content, req.entitlements),
    }));

    res.json({
      success: true,
      data: {
        subject,
        units: filteredUnits,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/subjects/:id/content
 * Get subject-level content grouped by type.
 */
async function getSubjectContent(req, res, next) {
  try {
    const { id } = req.params;

    const result = await contentService.getSubjectContent(id, {
      includeUnpublished: false,
    });
    if (!canAccessSubject(result?.subject, req.user)) {
      throw new NotFoundError("Subject");
    }

    // Strip premium types from grouped content when unentitled.
    const filtered = {
      ...result,
      subject: result?.subject
        ? {
            ...result.subject,
            predictorVisible: result.subject.predictor_visible,
          }
        : result?.subject,
      content: stripPremiumGrouped(result?.content, req.entitlements),
    };

    res.json({
      success: true,
      data: filtered,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSubjects,
  getSubjectById,
  getSubjectUnits,
  getSubjectUnitsContent,
  getSubjectContent,
};
