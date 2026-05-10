/**
 * @fileoverview Unit routes.
 *
 * GET /api/units/:id         — Get a single unit
 * GET /api/units/:id/content — Get all content for a unit (grouped by type)
 */

const { Router } = require("express");
const unitsController = require("../controllers/units.controller");
const validate = require("../middleware/validation");
const validators = require("../utils/validators");
const optionalAuth = require("../middleware/optionalAuth");
const { attachEntitlements } = require("../modules/entitlements/entitlement.middleware");

const router = Router();

// Public reads, but we attach entitlement state to support premium-content stripping.
router.use(optionalAuth);
router.use(attachEntitlements(["predictor"]));

router.get(
  "/:id",
  validate(validators.unitIdParam),
  unitsController.getUnitById
);
router.get(
  "/:id/content",
  validate(validators.unitIdParam),
  unitsController.getUnitContent
);

module.exports = router;
