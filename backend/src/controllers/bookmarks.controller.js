/**
 * @fileoverview Bookmarks controller — handles adding, listing, and removing bookmarks.
 */

const { supabase } = require("../config/database");
const { NotFoundError, ConflictError } = require("../utils/errors");

/**
 * GET /api/bookmarks
 * Get all bookmarks for the current user.
 */
async function getBookmarks(req, res, next) {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from("bookmarks")
      .select(
        `
        id, created_at,
        content!bookmarks_content_id_fkey(
          id, type, title,
          units!content_unit_id_fkey(
            id, title, unit_number,
            subjects!units_subject_id_fkey(id, name, code)
          )
        )
      `
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw new Error("Failed to fetch bookmarks");

    res.json({
      success: true,
      data: (data || []).map((b) => ({
        id: b.id,
        createdAt: b.created_at,
        content: b.content
          ? {
              id: b.content.id,
              type: b.content.type,
              title: b.content.title,
              unit: b.content.units
                ? {
                    id: b.content.units.id,
                    title: b.content.units.title,
                    unitNumber: b.content.units.unit_number,
                    subject: b.content.units.subjects || null,
                  }
                : null,
            }
          : null,
      })),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/bookmarks
 * Add a bookmark.
 * Body: { contentId }
 */
async function addBookmark(req, res, next) {
  try {
    const userId = req.user.id;
    const { contentId } = req.body;

    // Verify content exists
    const { data: content, error: contentErr } = await supabase
      .from("content")
      .select("id")
      .eq("id", contentId)
      .single();

    if (contentErr || !content) throw new NotFoundError("Content");

    // Check for existing bookmark
    const { data: existing } = await supabase
      .from("bookmarks")
      .select("id")
      .eq("user_id", userId)
      .eq("content_id", contentId)
      .single();

    if (existing) throw new ConflictError("Content is already bookmarked");

    const { data, error } = await supabase
      .from("bookmarks")
      .insert({
        user_id: userId,
        content_id: contentId,
      })
      .select()
      .single();

    if (error) throw new Error("Failed to add bookmark");

    res.status(201).json({
      success: true,
      data: {
        id: data.id,
        contentId: data.content_id,
        createdAt: data.created_at,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/bookmarks/:id
 * Remove a bookmark.
 */
async function removeBookmark(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Verify ownership
    const { data: bookmark, error: findErr } = await supabase
      .from("bookmarks")
      .select("id")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (findErr || !bookmark) throw new NotFoundError("Bookmark");

    const { error } = await supabase.from("bookmarks").delete().eq("id", id);

    if (error) throw new Error("Failed to remove bookmark");

    res.json({
      success: true,
      data: { message: "Bookmark removed successfully" },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getBookmarks, addBookmark, removeBookmark };
