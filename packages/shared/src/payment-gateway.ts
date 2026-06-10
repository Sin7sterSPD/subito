/**
 * Shared Juspay order status fetch for API and worker.
 * Uses AbortController so hung gateway calls do not block forever.
 */
import "./env.js"
export type GatewayOrderStatus = "CHARGED" | "FAILED" | "PENDING"

export type FetchGatewayOrderStatusResult = {
  status: GatewayOrderStatus
  /** True when no definitive gateway response (timeout, network, non-OK HTTP). */
  gatewayUnreachable: boolean
}

function gatewayTimeoutMs(): number {
  const raw = process.env.JUSPAY_GATEWAY_TIMEOUT_MS
  const n = raw ? parseInt(raw, 10) : 12_000
  return Number.isFinite(n) && n > 0 ? Math.min(n, 60_000) : 12_000
}

function mapBodyStatus(statusRaw: string | undefined): GatewayOrderStatus {
  const s = (statusRaw || "").toUpperCase()
  if (
    s === "CHARGED" ||
    s === "CHARGED_AND_REFUNDED" ||
    s === "COD_INITIATED"
  ) {
    return "CHARGED"
  }
  if (s === "FAILED" || s === "VOIDED" || s === "AUTHENTICATION_FAILED") {
    return "FAILED"
  }
  return "PENDING"
}

export async function fetchGatewayOrderStatus(input: {
  orderId: string
  juspayOrderId: string | null
}): Promise<FetchGatewayOrderStatusResult> {
  const apiKey = process.env.JUSPAY_API_KEY
  const merchantId = process.env.JUSPAY_MERCHANT_ID
  const base =
    process.env.JUSPAY_BASE_URL?.replace(/\/$/, "") || "https://api.juspay.in"

  if (!apiKey || !merchantId) {
    return { status: "PENDING", gatewayUnreachable: false }
  }

  const id = input.juspayOrderId || input.orderId
  const url = `${base}/orders/${encodeURIComponent(id)}`
  const controller = new AbortController()
  const timeoutMs = gatewayTimeoutMs()
  const t = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "x-merchantid": merchantId,
        Authorization: `Basic ${btoa(`${apiKey}:`)}`,
      },
    })

    if (!res.ok) {
      return { status: "PENDING", gatewayUnreachable: true }
    }

    const data = (await res.json()) as { status?: string }
    return {
      status: mapBodyStatus(data.status),
      gatewayUnreachable: false,
    }
  } catch {
    return { status: "PENDING", gatewayUnreachable: true }
  } finally {
    clearTimeout(t)
  }
}

/** Create-order input (amount is INR major units as stored in DB, e.g. "199.00"). */
export type CreateJuspayOrderInput = {
  orderId: string
  amount: string
  customerId: string
  customerPhone: string
  customerEmail: string
  returnUrl: string
  description?: string
}

export type CreateJuspayOrderSuccess = {
  success: true
  orderId: string
  juspayOrderId: string
  clientAuthToken: string
  /** ISO timestamp when known; otherwise caller may default. */
  clientAuthTokenExpiry: string | null
  /** Raw `sdk_payload` from Juspay for HyperSDK when present. */
  sdkPayload: Record<string, unknown> | null
}

export type CreateJuspayOrderFailure = {
  success: false
  error: string
}

export type CreateJuspayOrderResult =
  | CreateJuspayOrderSuccess
  | CreateJuspayOrderFailure

function formatInrAmount(amountStr: string): string | null {
  const n = parseFloat(amountStr)
  if (!Number.isFinite(n) || n < 0) {
    return null
  }
  return (Math.round(n * 100) / 100).toFixed(2)
}

function extractClientAuthToken(data: Record<string, unknown>): string | null {
  const top =
    (data.client_auth_token as string | undefined) ??
    (data.clientAuthToken as string | undefined)
  if (top) {
    return top
  }

  const sdkRaw = data.sdk_payload ?? data.sdkPayload
  if (!sdkRaw || typeof sdkRaw !== "object") {
    return null
  }
  const sdk = sdkRaw as Record<string, unknown>
  const inner = sdk.payload
  if (inner && typeof inner === "object") {
    const p = inner as Record<string, unknown>
    const t =
      (p.client_auth_token as string | undefined) ??
      (p.clientAuthToken as string | undefined)
    if (t) {
      return t
    }
  }
  return null
}

function extractSdkPayload(
  data: Record<string, unknown>
): Record<string, unknown> | null {
  const sdkRaw = data.sdk_payload ?? data.sdkPayload
  if (!sdkRaw || typeof sdkRaw !== "object") {
    return null
  }
  return sdkRaw as Record<string, unknown>
}

/**
 * Server-to-server Juspay order create (HyperSDK client auth token).
 * Uses application/x-www-form-urlencoded per Juspay API.
 */
export async function createJuspayOrder(
  input: CreateJuspayOrderInput
): Promise<CreateJuspayOrderResult> {
  const apiKey = process.env.JUSPAY_API_KEY
  const merchantId = process.env.JUSPAY_MERCHANT_ID
  const base =
    process.env.JUSPAY_BASE_URL?.replace(/\/$/, "") || "https://api.juspay.in"

  if (!apiKey || !merchantId) {
    return {
      success: false,
      error:
        "Juspay not configured (JUSPAY_API_KEY or JUSPAY_MERCHANT_ID missing)",
    }
  }

  const body = new URLSearchParams()
  const normalizedAmount = formatInrAmount(input.amount)

  if (!normalizedAmount) {
    return {
      success: false,
      error: "Invalid order amount",
    }
  }

  body.set("order_id", input.orderId)
  body.set("amount", normalizedAmount)
  body.set("currency", "INR")
  body.set("customer_id", input.customerId)
  body.set("customer_email", input.customerEmail || "customer@subito.app")
  const phoneDigits = input.customerPhone.replace(/\D/g, "").slice(-10)
  body.set(
    "customer_phone",
    phoneDigits.length >= 10 ? phoneDigits : "9999999999"
  )
  body.set("return_url", input.returnUrl)
  body.set("description", input.description ?? "Subito booking payment")
  body.set("options.get_client_auth_token", "true")

  const controller = new AbortController()
  const timeoutMs = gatewayTimeoutMs()
  const t = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(`${base}/orders`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "x-merchantid": merchantId,
        Authorization: `Basic ${btoa(`${apiKey}:`)}`,
        version: "2018-10-25",
      },
      body: body.toString(),
    })

    const text = await res.text()
    let data: Record<string, unknown> = {}
    try {
      data = text ? (JSON.parse(text) as Record<string, unknown>) : {}
    } catch {
      return {
        success: false,
        error: res.ok
          ? "Invalid JSON from Juspay"
          : `HTTP ${res.status}: ${text.slice(0, 240)}`,
      }
    }

    if (!res.ok) {
      const msg =
        (data.error_message as string) ??
        (data.errorMessage as string) ??
        (data.message as string) ??
        `Juspay HTTP ${res.status}`
      return { success: false, error: String(msg) }
    }

    const clientAuthToken = extractClientAuthToken(data)
    if (!clientAuthToken) {
      return {
        success: false,
        error: "Juspay order created but client auth token missing in response",
      }
    }

    const juspayOrderId = String(
      data.id ?? data.juspay_order_id ?? input.orderId
    )
    const orderId = String(data.order_id ?? input.orderId)

    let clientAuthTokenExpiry: string | null = null
    const expRaw =
      data.client_auth_token_expiry ??
      data.clientAuthTokenExpiry ??
      (extractSdkPayload(data)?.payload as Record<string, unknown> | undefined)
        ?.client_auth_token_expiry ??
      (extractSdkPayload(data)?.payload as Record<string, unknown> | undefined)
        ?.clientAuthTokenExpiry
    if (typeof expRaw === "string") {
      clientAuthTokenExpiry = expRaw
    } else if (typeof expRaw === "number" && Number.isFinite(expRaw)) {
      clientAuthTokenExpiry = new Date(expRaw * 1000).toISOString()
    }

    return {
      success: true,
      orderId,
      juspayOrderId,
      clientAuthToken,
      clientAuthTokenExpiry,
      sdkPayload: extractSdkPayload(data),
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return {
      success: false,
      error:
        msg.toLowerCase().includes("abort") || msg.includes("canceled")
          ? "Juspay request timed out"
          : msg,
    }
  } finally {
    clearTimeout(t)
  }
}

export type CreateJuspayRefundResult =
  | { success: true; refundId?: string; raw?: Record<string, unknown> }
  | { success: false; error: string }

/**
 * POST /orders/{merchantOrderId}/refunds — form body per Juspay API patterns.
 */
export async function createJuspayRefund(input: {
  merchantOrderId: string
  amount: string
  uniqueRequestId: string
}): Promise<CreateJuspayRefundResult> {
  const apiKey = process.env.JUSPAY_API_KEY
  const merchantId = process.env.JUSPAY_MERCHANT_ID
  const base =
    process.env.JUSPAY_BASE_URL?.replace(/\/$/, "") || "https://api.juspay.in"

  const useMock =
    (!apiKey || !merchantId) && process.env.NODE_ENV !== "production"
  if (useMock) {
    return { success: true, refundId: `mock_${input.uniqueRequestId}` }
  }

  if (!apiKey || !merchantId) {
    return {
      success: false,
      error:
        "Juspay not configured (JUSPAY_API_KEY or JUSPAY_MERCHANT_ID missing)",
    }
  }

  const body = new URLSearchParams()
  const normalizedAmount = formatInrAmount(input.amount)

  if (!normalizedAmount) {
    return {
      success: false,
      error: "Invalid refund amount",
    }
  }

  body.set("unique_request_id", input.uniqueRequestId)
  body.set("amount", normalizedAmount)

  const controller = new AbortController()
  const timeoutMs = gatewayTimeoutMs()
  const t = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const url = `${base}/orders/${encodeURIComponent(input.merchantOrderId)}/refunds`
    const res = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "x-merchantid": merchantId,
        Authorization: `Basic ${btoa(`${apiKey}:`)}`,
        version: "2018-10-25",
      },
      body: body.toString(),
    })

    const text = await res.text()
    let data: Record<string, unknown> = {}
    try {
      data = text ? (JSON.parse(text) as Record<string, unknown>) : {}
    } catch {
      return {
        success: false,
        error: res.ok
          ? "Invalid JSON from Juspay"
          : `HTTP ${res.status}: ${text.slice(0, 240)}`,
      }
    }

    if (!res.ok) {
      const msg =
        (data.error_message as string) ??
        (data.errorMessage as string) ??
        (data.message as string) ??
        `Juspay refund HTTP ${res.status}`
      return { success: false, error: String(msg) }
    }

    const refundId =
      (data.id as string | undefined) ??
      (data.refund_id as string | undefined) ??
      (data.refundId as string | undefined)

    return { success: true, refundId, raw: data }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return {
      success: false,
      error:
        msg.toLowerCase().includes("abort") || msg.includes("canceled")
          ? "Juspay refund request timed out"
          : msg,
    }
  } finally {
    clearTimeout(t)
  }
}
