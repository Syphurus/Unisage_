/**
 * @fileoverview Quiz routes (all require authentication).
 *
 * POST /api/quiz/attempt                     — Submit quiz attempt
 * GET  /api/quiz/attempts/user               — Get user's quiz attempts
 * GET  /api/quiz/attempts/content/:contentId — Get attempts for a content item
 */

const { Router } = require("express");
const quizController = require("../controllers/quiz.controller");
const authMiddleware = require("../middleware/auth");
const validate = require("../middleware/validation");
const validators = require("../utils/validators");

const router = Router();

// All quiz routes require authentication
router.use(authMiddleware);

router.post(
  "/attempt",
  validate(validators.submitQuiz),
  quizController.submitAttempt
);
router.get("/attempts/user", quizController.getUserAttempts);
router.get(
  "/attempts/content/:contentId",
  validate(validators.contentIdQueryParam),
  quizController.getContentAttempts
);

module.exports = router;
