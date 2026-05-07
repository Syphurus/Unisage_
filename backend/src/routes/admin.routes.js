/**
 * @fileoverview Admin routes (require authentication + admin role).
 *
 * Subjects:
 *   POST   /api/admin/subjects      — Create subject
 *   PUT    /api/admin/subjects/:id  — Update subject
 *   DELETE /api/admin/subjects/:id  — Delete subject
 *
 * Units:
 *   POST   /api/admin/units         — Create unit
 *   PUT    /api/admin/units/:id     — Update unit
 *   DELETE /api/admin/units/:id     — Delete unit
 *
 * Content:
 *   POST   /api/admin/content            — Create content
 *   PUT    /api/admin/content/:id        — Update content
 *   DELETE /api/admin/content/:id        — Delete content
 *   PUT    /api/admin/content/:id/publish — Publish/unpublish
 *
 * Users & Analytics:
 *   GET    /api/admin/users      — List all users
 *   GET    /api/admin/analytics  — Platform analytics
 */

const { Router } = require("express");
const adminController = require("../controllers/admin.controller");
const authMiddleware = require("../middleware/auth");
const adminAuth = require("../middleware/adminAuth");
const permissionAuth = require("../middleware/permissionAuth");
const validate = require("../middleware/validation");
const validators = require("../utils/validators");
const multer = require("multer");

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
});

// All admin routes require auth + admin role
router.use(authMiddleware);
router.use(adminAuth);

// ── Subjects ──
router.post(
  "/subjects",
  permissionAuth(["subjects.manage"]),
  validate(validators.createSubject),
  adminController.createSubject
);
router.put(
  "/subjects/:id",
  permissionAuth(["subjects.manage"]),
  validate(validators.updateSubject),
  adminController.updateSubject
);
router.delete(
  "/subjects/:id",
  permissionAuth(["subjects.manage"]),
  validate(validators.subjectIdParam),
  adminController.deleteSubject
);

// ── Units ──
router.post(
  "/units",
  permissionAuth(["subjects.manage"]),
  validate(validators.createUnit),
  adminController.createUnit
);
router.put(
  "/units/:id",
  permissionAuth(["subjects.manage"]),
  validate(validators.updateUnit),
  adminController.updateUnit
);
router.delete(
  "/units/:id",
  permissionAuth(["subjects.manage"]),
  validate(validators.unitIdParam),
  adminController.deleteUnit
);

// ── Content ──
router.post(
  "/content",
  permissionAuth(["content.manage"]),
  upload.single("file"),
  validate(validators.createContent),
  adminController.createContent
);
router.post(
  "/content/format-pdf",
  permissionAuth(["content.manage"]),
  upload.single("file"),
  adminController.formatPdfContent
);
router.put(
  "/content/:id",
  permissionAuth(["content.manage"]),
  upload.single("file"),
  validate(validators.updateContent),
  adminController.updateContent
);
router.delete(
  "/content/:id",
  permissionAuth(["content.manage"]),
  validate(validators.contentIdParam),
  adminController.deleteContent
);
router.put(
  "/content/:id/publish",
  permissionAuth(["content.manage"]),
  validate(validators.publishContent),
  adminController.publishContent
);

// Admin view: get ALL content for a unit (including unpublished)
router.get(
  "/units/:id/content",
  permissionAuth(["content.manage", "subjects.manage"]),
  adminController.getUnitContentAdmin
);
router.get(
  "/subjects/:id/units/content",
  permissionAuth(["content.manage", "subjects.manage"]),
  validate(validators.subjectIdParam),
  adminController.getSubjectUnitsContentAdmin
);
router.get(
  "/subjects/:id/content",
  permissionAuth(["content.manage", "subjects.manage"]),
  validate(validators.subjectIdParam),
  adminController.getSubjectContentAdmin
);

// Admin view: get a single content item (including unpublished)
router.get(
  "/content/:id",
  permissionAuth(["content.manage", "subjects.manage"]),
  adminController.getContentAdmin
);

// ── Users ──
router.get(
  "/users",
  permissionAuth(["users.manage"]),
  validate(validators.adminUserQuery),
  adminController.getStudentUsers
);
router.post(
  "/users",
  permissionAuth(["users.manage"]),
  validate(validators.adminUserBody),
  adminController.createStudentUser
);
router.put(
  "/users/:id",
  permissionAuth(["users.manage"]),
  validate(validators.adminUserIdParam),
  validate(validators.adminUserUpdateBody),
  adminController.updateStudentUser
);
router.delete(
  "/users/:id",
  permissionAuth(["users.manage"]),
  validate(validators.adminUserIdParam),
  adminController.deleteStudentUser
);

// ── Team ──
router.get(
  "/team",
  permissionAuth(["team.manage"]),
  validate(validators.adminUserQuery),
  adminController.getTeamMembers
);
router.post(
  "/team",
  permissionAuth(["team.manage"]),
  validate(validators.adminUserBody),
  adminController.createTeamMember
);
router.put(
  "/team/:id",
  permissionAuth(["team.manage"]),
  validate(validators.adminUserIdParam),
  validate(validators.adminUserUpdateBody),
  adminController.updateTeamMember
);
router.delete(
  "/team/:id",
  permissionAuth(["team.manage"]),
  validate(validators.adminUserIdParam),
  adminController.deleteTeamMember
);

// ── Analytics ──
router.get(
  "/analytics",
  permissionAuth(["analytics.view"]),
  adminController.getAnalytics
);

module.exports = router;
