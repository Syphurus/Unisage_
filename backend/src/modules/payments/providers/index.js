/**
 * @fileoverview Provider registry. The service layer talks to a provider
 * via this lookup so swapping the active provider (or supporting multiple
 * in parallel) is a config change.
 */

const staticUpi = require("./staticUpi.provider");

const providers = {
  [staticUpi.id]: staticUpi,
};

/** Resolve a provider by id. Throws on unknown ids. */
function get(id) {
  const p = providers[id];
  if (!p) throw new Error(`Unknown payment provider: ${id}`);
  return p;
}

/** Default provider for new intents (config-driven later if needed). */
function getDefault() {
  return staticUpi;
}

module.exports = { get, getDefault };
