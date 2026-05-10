/**
 * @fileoverview Flashcards controller — persists rating decisions
 * (forgot / shaky / confident) at the end of a review session.
 *
 * Reads remain on the existing /api/content + /api/units endpoints. This
 * file only handles writes for the new flashcard_reviews table.
 */

const ingest = require("../services/analytics.ingest.service");
const { NotFoundError } = require("../utils/errors");
const { supabase } = require("../config/database");

/**
 * POST /api/flashcards/reviews
 * Body validated by validators.flashcardReviews.
 * Verifies the content exists and is a flashcard before inserting.
 */
async function submitReviews(req, res, next) {
  try {
    const { contentId, reviews } = req.body;

    // Verify content exists and is the right type. Cheap targeted lookup.
    const { data: content, error } = await supabase
      .from("content")
      .select("id, type")
      .eq("id", contentId)
      .maybeSingle();

    if (error || !content) throw new NotFoundError("Content");
    if (content.type !== "flashcard") {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Content is not a flashcard deck",
        },
      });
    }

    const inserted = await ingest.recordFlashcardReviews(
      req.user.id,
      contentId,
      reviews
    );

    res.status(201).json({ success: true, data: { inserted } });
  } catch (err) {
    next(err);
  }
}

module.exports = { submitReviews };
