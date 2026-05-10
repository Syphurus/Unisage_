/**
 * @fileoverview Helpers to strip premium content from response payloads
 * when the requesting user lacks the relevant entitlement. The backend
 * never trusts the frontend to do this filtering — it happens server-side.
 */

const PREDICTOR_TYPE = "paper_predictor";

/**
 * Given a "grouped by type" content map (`{ paper_predictor: [...], quiz: [...] }`),
 * return a copy with `paper_predictor` removed when not entitled.
 */
function stripPremiumGrouped(grouped, entitlements) {
  if (!grouped || typeof grouped !== "object") return grouped;
  if (entitlements && entitlements.predictor) return grouped;
  const { [PREDICTOR_TYPE]: _omit, ...rest } = grouped;
  return rest;
}

/**
 * If a content row has `type === 'paper_predictor'` and the user is not
 * entitled, return true (caller should 402).
 */
function isLockedPredictorContent(content, entitlements) {
  if (!content || content.type !== PREDICTOR_TYPE) return false;
  return !(entitlements && entitlements.predictor);
}

module.exports = {
  PREDICTOR_TYPE,
  stripPremiumGrouped,
  isLockedPredictorContent,
};
