/**
 * @fileoverview Bookmark routes (all require authentication).
 *
 * GET    /api/bookmarks     — Get all bookmarks
 * POST   /api/bookmarks     — Add bookmark
 * DELETE /api/bookmarks/:id — Remove bookmark
 */

const { Router } = require("express");
const bookmarksController = require("../controllers/bookmarks.controller");
const authMiddleware = require("../middleware/auth");
const validate = require("../middleware/validation");
const validators = require("../utils/validators");

const router = Router();

// All bookmark routes require authentication
router.use(authMiddleware);

router.get("/", bookmarksController.getBookmarks);
router.post(
  "/",
  validate(validators.createBookmark),
  bookmarksController.addBookmark
);
router.delete(
  "/:id",
  validate(validators.bookmarkIdParam),
  bookmarksController.removeBookmark
);

module.exports = router;
