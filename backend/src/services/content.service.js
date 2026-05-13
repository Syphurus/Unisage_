/**
 * @fileoverview Content service — business logic for content retrieval.
 * Implements caching for frequently accessed content using node-cache.
 */

const NodeCache = require("node-cache");
const { supabase } = require("../config/database");
const { NotFoundError } = require("../utils/errors");

// Cache TTL: 5 minutes for content, 10 minutes for subjects
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60, maxKeys: 500 });

function emptyContentBuckets() {
  return {
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
}

function pushContentItem(bucket, item) {
  if (!bucket || !bucket[item.type]) return;
  bucket[item.type].push({
    id: item.id,
    title: item.title,
    data: item.data,
    orderIndex: item.order_index,
    isPublished: item.is_published,
    createdAt: item.created_at,
  });
}

async function ensureSubjectContentUnit(subjectId) {
  const { data: existingUnits, error: existingErr } = await supabase
    .from("units")
    .select("id")
    .eq("subject_id", subjectId)
    .eq("unit_number", 0)
    .limit(1);

  if (existingErr) {
    throw new Error("Failed to prepare subject content container");
  }

  if (existingUnits?.[0]?.id) {
    return existingUnits[0].id;
  }

  const { data: subject, error: subjectErr } = await supabase
    .from("subjects")
    .select("id, name")
    .eq("id", subjectId)
    .single();

  if (subjectErr || !subject) {
    throw new NotFoundError("Subject");
  }

  const { data: createdUnit, error: createErr } = await supabase
    .from("units")
    .insert({
      subject_id: subjectId,
      unit_number: 0,
      title: `${subject.name} Content`,
      description: "Auto-generated container for subject-level content",
      order_index: -1,
    })
    .select("id")
    .single();

  if (createErr || !createdUnit) {
    const { data: retryUnits, error: retryErr } = await supabase
      .from("units")
      .select("id")
      .eq("subject_id", subjectId)
      .eq("unit_number", 0)
      .limit(1);

    if (!retryErr && retryUnits?.[0]?.id) {
      return retryUnits[0].id;
    }

    throw new Error("Failed to prepare subject content container");
  }

  return createdUnit.id;
}

/**
 * Get content grouped by type for a specific unit.
 *
 * @param {string} unitId
 * @returns {Promise<Object>} Content grouped by type
 */
async function getUnitContent(unitId) {
  const cacheKey = `unit_content_${unitId}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const { data, error } = await supabase
    .from("content")
    .select("*")
    .eq("unit_id", unitId)
    .eq("is_published", true)
    .order("order_index", { ascending: true });

  if (error) {
    throw new Error("Failed to fetch unit content");
  }

  // Group content by type
  const grouped = emptyContentBuckets();

  for (const item of data) {
    pushContentItem(grouped, item);
  }

  cache.set(cacheKey, grouped);
  return grouped;
}

/**
 * Get content grouped by type for a specific subject.
 * Supports both subject-level content and legacy unit-linked content.
 *
 * @param {string} subjectId
 * @param {{includeUnpublished?: boolean}} options
 * @returns {Promise<Object>}
 */
async function getSubjectContent(subjectId, options = {}) {
  const includeUnpublished = !!options.includeUnpublished;
  const cacheKey = `subject_content_${subjectId}_${includeUnpublished ? "admin" : "public"}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const { data: subject, error: subjectErr } = await supabase
    .from("subjects")
    .select("id, name, code, year, semester, predictor_visible")
    .eq("id", subjectId)
    .single();

  if (subjectErr || !subject) {
    throw new NotFoundError("Subject");
  }

  const { data: units, error: unitsErr } = await supabase
    .from("units")
    .select("id")
    .eq("subject_id", subjectId);

  if (unitsErr) throw new Error("Failed to fetch subject units");

  const unitIds = (units || []).map((unit) => unit.id);

  if (unitIds.length === 0) {
    const empty = {
      subject,
      content: emptyContentBuckets(),
      counts: Object.fromEntries(
        Object.keys(emptyContentBuckets()).map((k) => [k, 0])
      ),
    };
    cache.set(cacheKey, empty);
    return empty;
  }

  const { data: contents, error: contentErr } = await supabase
    .from("content")
    .select(
      "id, unit_id, type, title, data, order_index, is_published, created_at"
    )
    .in("unit_id", unitIds)
    .order("order_index", { ascending: true });

  if (contentErr) throw new Error("Failed to fetch subject content");

  const contentsToGroup = includeUnpublished
    ? contents || []
    : (contents || []).filter((item) => item.is_published);

  const grouped = emptyContentBuckets();
  for (const item of contentsToGroup) {
    pushContentItem(grouped, item);
  }

  const result = {
    subject,
    content: grouped,
    counts: Object.fromEntries(
      Object.entries(grouped).map(([key, value]) => [key, value.length])
    ),
  };

  cache.set(cacheKey, result);
  return result;
}

/**
 * Get all units for a subject with content grouped by type for each unit.
 *
 * @param {string} subjectId
 * @param {{includeUnpublished?: boolean}} options
 * @returns {Promise<Array>}
 */
async function getSubjectUnitsContent(subjectId, options = {}) {
  const includeUnpublished = !!options.includeUnpublished;
  const cacheKey = `subject_units_content_${subjectId}_${includeUnpublished ? "admin" : "public"}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const { data: units, error: unitsErr } = await supabase
    .from("units")
    .select("id, unit_number, title, description, order_index")
    .eq("subject_id", subjectId)
    .order("order_index", { ascending: true });

  if (unitsErr) throw new Error("Failed to fetch subject units");

  const visibleUnits = (units || []).filter((u) => u.unit_number !== 0);
  const unitIds = visibleUnits.map((u) => u.id);
  if (unitIds.length === 0) {
    cache.set(cacheKey, []);
    return [];
  }

  let contentQuery = supabase
    .from("content")
    .select(
      "id, unit_id, type, title, data, order_index, is_published, created_at"
    )
    .in("unit_id", unitIds)
    .order("order_index", { ascending: true });

  if (!includeUnpublished) {
    contentQuery = contentQuery.eq("is_published", true);
  }

  const { data: contents, error: contentErr } = await contentQuery;
  if (contentErr) throw new Error("Failed to fetch subject content");

  const contentByUnit = {};
  for (const u of units) {
    contentByUnit[u.id] = emptyContentBuckets();
  }

  for (const item of contents || []) {
    const bucket = contentByUnit[item.unit_id];
    if (!bucket || !bucket[item.type]) continue;
    pushContentItem(bucket, item);
  }

  const result = visibleUnits.map((u) => ({
    unit: {
      id: u.id,
      unitNumber: u.unit_number,
      title: u.title,
      description: u.description,
      orderIndex: u.order_index,
    },
    content: contentByUnit[u.id],
  }));

  cache.set(cacheKey, result);
  return result;
}

/**
 * Get a single content item by ID.
 *
 * @param {string} contentId
 * @returns {Promise<Object>}
 */
async function getContentById(contentId) {
  const cacheKey = `content_${contentId}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

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
    .eq("id", contentId)
    .eq("is_published", true)
    .single();

  if (error || !data) {
    throw new NotFoundError("Content");
  }

  const result = {
    id: data.id,
    type: data.type,
    title: data.title,
    data: data.data,
    orderIndex: data.order_index,
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
  };

  cache.set(cacheKey, result);
  return result;
}

/**
 * Get content filtered by type with pagination.
 *
 * @param {string} type - Content type enum value
 * @param {number} page
 * @param {number} limit
 * @returns {Promise<{data: Object[], pagination: Object}>}
 */
async function getContentByType(type, page, limit) {
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabase
    .from("content")
    .select("id, unit_id, type, title, data, order_index, created_at", {
      count: "exact",
    })
    .eq("type", type)
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error("Failed to fetch content");
  }

  return {
    data: data.map((item) => ({
      id: item.id,
      unitId: item.unit_id,
      type: item.type,
      title: item.title,
      data: item.data,
      orderIndex: item.order_index,
      createdAt: item.created_at,
    })),
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  };
}

/**
 * Invalidate all content-related caches.
 * Called after admin creates/updates/deletes content.
 */
function invalidateContentCache() {
  const keys = cache.keys();
  const contentKeys = keys.filter(
    (k) =>
      k.startsWith("content_") ||
      k.startsWith("unit_content_") ||
      k.startsWith("subject_content_")
  );
  cache.del(contentKeys);
}

/**
 * Invalidate subject-related caches.
 */
function invalidateSubjectCache() {
  const keys = cache.keys();
  const subjectKeys = keys.filter(
    (k) => k.startsWith("subjects_") || k.startsWith("subject_")
  );
  cache.del(subjectKeys);
}

module.exports = {
  getUnitContent,
  getSubjectContent,
  ensureSubjectContentUnit,
  getContentById,
  getContentByType,
  getSubjectUnitsContent,
  invalidateContentCache,
  invalidateSubjectCache,
  cache, // exported for direct use in controllers if needed
};
