/**
 * @fileoverview Content routes.
 *
 * GET /api/content/:id       — Get a single content item
 * GET /api/content?type=quiz — Get content by type with pagination
 * GET /api/content/:id/view — View file inline (e.g., PYQ PDF)
 * GET /api/content/:id/download — Download file (e.g., PYQ PDF)
 */

const { Router } = require("express");
const contentController = require("../controllers/content.controller");
const validate = require("../middleware/validation");
const validators = require("../utils/validators");

const router = Router();

// NOTE: The query-based route must come before the :id param route
// to avoid treating "?type=quiz" as an :id.
router.get(
  "/",
  validate(validators.getContentByType),
  contentController.getContentByType
);
router.get(
  "/:id/view",
  validate(validators.contentIdParam),
  contentController.viewFile
);
router.get(
  "/:id/download",
  validate(validators.contentIdParam),
  contentController.downloadFile
);
router.get(
  "/:id",
  validate(validators.contentIdParam),
  contentController.getContentById
);

module.exports = router;
