/**
 * @fileoverview Public metadata endpoints for colleges and branches.
 */

const { supabase } = require("../config/database");

async function getColleges(req, res, next) {
  try {
    const { data, error } = await supabase
      .from("colleges")
      .select("id, name, code, location")
      .order("name", { ascending: true });

    if (error) throw new Error("Failed to fetch colleges");

    res.json({ success: true, data: data || [] });
  } catch (err) {
    next(err);
  }
}

async function getBranches(req, res, next) {
  try {
    const { collegeCode } = req.query;

    let query = supabase
      .from("branches")
      .select("id, name, code, college_id");

    if (collegeCode) {
      const { data: college } = await supabase
        .from("colleges")
        .select("id")
        .eq("code", String(collegeCode).toLowerCase())
        .single();

      if (!college) return res.json({ success: true, data: [] });
      query = query.eq("college_id", college.id);
    }

    const { data, error } = await query.order("name", { ascending: true });
    if (error) throw new Error("Failed to fetch branches");

    res.json({ success: true, data: data || [] });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getColleges,
  getBranches,
};
