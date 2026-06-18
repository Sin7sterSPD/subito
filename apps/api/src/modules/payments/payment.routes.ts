import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import type { AppEnv } from "../../lib/types"
import { requireAuth } from "../../middleware/auth"
import * as paymentsService from "./payments.service"
import { verifyRazorpayWebhookSignature } from "@/lib/razorpay-signature"

export const paymentsRouter = new Hono<AppEnv>()

const initiatePaymentSchema = z.object({
  orderId: z.string().min(1),
  amount: z.number().positive(),
  paymentMethodId: z.string().optional(),
})

const refundSchema = z.object({
  bookingId: z.string().min(1),
  reason: z.string().min(1).max(2000),
})

export const processOrderSchema = z.object({
  orderId: z.string(),
  status: z.enum(["SUCCESS", "CHARGED", "FAILED", "PENDING"]),
  razorpayPaymentId: z.string().optional(),
  razorpaySignature: z.string().optional(),
  razorpayOrderId: z.string().optional(),
})

paymentsRouter.get("/", requireAuth, async (c) => {
  const userId = c.get("userId")!
  const page = Math.max(1, Number.parseInt(c.req.query("page") || "1", 10) || 1)
  const limit = Math.min(
    100,
    Math.max(1, Number.parseInt(c.req.query("limit") || "10", 10) || 10)
  )
  const history = await paymentsService.getPaymentHistory(userId, {
    page,
    limit,
  })

  return c.json({
    success: true,
    data: history.payments,
    meta: history.meta,
  })
})

paymentsRouter.get("/status", requireAuth, async (c) => {
  const userId = c.get("userId")!
  const orderId = c.req.query("orderId")

  if (!orderId) {
    return c.json(
      {
        success: false,
        error: { code: "BAD_REQUEST", message: "orderId required" },
      },
      400
    )
  }

  const status = await paymentsService.getPaymentStatus(userId, orderId)

  return c.json({
    success: true,
    data: status,
  })
})

paymentsRouter.post(
  "/initiate",
  requireAuth,
  zValidator("json", initiatePaymentSchema),
  async (c) => {
    const userId = c.get("userId")!
    const data = c.req.valid("json")
    const result = await paymentsService.initiatePayment(userId, data)

    return c.json({
      success: true,
      data: result,
    })
  }
)

paymentsRouter.post(
  "/refund",
  requireAuth,
  zValidator("json", refundSchema),
  async (c) => {
    const userId = c.get("userId")!
    const data = c.req.valid("json")
    const result = await paymentsService.initiateRefund(userId, data)
    return c.json({ success: true, data: result })
  }
)

paymentsRouter.post(
  "/process-order",
  requireAuth,
  zValidator("json", processOrderSchema),
  async (c) => {
    const userId = c.get("userId")!
    const data = c.req.valid("json")
    const result = await paymentsService.processOrder(userId, data)

    return c.json({
      success: true,
      data: result,
    })
  }
)

paymentsRouter.post("/razorpay/webhook", async (c) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error("RAZORPAY_WEBHOOK_SECRET is required")
    return c.json(
      {
        success: false,
        error: {
          code: "SERVICE_MISCONFIGURED",
          message: "Webhook is not configured",
        },
      },
      503
    )
  }

  const signature = c.req.header("x-razorpay-signature")
  if (!signature) {
    return c.json(
      {
        success: false,
        error: { code: "UNAUTHORIZED", message: "Missing signature" },
      },
      401
    )
  }

  const rawBody = await c.req.text()
  if (!verifyRazorpayWebhookSignature(rawBody, signature)) {
    return c.json(
      {
        success: false,
        error: { code: "UNAUTHORIZED", message: "Invalid signature" },
      },
      401
    )
  }

  let body: unknown
  try {
    body = JSON.parse(rawBody)
  } catch {
    return c.json(
      {
        success: false,
        error: { code: "BAD_REQUEST", message: "Invalid JSON payload" },
      },
      400
    )
  }

  const result = await paymentsService.handleWebhook(body)

  return c.json({
    success: true,
    data: result,
  })
})
