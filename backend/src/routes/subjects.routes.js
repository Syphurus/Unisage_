/**
 * @fileoverview Subject routes.
 *
 * GET /api/subjects           — List subjects (filter by ?year=&semester=)
 * GET /api/subjects/:id       — Get subject with units
 * GET /api/subjects/:id/units — Get all units for a subject
 */

const { Router } = require("express");
const subjectsController = require("../controllers/subjects.controller");
const validate = require("../middleware/validation");
const validators = require("../utils/validators");
const optionalAuth = require("../middleware/optionalAuth");
const { attachEntitlements } = require("../modules/entitlements/entitlement.middleware");

const router = Router();

// Attach user context when token is present, but keep endpoints public.
router.use(optionalAuth);
// Non-blocking: attaches req.entitlements so controllers can strip premium content.
router.use(attachEntitlements(["predictor"]));

router.get(
  "/",
  validate(validators.getSubjects),
  subjectsController.getSubjects
);
router.get(
  "/:id",
  validate(validators.subjectIdParam),
  subjectsController.getSubjectById
);
router.get(
  "/:id/units",
  validate(validators.subjectIdParam),
  subjectsController.getSubjectUnits
);
router.get(
  "/:id/units/content",
  validate(validators.subjectIdParam),
  subjectsController.getSubjectUnitsContent
);
router.get(
  "/:id/content",
  validate(validators.subjectIdParam),
  subjectsController.getSubjectContent
);

module.exports = router;
