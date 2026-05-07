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

const router = Router();

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
