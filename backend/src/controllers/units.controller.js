/**
 * @fileoverview Units controller — handles getting a single unit and its content.
 */

const { supabase } = require("../config/database");
const { NotFoundError } = require("../utils/errors");
const contentService = require("../services/content.service");
const { stripPremiumGrouped } = require("../modules/entitlements/strip");

/**
 * GET /api/units/:id
 * Get a single unit by ID.
 */
async function getUnitById(req, res, next) {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("units")
      .select(
        `
        id, unit_number, title, description, order_index, created_at,
        subjects!units_subject_id_fkey(id, name, code, year, semester)
      `
      )
      .eq("id", id)
      .single();

    if (error || !data) throw new NotFoundError("Unit");

    res.json({
      success: true,
      data: {
        id: data.id,
        unitNumber: data.unit_number,
        title: data.title,
        description: data.description,
        orderIndex: data.order_index,
        subject: data.subjects
          ? {
              id: data.subjects.id,
              name: data.subjects.name,
              code: data.subjects.code,
              year: data.subjects.year,
              semester: data.subjects.semester,
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
 * GET /api/units/:id/content
 * Get all published content for a unit, grouped by type.
 */
async function getUnitContent(req, res, next) {
  try {
    const { id } = req.params;

    // Verify unit exists
    const { data: unit, error: unitErr } = await supabase
      .from("units")
      .select("id, title")
      .eq("id", id)
      .single();

    if (unitErr || !unit) throw new NotFoundError("Unit");

    const grouped = await contentService.getUnitContent(id);

    res.json({
      success: true,
      data: {
        unit: { id: unit.id, title: unit.title },
        content: stripPremiumGrouped(grouped, req.entitlements),
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getUnitById, getUnitContent };
