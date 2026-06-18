import { createHmac, timingSafeEqual } from "crypto"

export function verifyRazorpayCallbackSignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET
  if (!secret) {
    return false
  }

  const expected = createHmac("sha256", secret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex")

  const a = Buffer.from(expected, "utf8")
  const b = Buffer.from(razorpaySignature.trim(), "utf8")
  if (a.length !== b.length) {
    return false
  }

  return timingSafeEqual(a, b)
}

export function verifyRazorpayWebhookSignature(
  rawBody: string,
  signature: string
): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!secret) {
    return false
  }

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex")

  const a = Buffer.from(expected, "utf8")
  const b = Buffer.from(signature.trim(), "utf8")
  if (a.length !== b.length) {
    return false
  }

  return timingSafeEqual(a, b)
}
