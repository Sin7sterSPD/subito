import { createHmac, timingSafeEqual } from "crypto"

/**
 * Verifies a payment callback signature (HyperSDK / Juspay-style order|payment HMAC).
 * Production: set JUSPAY_RESPONSE_KEY to the gateway response-signing secret only
 * (do not reuse JUSPAY_API_KEY — it is for server API calls and may differ).
 */
export function verifyPaymentResponseSignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const secret = process.env.JUSPAY_RESPONSE_KEY

  if (!secret) {
    const env = process.env.NODE_ENV
    const allowUnsigned =
      process.env.JUSPAY_ALLOW_UNSIGNED_VERIFY === "true" &&
      (env === "development" || env === "test")
    return allowUnsigned
  }

  const expected = createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex")

  const a = Buffer.from(expected, "utf8")
  const b = Buffer.from(signature.trim(), "utf8")
  if (a.length !== b.length) {
    return false
  }
  return timingSafeEqual(a, b)
}
