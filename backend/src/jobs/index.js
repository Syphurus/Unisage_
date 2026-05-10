/**
 * @fileoverview Background job scheduler.
 *
 * Lightweight setInterval-based runner. No external scheduler needed at this
 * scale. Each job is independent and idempotent (re-running is safe).
 *
 * Multi-instance note: when scaling horizontally, gate this with a leader
 * flag (env `RUN_BACKGROUND_JOBS=true` on exactly one instance) to avoid
 * duplicate runs.
 */

const env = require("../config/env");
const logger = require("../utils/logger");
const { supabase } = require("../config/database");
const entitlementService = require("../modules/entitlements/entitlement.service");
const audit = require("../modules/audit/audit.service");

const ONE_MINUTE = 60 * 1000;
const FIFTEEN_MINUTES = 15 * ONE_MINUTE;
const ONE_HOUR = 60 * ONE_MINUTE;

let consecutiveFailures = 0;

async function safeRpc(fn, name) {
  try {
    const { data, error } = await supabase.rpc(fn);
    if (error) throw error;
    consecutiveFailures = 0;
    return data;
  } catch (err) {
    consecutiveFailures++;
    logger.error(`job ${name} failed`, {
      error: err.message,
      consecutiveFailures,
    });
    if (consecutiveFailures >= 3) {
      audit.security({
        severity: "critical",
        category: "background_job",
        metadata: { job: name, consecutiveFailures, message: err.message },
      });
    }
    return null;
  }
}

async function expirePendingIntents() {
  const count = await safeRpc("expire_stale_intents", "expire_stale_intents");
  if (count) logger.info("expired stale intents", { count });
}

async function expirePendingSubmissions() {
  const count = await safeRpc("expire_stale_submissions", "expire_stale_submissions");
  if (count) logger.info("expired stale submissions", { count });
}

async function expireEntitlements() {
  const count = await safeRpc("expire_old_entitlements", "expire_old_entitlements");
  if (count) {
    logger.info("recorded entitlement expiry events", { count });
    entitlementService.invalidateAll();
  }
}

async function purgeIdempotency() {
  const count = await safeRpc("purge_expired_idempotency_keys", "purge_expired_idempotency_keys");
  if (count) logger.info("purged idempotency keys", { count });
}

function startJobs() {
  // Respect explicit opt-out (multi-instance).
  if (env.RUN_BACKGROUND_JOBS === false) {
    logger.info("background jobs disabled by env");
    return;
  }

  logger.info("starting background jobs");

  // Stagger startup to avoid hitting DB simultaneously on cold boot.
  setTimeout(() => {
    expirePendingIntents().catch(() => {});
    setInterval(expirePendingIntents, FIFTEEN_MINUTES);
  }, 5_000);

  setTimeout(() => {
    expirePendingSubmissions().catch(() => {});
    setInterval(expirePendingSubmissions, ONE_HOUR);
  }, 10_000);

  setTimeout(() => {
    expireEntitlements().catch(() => {});
    setInterval(expireEntitlements, FIFTEEN_MINUTES);
  }, 15_000);

  setTimeout(() => {
    purgeIdempotency().catch(() => {});
    setInterval(purgeIdempotency, ONE_HOUR);
  }, 20_000);
}

module.exports = { startJobs };
