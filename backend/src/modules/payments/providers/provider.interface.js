/**
 * @fileoverview Payment provider contract.
 *
 * The system supports manual UPI today. Future gateways (Razorpay, Cashfree,
 * Stripe, …) implement this same interface so the entitlement, admin, and
 * frontend layers don't change.
 */

/**
 * @typedef {Object} CreateIntentInput
 * @property {string} userId
 * @property {Object} plan        plans row
 * @property {string} referenceCode  short opaque ID returned to user
 *
 * @typedef {Object} CreateIntentResult
 * @property {Object} instructions   provider-specific instructions for the UI
 * @property {string} provider       e.g. 'static_upi'
 */

class PaymentProvider {
  /** Machine identifier. */
  get id() {
    throw new Error("provider.id must be overridden");
  }

  /**
   * Whether this provider relies on manual admin verification.
   * Static UPI = true; gateways with webhooks = false.
   */
  get requiresManualVerification() {
    return true;
  }

  /**
   * Build instructions the frontend renders (QR payload, amount, refcode).
   * Pure function — must not perform DB writes; that's the service's job.
   * @param {CreateIntentInput} input
   * @returns {CreateIntentResult}
   */
  // eslint-disable-next-line no-unused-vars
  createIntentInstructions(input) {
    throw new Error("createIntentInstructions must be overridden");
  }

  /**
   * Verify a webhook from the provider. Static UPI has none — throws.
   */
  // eslint-disable-next-line no-unused-vars
  verifyWebhook(_req) {
    throw new Error("This provider does not support webhooks");
  }
}

module.exports = PaymentProvider;
