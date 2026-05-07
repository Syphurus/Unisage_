/**
 * @fileoverview Progress routes (all require authentication).
 *
 * GET  /api/progress                    — Get all progress
 * GET  /api/progress/subject/:subjectId — Get subject progress
 * POST /api/progress                    — Mark content completed
 * PUT  /api/progress/:id                — Update progress entry
 */

const { Router } = require("express");
const progressController = require("../controllers/progress.controller");
const authMiddleware = require("../middleware/auth");
const validate = require("../middleware/validation");
const validators = require("../utils/validators");

const router = Router();

// All progress routes require authentication
router.use(authMiddleware);

router.get("/", progressController.getProgress);
router.get(
  "/subject/:subjectId",
  validate(validators.subjectProgressParam),
  progressController.getSubjectProgress
);
router.post(
  "/",
  validate(validators.createProgress),
  progressController.createProgress
);
router.put(
  "/:id",
  validate(validators.updateProgress),
  progressController.updateProgress
);

module.exports = router;
