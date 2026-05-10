/**
 * @fileoverview Environment variable configuration and validation.
 * Loads variables from .env file and provides typed access with defaults.
 * Fails fast if required variables are missing.
 */

require("dotenv").config();

/**
 * @typedef {Object} EnvConfig
 * @property {string} NODE_ENV - Application environment
 * @property {number} PORT - Server port
 * @property {string} SUPABASE_URL - Supabase project URL
 * @property {string} SUPABASE_SERVICE_KEY - Supabase service role key
 * @property {string} SUPABASE_ANON_KEY - Supabase anonymous key
 * @property {string} JWT_SECRET - Secret for signing JWTs
 * @property {string} JWT_EXPIRES_IN - JWT expiration period
 * @property {string[]} CORS_ORIGINS - Allowed CORS origins
 * @property {number} RATE_LIMIT_WINDOW_MS - Rate limit window in ms
 * @property {number} RATE_LIMIT_MAX - Max requests per window
 * @property {string} LOG_LEVEL - Winston log level
 */

/** @type {string[]} Required environment variables that must be set */
const REQUIRED_VARS = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_KEY",
  "SUPABASE_ANON_KEY",
  "JWT_SECRET",
  "UPI_VPA",
  "UPI_PAYEE_NAME",
];

/**
 * Validates that all required environment variables are present.
 * @throws {Error} If any required variable is missing
 */
function validateEnv() {
  const missing = REQUIRED_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}\n` +
        "Copy .env.example to .env and fill in the values."
    );
  }
}

// Validate on module load — fail fast
validateEnv();

/** @type {EnvConfig} */
const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT, 10) || 3000,

  // Supabase
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,

  // JWT
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",

  // CORS — split comma-separated origins into an array
  CORS_ORIGINS: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
    : ["http://localhost:3000", "http://localhost:5173"],

  // Rate limiting
  RATE_LIMIT_WINDOW_MS:
    parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000, // 15 min
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || "info",

  // Payments — static UPI manual verification
  UPI_VPA: process.env.UPI_VPA,
  UPI_PAYEE_NAME: process.env.UPI_PAYEE_NAME,
  PAYMENT_PROOF_BUCKET: process.env.PAYMENT_PROOF_BUCKET || "payment-proofs",
  PAYMENT_INTENT_TTL_HOURS: parseInt(process.env.PAYMENT_INTENT_TTL_HOURS, 10) || 24,
  PAYMENT_SUBMISSION_TTL_HOURS:
    parseInt(process.env.PAYMENT_SUBMISSION_TTL_HOURS, 10) || 72,

  // Background jobs: defaults to true. Set RUN_BACKGROUND_JOBS=false on
  // additional instances when scaling horizontally to avoid duplicate runs.
  RUN_BACKGROUND_JOBS: process.env.RUN_BACKGROUND_JOBS !== "false",

  /** Helper: returns true when running in production */
  get isProduction() {
    return this.NODE_ENV === "production";
  },

  /** Helper: returns true when running in development */
  get isDevelopment() {
    return this.NODE_ENV === "development";
  },
};

module.exports = env;
