/**
 * @fileoverview Entitlement evaluation service.
 *
 * Backend is the single source of truth. Every protected request resolves
 * entitlement state from the database. A short in-process cache is used to
 * avoid hammering the DB, and is invalidated on writes.
 */

const NodeCache = require("node-cache");
const { supabase } = require("../../config/database");
const { isScope } = require("./capability.registry");

// 30s TTL: short enough that revocation propagates quickly across a single
// node, long enough to absorb bursts of premium-route hits during a page load.
// On multi-instance deployments, swap this for Redis (interface unchanged).
const cache = new NodeCache({ stdTTL: 30, checkperiod: 60, useClones: false });

function cacheKey(userId, scope) {
  return `${userId}:${scope}`;
}

function listCacheKey(userId) {
  return `${userId}:list`;
}

/**
 * Returns the active entitlement row for (userId, scope) or null.
 * "Active" = not revoked, not expired.
 */
async function getActive(userId, scope) {
  if (!isScope(scope)) return null;

  const key = cacheKey(userId, scope);
  const hit = cache.get(key);
  if (hit !== undefined) return hit;

  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("entitlements")
    .select("id, user_id, scope, source_payment_id, granted_at, expires_at")
    .eq("user_id", userId)
    .eq("scope", scope)
    .is("revoked_at", null)
    .gt("expires_at", nowIso)
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    // Fail closed: an error fetching entitlement state must NOT be interpreted as access.
    throw error;
  }

  cache.set(key, data || null);
  return data || null;
}

/**
 * Returns { scope, expiresAt } for every active scope the user holds.
 * Useful for the /me/entitlements endpoint and the frontend gate.
 */
async function listActive(userId) {
  const key = listCacheKey(userId);
  const hit = cache.get(key);
  if (hit !== undefined) return hit;

  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("entitlements")
    .select("scope, expires_at")
    .eq("user_id", userId)
    .is("revoked_at", null)
    .gt("expires_at", nowIso)
    .order("expires_at", { ascending: false });

  if (error) throw error;

  // Collapse to one row per scope, keeping the latest expiry.
  const byScope = new Map();
  for (const row of data || []) {
    if (!byScope.has(row.scope)) byScope.set(row.scope, row.expires_at);
  }
  const rows = Array.from(byScope, ([scope, expiresAt]) => ({
    scope,
    expiresAt,
  }));
  cache.set(key, rows);
  return rows;
}

/**
 * Drop cache entries for a user. Called on grant/revoke/expire.
 */
function invalidateUser(userId) {
  for (const scope of cache.keys()) {
    if (scope.startsWith(`${userId}:`)) cache.del(scope);
  }
}

function invalidateAll() {
  cache.flushAll();
}

module.exports = {
  getActive,
  listActive,
  invalidateUser,
  invalidateAll,
};
