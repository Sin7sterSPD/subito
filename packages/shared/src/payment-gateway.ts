import "./env.js"
import Razorpay from "razorpay"
import { createHmac, timingSafeEqual } from "crypto"

export type GatewayOrderStatus = "CHARGED" | "FAILED" | "PENDING"

export type FetchGatewayOrderStatusResult = {
  status: GatewayOrderStatus
  gatewayUnreachable: boolean
}

export type CreateGatewayOrderInput = {
  orderId: string
  amount: string
  currency?: string
  customerId: string
  customerPhone: string
  customerEmail: string
  description?: string
}

type CreateGatewayOrderSuccess = {
  success: true
  orderId: string
  gatewayOrderId: string
  gatewayData: Record<string, unknown>
}

type CreateGatewayOrderFailure = {
  success: false
  error: string
}

export type CreateGatewayOrderResult =
  | CreateGatewayOrderSuccess
  | CreateGatewayOrderFailure

export type CreateGatewayRefundResult =
  | { success: true; refundId?: string; raw?: Record<string, unknown> }
  | { success: false; error: string }

type RazorpayOrderStatus = "created" | "attempted" | "paid"
type RazorpayPaymentStatus =
  | "created"
  | "authorized"
  | "captured"
  | "failed"
  | "refunded"

function gatewayTimeoutMs(): number {
  const raw = process.env.RAZORPAY_GATEWAY_TIMEOUT_MS
  const n = raw ? Number.parseInt(raw, 10) : 12_000
  return Number.isFinite(n) && n > 0 ? Math.min(n, 60_000) : 12_000
}

function getRazorpayClient(): Razorpay | null {
  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET

  if (!keyId || !keySecret) {
    return null
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  })
}

function amountToSubunits(amountStr: string): number | null {
  const parsed = Number.parseFloat(amountStr)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null
  }

  return Math.round(parsed * 100)
}

function withTimeout<T>(promise: Promise<T>, timeoutMs = gatewayTimeoutMs()) {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null

  const timeout = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(
      () => reject(new Error("Payment gateway request timed out")),
      timeoutMs
    )
  })

  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle)
    }
  })
}

export async function createGatewayOrder(
  input: CreateGatewayOrderInput
): Promise<CreateGatewayOrderResult> {
  const client = getRazorpayClient()
  if (!client) {
    return {
      success: false,
      error:
        "Razorpay not configured (RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET missing)",
    }
  }

  const amount = amountToSubunits(input.amount)
  if (!amount) {
    return { success: false, error: "Invalid order amount" }
  }

  try {
    const order = (await withTimeout(
      client.orders.create({
        amount,
        currency: input.currency ?? "INR",
        receipt: input.orderId,
        notes: {
          orderId: input.orderId,
          customerId: input.customerId,
          customerPhone: input.customerPhone,
          customerEmail: input.customerEmail,
          description: input.description ?? "Subito booking payment",
        },
      })
    )) as unknown as Record<string, unknown>

    return {
      success: true,
      orderId: input.orderId,
      gatewayOrderId: String(order.id ?? ""),
      gatewayData: order,
    }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create gateway order",
    }
  }
}

export async function fetchGatewayOrderStatus(
  gatewayOrderId: string
): Promise<FetchGatewayOrderStatusResult> {
  const client = getRazorpayClient()
  if (!client) {
    return { status: "PENDING", gatewayUnreachable: false }
  }

  try {
    const order = (await withTimeout(
      client.orders.fetch(gatewayOrderId)
    )) as { status?: RazorpayOrderStatus }

    if (order.status === "paid") {
      return { status: "CHARGED", gatewayUnreachable: false }
    }

    const paymentList = (await withTimeout(
      client.orders.fetchPayments(gatewayOrderId)
    )) as { items?: Array<{ status?: RazorpayPaymentStatus }> }

    const items = paymentList.items ?? []

    if (
      items.some(
        (payment) =>
          payment.status === "authorized" || payment.status === "captured"
      )
    ) {
      return { status: "CHARGED", gatewayUnreachable: false }
    }

    if (
      items.length > 0 &&
      items.every((payment) =>
        ["failed", "refunded"].includes(String(payment.status))
      )
    ) {
      return { status: "FAILED", gatewayUnreachable: false }
    }

    return { status: "PENDING", gatewayUnreachable: false }
  } catch {
    return { status: "PENDING", gatewayUnreachable: true }
  }
}

export async function createGatewayRefund(input: {
  gatewayTxnId: string
  amount: string
  uniqueRequestId: string
}): Promise<CreateGatewayRefundResult> {
  const client = getRazorpayClient()
  if (!client) {
    return {
      success: false,
      error:
        "Razorpay not configured (RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET missing)",
    }
  }

  const amount = amountToSubunits(input.amount)
  if (!amount) {
    return { success: false, error: "Invalid refund amount" }
  }

  try {
    const refund = (await withTimeout(
      client.payments.refund(input.gatewayTxnId, {
        amount,
        notes: {
          uniqueRequestId: input.uniqueRequestId,
        },
      })
    )) as unknown as Record<string, unknown>

    return {
      success: true,
      refundId: typeof refund.id === "string" ? refund.id : undefined,
      raw: refund,
    }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create gateway refund",
    }
  }
}

export function verifyGatewaySignature(input: {
  razorpayOrderId: string
  razorpayPaymentId: string
  razorpaySignature: string
}): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET
  if (!secret) {
    return false
  }

  const expected = createHmac("sha256", secret)
    .update(`${input.razorpayOrderId}|${input.razorpayPaymentId}`)
    .digest("hex")

  const a = Buffer.from(expected, "utf8")
  const b = Buffer.from(input.razorpaySignature.trim(), "utf8")
  if (a.length !== b.length) {
    return false
  }

  return timingSafeEqual(a, b)
}
