/**
 * @fileoverview Winston logger configuration with daily rotate files.
 * Logs are written to:
 *  - Console (colorized in development)
 *  - logs/error.log   (errors only)
 *  - logs/combined.log (all levels)
 * Files are rotated daily and kept for 14 days.
 */

const winston = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");
const path = require("path");
const env = require("../config/env");

const LOG_DIR = path.join(__dirname, "../../logs");

/** Custom format: timestamp + level + message + metadata */
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `${timestamp} [${level.toUpperCase()}]: ${stack || message}${metaStr}`;
  })
);

/** Daily rotate transport for error-level logs */
const errorRotate = new DailyRotateFile({
  filename: path.join(LOG_DIR, "error-%DATE%.log"),
  datePattern: "YYYY-MM-DD",
  level: "error",
  maxFiles: "14d",
  maxSize: "10m",
  zippedArchive: true,
});

/** Daily rotate transport for all logs */
const combinedRotate = new DailyRotateFile({
  filename: path.join(LOG_DIR, "combined-%DATE%.log"),
  datePattern: "YYYY-MM-DD",
  maxFiles: "14d",
  maxSize: "20m",
  zippedArchive: true,
});

/** Console transport — colorized in development */
const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.simple()
  ),
});

const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: logFormat,
  transports: [errorRotate, combinedRotate],
  // Don't exit on uncaught exceptions — let the process manager handle restarts
  exitOnError: false,
});

// Add console output in non-production environments
if (!env.isProduction) {
  logger.add(consoleTransport);
}

module.exports = logger;
