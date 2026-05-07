const { Router } = require("express");
const metaController = require("../controllers/meta.controller");

const router = Router();

router.get("/colleges", metaController.getColleges);
router.get("/branches", metaController.getBranches);

module.exports = router;
