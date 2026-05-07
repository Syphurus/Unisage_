/**
 * @fileoverview Study session routes (all require authentication).
 *
 * POST /api/sessions/start    — Start a study session
 * PUT  /api/sessions/:id/end  — End a study session
 * GET  /api/sessions/stats    — Get study statistics
 */

const { Router } = require("express");
const sessionsController = require("../controllers/sessions.controller");
const authMiddleware = require("../middleware/auth");
const validate = require("../middleware/validation");
const validators = require("../utils/validators");

const router = Router();

// All session routes require authentication
router.use(authMiddleware);

router.post(
  "/start",
  validate(validators.startSession),
  sessionsController.startSession
);
router.put(
  "/:id/end",
  validate(validators.endSession),
  sessionsController.endSession
);
router.get("/stats", sessionsController.getStats);

module.exports = router;
