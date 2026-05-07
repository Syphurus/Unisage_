/**
 * @fileoverview Joi validation schemas for every API endpoint.
 * Each schema is exported as an object with optional `body`, `params`, and `query` keys.
 */

const Joi = require("joi");

// ──────────────────────────────────────────────
// Shared field definitions
// ──────────────────────────────────────────────

const uuidParam = Joi.object({
  id: Joi.string().uuid().required(),
});

const paginationQuery = {
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
};

const passwordField = Joi.string()
  .min(8)
  .max(128)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  .message(
    "Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number"
  );

function semesterRule(yearKey = "year", semesterKey = "semester") {
  return Joi.any()
    .custom((value, helpers) => {
      const year = helpers.state.ancestors[0]?.[yearKey];
      if (!year || !value) return value;

      const minSemester = (year - 1) * 2 + 1;
      const maxSemester = minSemester + 1;

      if (value < minSemester || value > maxSemester) {
        return helpers.error("any.invalid", {
          message: `Semester must be between ${minSemester} and ${maxSemester} for year ${year}`,
        });
      }

      return value;
    })
    .messages({
      "any.invalid": "Semester does not match the selected year",
    });
}

// ──────────────────────────────────────────────
// AUTH
// ──────────────────────────────────────────────

const signup = {
  body: Joi.object({
    email: Joi.string().email().required(),
    password: passwordField.required(),
    fullName: Joi.string().min(2).max(100).required(),
    collegeCode: Joi.string().max(20).required(),
    branchCode: Joi.string().max(20).required(),
    year: Joi.number().integer().min(1).max(4).required(),
    semester: Joi.number()
      .integer()
      .min(1)
      .max(8)
      .required()
      .custom((value, helpers) => {
        const year = helpers.state.ancestors[0]?.year;
        if (!year) return value;

        const minSemester = (year - 1) * 2 + 1;
        const maxSemester = minSemester + 1;

        if (value < minSemester || value > maxSemester) {
          return helpers.message(
            `Semester must be between ${minSemester} and ${maxSemester} for year ${year}`
          );
        }

        return value;
      }),
    enrollmentNumber: Joi.string().alphanum().max(20).allow("", null),
  }),
};

const login = {
  body: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),
};

const updateProfile = {
  body: Joi.object({
    fullName: Joi.string().min(2).max(100),
    collegeCode: Joi.string().max(20),
    branchCode: Joi.string().max(20),
    year: Joi.number().integer().min(1).max(4),
    semester: Joi.number()
      .integer()
      .min(1)
      .max(8)
      .custom((value, helpers) => {
        const year = helpers.state.ancestors[0]?.year;
        if (!year) return value;

        const minSemester = (year - 1) * 2 + 1;
        const maxSemester = minSemester + 1;

        if (value < minSemester || value > maxSemester) {
          return helpers.message(
            `Semester must be between ${minSemester} and ${maxSemester} for year ${year}`
          );
        }

        return value;
      }),
    enrollmentNumber: Joi.string().alphanum().max(20).allow("", null),
  }).min(1), // at least one field required
};

// ──────────────────────────────────────────────
// SUBJECTS
// ──────────────────────────────────────────────

const getSubjects = {
  query: Joi.object({
    branchId: Joi.string().uuid(),
    year: Joi.alternatives().try(
      Joi.number().integer().min(1).max(4),
      Joi.valid("all")
    ),
    semester: Joi.alternatives().try(
      Joi.number().integer().min(1).max(8),
      Joi.valid("all")
    ),
    ...paginationQuery,
  }),
};

const subjectIdParam = { params: uuidParam };

// ──────────────────────────────────────────────
// UNITS
// ──────────────────────────────────────────────

const unitIdParam = { params: uuidParam };

// ──────────────────────────────────────────────
// CONTENT
// ──────────────────────────────────────────────

const contentIdParam = { params: uuidParam };

const getContentByType = {
  query: Joi.object({
    type: Joi.string()
      .valid(
        "long_notes",
        "short_notes",
        "flashcard",
        "quiz",
        "paper_predictor",
        "exam_tips",
        "pyqs",
        "syllabus",
        "assignments"
      )
      .required(),
    ...paginationQuery,
  }),
};

// ──────────────────────────────────────────────
// PROGRESS
// ──────────────────────────────────────────────

const createProgress = {
  body: Joi.object({
    contentId: Joi.string().uuid().required(),
    timeSpent: Joi.number().integer().min(0).default(0),
  }),
};

const updateProgress = {
  params: uuidParam,
  body: Joi.object({
    completed: Joi.boolean(),
    timeSpent: Joi.number().integer().min(0),
  }).min(1),
};

const subjectProgressParam = {
  params: Joi.object({
    subjectId: Joi.string().uuid().required(),
  }),
};

// ──────────────────────────────────────────────
// QUIZ
// ──────────────────────────────────────────────

const submitQuiz = {
  body: Joi.object({
    contentId: Joi.string().uuid().required(),
    score: Joi.number().integer().min(0).required(),
    totalQuestions: Joi.number().integer().min(1).required(),
    answers: Joi.object().pattern(Joi.string(), Joi.any()).default({}),
    timeTaken: Joi.number().integer().min(0).allow(null),
  }),
};

const contentIdQueryParam = {
  params: Joi.object({
    contentId: Joi.string().uuid().required(),
  }),
};

// ──────────────────────────────────────────────
// BOOKMARKS
// ──────────────────────────────────────────────

const createBookmark = {
  body: Joi.object({
    contentId: Joi.string().uuid().required(),
  }),
};

const bookmarkIdParam = { params: uuidParam };

// ──────────────────────────────────────────────
// STUDY SESSIONS
// ──────────────────────────────────────────────

const startSession = {
  body: Joi.object({
    subjectId: Joi.string().uuid().required(),
  }),
};

const endSession = {
  params: uuidParam,
};

// ──────────────────────────────────────────────
// ADMIN
// ──────────────────────────────────────────────

const createSubject = {
  body: Joi.object({
    branchId: Joi.string().uuid().optional(),
    name: Joi.string().min(2).max(200).required(),
    code: Joi.string().min(2).max(20).required(),
    year: Joi.number().integer().min(1).max(4).required(),
    semester: Joi.number().integer().min(1).max(8).required(),
    credits: Joi.number().integer().min(0).max(10).allow(null),
    description: Joi.string().max(1000).allow("", null),
  }),
};

const updateSubject = {
  params: uuidParam,
  body: Joi.object({
    name: Joi.string().min(2).max(200),
    code: Joi.string().min(2).max(20),
    year: Joi.number().integer().min(1).max(4),
    semester: Joi.number().integer().min(1).max(8),
    credits: Joi.number().integer().min(0).max(10).allow(null),
    description: Joi.string().max(1000).allow("", null),
    isActive: Joi.boolean(),
  }).min(1),
};

const createUnit = {
  body: Joi.object({
    subjectId: Joi.string().uuid().required(),
    unitNumber: Joi.number().integer().min(1).required(),
    title: Joi.string().min(2).max(200).required(),
    description: Joi.string().max(1000).allow("", null),
    orderIndex: Joi.number().integer().min(0).default(0),
  }),
};

const updateUnit = {
  params: uuidParam,
  body: Joi.object({
    unitNumber: Joi.number().integer().min(1),
    title: Joi.string().min(2).max(200),
    description: Joi.string().max(1000).allow("", null),
    orderIndex: Joi.number().integer().min(0),
  }).min(1),
};

const createContent = {
  body: Joi.object({
    subjectId: Joi.string().uuid(),
    unitId: Joi.string().uuid(),
    type: Joi.string()
      .valid(
        "long_notes",
        "short_notes",
        "flashcard",
        "quiz",
        "paper_predictor",
        "exam_tips",
        "pyqs",
        "syllabus",
        "assignments"
      )
      .required(),
    title: Joi.string().max(300).allow("", null),
    data: Joi.alternatives()
      .try(Joi.object(), Joi.array(), Joi.string())
      .required(),
    orderIndex: Joi.number().integer().min(0).default(0),
    isPublished: Joi.boolean().default(false),
  }).custom((value, helpers) => {
    if (!value.subjectId && !value.unitId) {
      return helpers.message("subjectId or unitId is required");
    }
    return value;
  }),
};

const updateContent = {
  params: uuidParam,
  body: Joi.object({
    title: Joi.string().max(300).allow("", null),
    data: Joi.object(),
    orderIndex: Joi.number().integer().min(0),
    isPublished: Joi.boolean(),
  }).min(1),
};

const publishContent = {
  params: uuidParam,
  body: Joi.object({
    isPublished: Joi.boolean().required(),
  }),
};

const adminUserIdParam = { params: uuidParam };

const adminPermissionValues = [
  "dashboard.view",
  "subjects.manage",
  "content.manage",
  "users.manage",
  "team.manage",
  "analytics.view",
];

const adminUserQuery = {
  query: Joi.object({
    role: Joi.string().valid("student", "admin"),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
};

const adminUserBody = Joi.object({
  email: Joi.string().email().required(),
  fullName: Joi.string().min(2).max(100).required(),
  password: Joi.string().min(8).max(128).required(),
  role: Joi.string().valid("student", "admin").required(),
  year: Joi.number().integer().min(1).max(4).allow(null),
  semester: Joi.number().integer().min(1).max(8).allow(null),
  enrollmentNumber: Joi.string().alphanum().max(20).allow("", null),
  isActive: Joi.boolean().default(true),
  permissions: Joi.array()
    .items(Joi.string().valid(...adminPermissionValues))
    .default([]),
}).custom((value, helpers) => {
  if (value.role === "student") {
    if (!value.year || !value.semester) {
      return helpers.message(
        "year and semester are required for student users"
      );
    }
  }

  if (value.role === "admin" && value.permissions.length === 0) {
    return helpers.message("permissions are required for team members");
  }

  return value;
});

const adminUserUpdateBody = Joi.object({
  email: Joi.string().email(),
  fullName: Joi.string().min(2).max(100),
  password: Joi.string().min(8).max(128),
  role: Joi.string().valid("student", "admin"),
  year: Joi.number().integer().min(1).max(4).allow(null),
  semester: Joi.number().integer().min(1).max(8).allow(null),
  enrollmentNumber: Joi.string().alphanum().max(20).allow("", null),
  isActive: Joi.boolean(),
  permissions: Joi.array().items(Joi.string().valid(...adminPermissionValues)),
}).min(1);

module.exports = {
  // Auth
  signup,
  login,
  updateProfile,
  // Subjects
  getSubjects,
  subjectIdParam,
  // Units
  unitIdParam,
  // Content
  contentIdParam,
  getContentByType,
  // Progress
  createProgress,
  updateProgress,
  subjectProgressParam,
  // Quiz
  submitQuiz,
  contentIdQueryParam,
  // Bookmarks
  createBookmark,
  bookmarkIdParam,
  // Sessions
  startSession,
  endSession,
  // Admin
  createSubject,
  updateSubject,
  createUnit,
  updateUnit,
  createContent,
  updateContent,
  publishContent,
  adminUserIdParam,
  adminUserQuery,
  adminUserBody,
  adminUserUpdateBody,
};
