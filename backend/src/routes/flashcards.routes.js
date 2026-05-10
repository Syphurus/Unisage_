/**
 * @fileoverview Flashcard write routes (all require authentication).
 *
 * POST /api/flashcards/reviews — bulk-insert a session's worth of reviews
 *
 * Reads (deck content, listing) continue to live on /api/content and
 * /api/units — this file only adds the missing write path.
 */

const { Router } = require("express");
const flashcardsController = require("../controllers/flashcards.controller");
const authMiddleware = require("../middleware/auth");
const validate = require("../middleware/validation");
const validators = require("../utils/validators");

const router = Router();

router.use(authMiddleware);

router.post(
  "/reviews",
  validate(validators.flashcardReviews),
  flashcardsController.submitReviews
);

module.exports = router;
