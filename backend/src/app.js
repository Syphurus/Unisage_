/**
 * @fileoverview Express application entry point.
 *
 * Responsibilities:
 *  1. Load environment variables (fail-fast if missing)
 *  2. Configure global middleware (security, parsing, logging, compression)
 *  3. Register all API routes
 *  4. Register health-check endpoint
 *  5. Register global error handler
 *  6. Start the HTTP server
 */

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const env = require("./config/env");
const logger = require("./utils/logger");
const { rateLimiter } = require("./middleware/rateLimiter");
const errorHandler = require("./middleware/errorHandler");

// Route imports
const authRoutes = require("./routes/auth.routes");
const subjectsRoutes = require("./routes/subjects.routes");
const unitsRoutes = require("./routes/units.routes");
const contentRoutes = require("./routes/content.routes");
const progressRoutes = require("./routes/progress.routes");
const quizRoutes = require("./routes/quiz.routes");
const bookmarksRoutes = require("./routes/bookmarks.routes");
const sessionsRoutes = require("./routes/sessions.routes");
const analyticsRoutes = require("./routes/analytics.routes");
const flashcardsRoutes = require("./routes/flashcards.routes");
const adminRoutes = require("./routes/admin.routes");
const metaRoutes = require("./routes/meta.routes");
const paymentRoutes = require("./modules/payments/payment.routes");
const adminPaymentRoutes = require("./modules/payments/admin.payment.routes");
const couponRoutes = require("./modules/coupons/coupon.routes");
const adminCouponRoutes = require("./modules/coupons/admin.coupon.routes");
const { startJobs } = require("./jobs");

// ──────────────────────────────────────────────
// Create Express app
// ──────────────────────────────────────────────
const app = express();

// Render and most production hosts sit behind a reverse proxy. Trust one hop
// so rate limits use the real client IP instead of grouping everyone together.
app.set("trust proxy", 1);

// ──────────────────────────────────────────────
// Global middleware
// ──────────────────────────────────────────────

// Security headers
// Allow local web/admin apps to embed PDF view endpoint in an iframe.
app.use(
  helmet({
    frameguard: false,
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        fontSrc: ["'self'", "https:", "data:"],
        formAction: ["'self'"],
        frameAncestors: [
          "'self'",
          "http://localhost:3001",
          "http://localhost:3002",
          "http://127.0.0.1:3001",
          "http://127.0.0.1:3002",
        ],
        imgSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        scriptSrc: ["'self'"],
        scriptSrcAttr: ["'none'"],
        styleSrc: ["'self'", "https:", "'unsafe-inline'"],
        upgradeInsecureRequests: [],
      },
    },
  })
);

// CORS — restrict to configured origins
app.use(
  cors({
    origin: env.CORS_ORIGINS,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "bypass-tunnel-reminder",
      "Idempotency-Key",
      "If-Match",
    ],
    exposedHeaders: ["Content-Disposition", "Content-Length", "Content-Type"],
    credentials: true,
    maxAge: 86400, // preflight cache: 24 hours
  })
);

// Compress responses (gzip)
app.use(compression());

// Parse JSON bodies (limit 10MB to avoid abuse, but enough for content)
app.use(express.json({ limit: "10mb" }));

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Global rate limiter
app.use(rateLimiter);

// Request logging middleware — logs method, path, status, and duration
app.use((req, res, next) => {
  const start = Date.now();

  // Log after response is sent
  res.on("finish", () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
    };

    if (res.statusCode >= 400) {
      logger.warn("Request completed with error", logData);
    } else if (env.isProduction && duration >= env.SLOW_REQUEST_MS) {
      logger.info("Slow request completed", logData);
    } else if (env.isDevelopment) {
      logger.info("Request completed", logData);
    }
  });

  next();
});

// ──────────────────────────────────────────────
// Health check endpoint (used by Railway for deployment)
// ──────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    environment: env.NODE_ENV,
  });
});

// ──────────────────────────────────────────────
// API Routes
// ──────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/subjects", subjectsRoutes);
app.use("/api/units", unitsRoutes);
app.use("/api/content", contentRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api/bookmarks", bookmarksRoutes);
app.use("/api/sessions", sessionsRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/flashcards", flashcardsRoutes);
app.use("/api/admin/coupons", adminCouponRoutes);
app.use("/api/admin/payments", adminPaymentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/meta", metaRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/payments", paymentRoutes);

// ──────────────────────────────────────────────
// 404 handler for unmatched routes
// ──────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: "The requested endpoint does not exist",
    },
  });
});

// ──────────────────────────────────────────────
// Global error handler (must be last)
// ──────────────────────────────────────────────
app.use(errorHandler);

// ──────────────────────────────────────────────
// Start server
// ──────────────────────────────────────────────
const PORT = env.PORT;

const server = app.listen(PORT, () => {
  logger.info(`🚀 UniSage API server running on port ${PORT}`, {
    environment: env.NODE_ENV,
    port: PORT,
  });
  const isPrimaryPm2Instance =
    process.env.NODE_APP_INSTANCE === undefined ||
    process.env.NODE_APP_INSTANCE === "0";

  if (env.RUN_BACKGROUND_JOBS && isPrimaryPm2Instance) {
    try {
      startJobs();
    } catch (err) {
      logger.error("Failed to start background jobs", { error: err.message });
    }
  }
});

server.keepAliveTimeout = 65_000;
server.headersTimeout = 70_000;
server.requestTimeout = 30_000;

function shutdown(signal) {
  logger.info(`Received ${signal}, shutting down gracefully`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled Promise Rejection", {
    reason: reason?.message || reason,
  });
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception", {
    message: err.message,
    stack: err.stack,
  });
  // Give logger time to flush, then exit
  setTimeout(() => process.exit(1), 1000);
});

module.exports = app;
