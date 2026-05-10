/**
 * @fileoverview Capability registry — the single source of truth for premium
 * scopes and the protected surfaces they unlock. Adding a new premium feature
 * means adding a row here, not scattering checks across the codebase.
 */

const SCOPES = Object.freeze({
  predictor: {
    scope: "predictor",
    description: "Paper Predictor access",
  },
  analysis: {
    scope: "analysis",
    description: "Study Analysis dashboard access",
  },
});

/** Returns true if the given string is a known premium scope. */
function isScope(s) {
  return typeof s === "string" && Object.prototype.hasOwnProperty.call(SCOPES, s);
}

function listScopes() {
  return Object.keys(SCOPES);
}

module.exports = { SCOPES, isScope, listScopes };
