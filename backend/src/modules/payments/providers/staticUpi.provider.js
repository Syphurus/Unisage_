/**
 * @fileoverview Static UPI provider.
 *
 * Renders a UPI URI the frontend turns into a QR. No webhook, no automatic
 * verification. Approval is always manual via the admin queue.
 */

const QRCode = require("qrcode");
const PaymentProvider = require("./provider.interface");
const env = require("../../../config/env");

class StaticUpiProvider extends PaymentProvider {
  get id() {
    return "static_upi";
  }

  get requiresManualVerification() {
    return true;
  }

  /**
   * UPI deep link format (spec'd by NPCI; supported by GPay/PhonePe/Paytm).
   *   upi://pay?pa=<vpa>&pn=<payee>&am=<amount>&cu=INR&tn=<note>
   * The transaction note (`tn`) carries our reference code so admins can
   * reconcile against the bank statement.
   */
  async createIntentInstructions({ plan, referenceCode }) {
    const amountInr = (plan.amount_inr_paise / 100).toFixed(2);
    const params = new URLSearchParams({
      pa: env.UPI_VPA,
      pn: env.UPI_PAYEE_NAME,
      am: amountInr,
      cu: "INR",
      tn: `UNISAGE-${referenceCode}`,
    });
    const upiUri = `upi://pay?${params.toString()}`;

    // Generate QR as a PNG data URL server-side. No third-party calls; the
    // frontend just <img src={qrImageDataUrl}>.
    const qrImageDataUrl = await QRCode.toDataURL(upiUri, {
      width: 320,
      margin: 1,
      errorCorrectionLevel: "M",
    });

    return {
      provider: this.id,
      instructions: {
        upiUri,
        qrImageDataUrl,
        vpa: env.UPI_VPA,
        payeeName: env.UPI_PAYEE_NAME,
        amountInr,
        amountPaise: plan.amount_inr_paise,
        referenceCode,
        note: `UNISAGE-${referenceCode}`,
        userMessage:
          "Scan the QR with any UPI app, pay the exact amount, then return here and submit your UTR. Approval is manual and may take up to 24 hours.",
      },
    };
  }

  verifyWebhook() {
    throw new Error(
      "Static UPI has no webhook. Approval happens via admin verification."
    );
  }
}

module.exports = new StaticUpiProvider();
