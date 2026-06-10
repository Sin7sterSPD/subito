import { createHash } from "crypto"
import { db } from "@subito/db"
import { orders, payments, bookings, refunds, users } from "@subito/db/schema"

import { eq, and, desc, sql } from "@subito/db"
import {
  NotFoundError,
  BadRequestError,
  ServiceUnavailableError,
} from "../../lib/errors"
import { generatePaymentId, generateRefundId } from "../../utils/helpers"
import { enqueuePartnerMatchingJob } from "../../lib/enqueue-partner-match"
import { paymentReconciliationQueue } from "../../lib/queues"
import { redis } from "../../lib/redis"



import { trustClientOrderSuccessInDev } from "@/lib/payment-gateway"
import {
  createJuspayOrder,
  createJuspayRefund,
  fetchGatewayOrderStatus,
} from "@subito/shared"

const JUSPAY_MERCHANT_ID = process.env.JUSPAY_MERCHANT_ID
const JUSPAY_SDK_CLIENT_ID = process.env.JUSPAY_SDK_CLIENT_ID ?? "subito"
const JUSPAY_RETURN_URL =
  process.env.JUSPAY_RETURN_URL ??
  "https://api.subito.in/v1/payments/juspay/return"

export async function getPaymentOptions(platform: string) {
  const options = [
    {
      id: "upi",
      name: "UPI",
      type: "UPI",
      icon: "upi",
      description: "Pay using UPI",
      providers: [
        { id: "gpay", name: "Google Pay", icon: "gpay" },
        { id: "phonepe", name: "PhonePe", icon: "phonepe" },
        { id: "paytm", name: "Paytm", icon: "paytm" },
      ],
    },
    {
      id: "card",
      name: "Credit/Debit Card",
      type: "CARD",
      icon: "card",
      description: "Pay using card",
    },
    {
      id: "netbanking",
      name: "Net Banking",
      type: "NETBANKING",
      icon: "bank",
      description: "Pay using net banking",
    },
    {
      id: "wallet",
      name: "Wallets",
      type: "WALLET",
      icon: "wallet",
      description: "Pay using wallet",
      providers: [
        { id: "paytm_wallet", name: "Paytm Wallet", icon: "paytm" },
        { id: "mobikwik", name: "MobiKwik", icon: "mobikwik" },
      ],
    },
  ]

  if (platform === "ios") {
    options.unshift({
      id: "apple_pay",
      name: "Apple Pay",
      type: "APPLE_PAY",
      icon: "apple",
      description: "Pay using Apple Pay",
    })
  }

  return { options }
}

export async function verifyUpi(upiId: string) {
  const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/
  const isValid = upiRegex.test(upiId)

  return {
    upiId,
    isValid,
    name: isValid ? "Verified UPI ID" : null,
  }
}

export async function getPaymentHistory(
  userId: string,
  query: { page: number; limit: number }
) {
  const offset = (query.page - 1) * query.limit

  const [paymentList, paymentTotalRow, refundList, refundTotalRow] =
    await Promise.all([
      db.query.payments.findMany({
        where: eq(payments.userId, userId),
        orderBy: [desc(payments.createdAt)],
        limit: query.limit,
        offset,
        with: {
          order: {
            with: {
              booking: true,
            },
          },
        },
      }),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(payments)
        .where(eq(payments.userId, userId)),
      db.query.refunds.findMany({
        where: eq(refunds.userId, userId),
        orderBy: [desc(refunds.createdAt)],
        limit: query.limit,
        offset,
      }),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(refunds)
        .where(eq(refunds.userId, userId)),
    ])

  const paymentTotal = paymentTotalRow[0]?.count ?? 0
  const refundTotal = refundTotalRow[0]?.count ?? 0
  const hasMore = query.page * query.limit < Math.max(paymentTotal, refundTotal)

  return {
    payments: paymentList.map((p) => ({
      id: p.id,
      paymentId: p.paymentId,
      orderId: p.order.orderId,
      bookingNumber: p.order.booking?.bookingNumber,
      amount: p.amount,
      status: p.status,
      paymentMethod: p.paymentMethod,
      createdAt: p.createdAt,
    })),
    refunds: refundList.map((r) => ({
      id: r.id,
      refundId: r.refundId,
      amount: r.amount,
      status: r.status,
      reason: r.reason,
      createdAt: r.createdAt,
    })),
    meta: {
      page: query.page,
      limit: query.limit,
      total: paymentTotal,
      refundTotal,
      hasMore,
    },
  }
}

export async function getPaymentStatus(userId: string, orderId: string) {
  const order = await db.query.orders.findFirst({
    where: and(eq(orders.orderId, orderId), eq(orders.userId, userId)),
    with: {
      payments: {
        orderBy: [desc(payments.createdAt)],
        limit: 1,
      },
    },
  })

  if (!order) {
    throw new NotFoundError("Order")
  }

  const booking = order.bookingId
    ? await db.query.bookings.findFirst({
        where: eq(bookings.id, order.bookingId),
        columns: { id: true, status: true, bookingNumber: true },
      })
    : null

  const terminalOrder = ["COMPLETED", "FAILED", "CANCELLED"].includes(
    order.status
  )

  return {
    orderId: order.orderId,
    status: order.status,
    amount: order.amount,
    latestPayment: order.payments[0] || null,
    bookingId: order.bookingId,
    bookingStatus: booking?.status ?? null,
    bookingNumber: booking?.bookingNumber ?? null,
    /** True when order is in a terminal state (polling can stop). */
    terminal: terminalOrder,
  }
}

export async function initiatePayment(
  userId: string,
  data: {
    orderId: string
    amount: number
    paymentMethodId?: string
  }
) {
  const order = await db.query.orders.findFirst({
    where: and(eq(orders.orderId, data.orderId), eq(orders.userId, userId)),
  })

  if (!order) {
    throw new NotFoundError("Order")
  }

  if (order.status !== "CREATED" && order.status !== "PENDING") {
    throw new BadRequestError(`Order is in ${order.status} status`)
  }

  const orderAmount = parseFloat(String(order.amount))
  if (
    !Number.isFinite(data.amount) ||
    !Number.isFinite(orderAmount) ||
    Math.abs(orderAmount - data.amount) > 0.01
  ) {
    throw new BadRequestError("Amount does not match order")
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { phone: true, email: true },
  })

  if (!user) {
    throw new NotFoundError("User")
  }

  const merchantId = JUSPAY_MERCHANT_ID || "subito_merchant"
  const customerEmail =
    user.email?.trim() ||
    `user_${user.phone.replace(/\D/g, "") || "unknown"}@subito.phone`

  const hasJuspayCreds =
    !!process.env.JUSPAY_API_KEY?.trim() && !!JUSPAY_MERCHANT_ID?.trim()
  const useMockJuspay = !hasJuspayCreds && process.env.NODE_ENV !== "production"

  if (!hasJuspayCreds && process.env.NODE_ENV === "production") {
    throw new ServiceUnavailableError("Payment gateway is not configured")
  }

  let clientAuthToken: string
  let clientAuthTokenExpiry: Date
  let juspayOrderId: string | null = order.juspayOrderId
  let sdkPayload: Record<string, unknown>

  if (useMockJuspay) {
    clientAuthToken = Buffer.from(`${order.orderId}:${Date.now()}`).toString(
      "base64"
    )
    clientAuthTokenExpiry = new Date(Date.now() + 30 * 60 * 1000)
    sdkPayload = {
      requestId: order.orderId,
      service: "in.juspay.hyperapi",
      payload: {
        action: "initiate",
        merchantId,
        clientId: JUSPAY_SDK_CLIENT_ID,
        orderId: order.orderId,
        amount: data.amount.toFixed(2),
        clientAuthToken,
        customerId: userId,
        customerPhone: user.phone,
        customerEmail,
      },
    }
  } else {
    const created = await createJuspayOrder({
      orderId: order.orderId,
      amount: String(order.amount),
      customerId: userId,
      customerPhone: user.phone,
      customerEmail,
      returnUrl: JUSPAY_RETURN_URL,
      description: "Subito booking payment",
    })

    if (!created.success) {
      throw new ServiceUnavailableError(created.error)
    }

    clientAuthToken = created.clientAuthToken
    juspayOrderId = created.juspayOrderId
    clientAuthTokenExpiry = created.clientAuthTokenExpiry
      ? new Date(created.clientAuthTokenExpiry)
      : new Date(Date.now() + 30 * 60 * 1000)
    if (Number.isNaN(clientAuthTokenExpiry.getTime())) {
      clientAuthTokenExpiry = new Date(Date.now() + 30 * 60 * 1000)
    }

    sdkPayload =
      created.sdkPayload ??
      ({
        requestId: order.orderId,
        service: "in.juspay.hyperapi",
        payload: {
          action: "initiate",
          merchantId,
          clientId: JUSPAY_SDK_CLIENT_ID,
          orderId: order.orderId,
          amount: data.amount.toFixed(2),
          clientAuthToken,
          customerId: userId,
          customerPhone: user.phone,
          customerEmail,
        },
      } as Record<string, unknown>)
  }

  await db
    .update(orders)
    .set({
      status: "PENDING",
      juspayOrderId: juspayOrderId ?? undefined,
      juspayClientAuthToken: clientAuthToken,
      juspayClientAuthTokenExpiry: clientAuthTokenExpiry,
      paymentMethodId: data.paymentMethodId,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, order.id))

  return {
    orderId: order.orderId,
    amount: data.amount,
    currency: "INR",
    clientAuthToken,
    clientAuthTokenExpiry: clientAuthTokenExpiry.toISOString(),
    merchantId,
    clientId: JUSPAY_SDK_CLIENT_ID,
    environment:
      process.env.JUSPAY_ENVIRONMENT ??
      (process.env.NODE_ENV === "production" ? "production" : "sandbox"),
    sdkPayload,
  }
}

export async function processOrder(
  userId: string,
  data: {
    orderId: string
    status: string
    txnId?: string
  }
) {
  const order = await db.query.orders.findFirst({
    where: and(eq(orders.orderId, data.orderId), eq(orders.userId, userId)),
  })

  if (!order) {
    throw new NotFoundError("Order")
  }

  if (order.status === "COMPLETED") {
    const existing = await db.query.payments.findFirst({
      where: and(
        eq(payments.orderId, order.id),
        eq(payments.status, "CAPTURED")
      ),
      orderBy: [desc(payments.createdAt)],
    })
    return {
      success: true,
      orderId: data.orderId,
      paymentId: existing?.paymentId,
      status: "COMPLETED" as const,
      alreadyProcessed: true,
    }
  }

  if (order.status === "FAILED" || order.status === "CANCELLED") {
    throw new BadRequestError(`Order is in ${order.status} status`)
  }

  const isClientSuccess = data.status === "SUCCESS" || data.status === "CHARGED"

  if (isClientSuccess) {
    let { status: gateway, gatewayUnreachable } = await fetchGatewayOrderStatus(
      {
        orderId: order.orderId,
        juspayOrderId: order.juspayOrderId,
      }
    )
    if (gateway === "PENDING" && trustClientOrderSuccessInDev()) {
      gateway = "CHARGED"
      gatewayUnreachable = false
    }
    if (gatewayUnreachable) {
      throw new ServiceUnavailableError(
        "Payment gateway temporarily unavailable. Try again shortly or poll GET /v1/payments/status."
      )
    }
    if (gateway === "PENDING") {
      throw new BadRequestError(
        "Payment not confirmed by gateway. Poll GET /v1/payments/status or wait for the webhook."
      )
    }
    if (gateway === "FAILED") {
      throw new BadRequestError(
        "Gateway reports this payment as failed or voided"
      )
    }
  }

  const paymentId = generatePaymentId()

  if (isClientSuccess) {
    const { payment, bookingId, shouldEnqueue } = await db.transaction(
      async (tx) => {
        const [locked] = await tx
          .select()
          .from(orders)
          .where(eq(orders.id, order.id))
          .for("update")

        if (!locked) {
          throw new NotFoundError("Order")
        }

        if (locked.status === "COMPLETED") {
          const [existingP] = await tx
            .select()
            .from(payments)
            .where(
              and(
                eq(payments.orderId, locked.id),
                eq(payments.status, "CAPTURED")
              )
            )
            .orderBy(desc(payments.createdAt))
            .limit(1)
          if (!existingP) {
            throw new BadRequestError(
              "Order is completed but no captured payment record"
            )
          }
          return {
            payment: existingP,
            bookingId: locked.bookingId,
            shouldEnqueue: false,
          }
        }

        if (locked.status === "FAILED" || locked.status === "CANCELLED") {
          throw new BadRequestError(`Order is in ${locked.status} status`)
        }

        const [payment] = await tx
          .insert(payments)
          .values({
            paymentId,
            orderId: order.id,
            userId,
            amount: order.amount,
            status: "CAPTURED",
            juspayTxnId: data.txnId,
            capturedAt: new Date(),
          })
          .returning()

        await tx
          .update(orders)
          .set({
            status: "COMPLETED",
            updatedAt: new Date(),
          })
          .where(eq(orders.id, order.id))

        let shouldEnqueue = false
        if (order.bookingId) {
          const updatedBooking = await tx
            .update(bookings)
            .set({
              status: "PENDING_MATCH",
              paidAmount: order.amount,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(bookings.id, order.bookingId),
                eq(bookings.status, "PENDING_PAYMENT")
              )
            )
            .returning({ id: bookings.id })
          shouldEnqueue = updatedBooking.length > 0
        }

        return { payment, bookingId: order.bookingId, shouldEnqueue }
      }
    )

    if (bookingId && shouldEnqueue) {
      await enqueuePartnerMatchingJob(bookingId)
    }

    return {
      success: true,
      orderId: data.orderId,
      paymentId: payment!.paymentId,
      status: "COMPLETED" as const,
    }
  }

  await db.transaction(async (tx) => {
    const [locked] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, order.id))
      .for("update")

    if (!locked) {
      throw new NotFoundError("Order")
    }
    if (locked.status === "COMPLETED" || locked.status === "FAILED") {
      return
    }

    await tx.insert(payments).values({
      paymentId,
      orderId: order.id,
      userId,
      amount: order.amount,
      status: "FAILED",
      juspayTxnId: data.txnId,
      failedAt: new Date(),
      errorCode: data.status,
    })

    await tx
      .update(orders)
      .set({
        status: "FAILED",
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id))
  })

  return {
    success: false,
    orderId: data.orderId,
    status: "FAILED" as const,
    reason: data.status,
  }
}

function refundPercentForCancelledBooking(status: string): number | null {
  switch (status) {
    case "PENDING_PAYMENT":
    case "PENDING_MATCH":
      return 100
    case "MATCHED":
      return 80
    case "ARRIVING":
      return 50
    case "STARTED":
    case "COMPLETED":
      return null
    default:
      return null
  }
}

export async function tryAutoRefundAfterBookingCancel(input: {
  userId: string
  bookingId: string
  previousStatus: string
  reason: string
}): Promise<
  { skipped: true; reason: string } | { refundId: string; amount: string }
> {
  const pct = refundPercentForCancelledBooking(input.previousStatus)
  if (pct === null) {
    return { skipped: true, reason: "No refund for this booking stage" }
  }

  const order = await db.query.orders.findFirst({
    where: eq(orders.bookingId, input.bookingId),
  })
  if (!order || order.userId !== input.userId) {
    return { skipped: true, reason: "No order for booking" }
  }

  const payment = await db.query.payments.findFirst({
    where: and(eq(payments.orderId, order.id), eq(payments.status, "CAPTURED")),
    orderBy: [desc(payments.createdAt)],
  })
  if (!payment) {
    return { skipped: true, reason: "No captured payment" }
  }

  const existing = await db.query.refunds.findFirst({
    where: eq(refunds.paymentId, payment.id),
  })
  if (existing) {
    return { skipped: true, reason: "Refund already recorded" }
  }

  const orderAmt = Number(order.amount)

  if (!Number.isFinite(orderAmt) || orderAmt <= 0) {
    return {
      skipped: true,
      reason: "Invalid order amount",
    }
  }

     
  const refundAmtNum = (orderAmt * pct) / 100
  if (refundAmtNum <= 0) {
    return { skipped: true, reason: "Zero refund amount" }
  }
  const refundAmountStr = refundAmtNum.toFixed(2)
  const refundId = generateRefundId()

  // Create refund record FIRST to prevent phantom refunds
  await db.insert(refunds).values({
    refundId,
    paymentId: payment.id,
    orderId: order.id,
    bookingId: input.bookingId,
    userId: input.userId,
    status: "INITIATED",
    amount: refundAmountStr,
    reason: `Cancel refund (${input.previousStatus}): ${input.reason}`,
    initiatedBy: input.userId,
  })

  const gateway = await createJuspayRefund({
    merchantOrderId: order.orderId,
    amount: refundAmountStr,
    uniqueRequestId: refundId,
  })

  if (!gateway.success) {
    await db
      .update(refunds)
      .set({
        status: "FAILED",
        failureReason: gateway.error,
        failedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(refunds.refundId, refundId))

    throw new ServiceUnavailableError(gateway.error)
  }

  await db
    .update(refunds)
    .set({
      juspayRefundId: gateway.refundId ?? null,
      gatewayResponse: gateway.raw ?? null,
      processedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(refunds.refundId, refundId))

  return {
    refundId,
    amount: refundAmountStr,
  }
}

export async function initiateRefund(
  userId: string,
  data: { bookingId: string; reason: string }
) {
  const booking = await db.query.bookings.findFirst({
    where: and(eq(bookings.id, data.bookingId), eq(bookings.userId, userId)),
  })
  if (!booking) {
    throw new NotFoundError("Booking")
  }
  if (booking.status !== "CANCELLED") {
    throw new BadRequestError("Booking must be cancelled to request a refund")
  }
  const meta = (booking.metadata as Record<string, unknown> | null) ?? {}
  const previousStatus =
    typeof meta.statusBeforeCancel === "string"
      ? meta.statusBeforeCancel
      : "PENDING_MATCH"

  const result = await tryAutoRefundAfterBookingCancel({
    userId,
    bookingId: data.bookingId,
    previousStatus,
    reason: data.reason,
  })

  if ("skipped" in result && result.skipped) {
    throw new BadRequestError(result.reason)
  }

  return result
}

/**
 * Juspay (and similar) webhooks: enqueue server-side reconciliation.
 * Do not trust payload alone — reconciliation worker / gateway verify is source of truth.
 */
export async function handleWebhook(body: unknown) {
  const record =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {}
  const orderId =
    (typeof record.order_id === "string" && record.order_id) ||
    (typeof record.orderId === "string" && record.orderId) ||
    (typeof record.id === "string" && record.id) ||
    undefined

  if (!orderId) {
    console.warn("Webhook missing order id", JSON.stringify(body).slice(0, 500))
    return { received: true, enqueued: false }
  }

  let eventName = "ORDER_EVENT"
  if (typeof record.event_name === "string") {
    eventName = record.event_name
  } else if (typeof record.name === "string") {
    eventName = record.name
  } else if (
    record.content &&
    typeof record.content === "object" &&
    record.content !== null
  ) {
    const c = record.content as Record<string, unknown>
    if (typeof c.event_name === "string") {
      eventName = c.event_name
    }
  }

  const payloadKey = createHash("sha256")
    .update(JSON.stringify(body ?? {}))
    .digest("hex")
    .slice(0, 32)

  const order = await db.query.orders.findFirst({
    where: eq(orders.orderId, orderId),
  })

  if (!order) {
    console.warn(`Webhook order not found: ${orderId}`)
    return {
      received: false,
      enqueued: false,
      eventName,
      reason: "Order not found",
    }
  }

  const idemKey = `webhook:juspay:${orderId}:${String(eventName)}:${payloadKey}`
  const wasNew = await redis.set(idemKey, "1", "EX", 60 * 60 * 24 * 7, "NX")
  if (wasNew !== "OK") {
    return {
      received: true,
      enqueued: false,
      idempotent: true,
      eventName,
    }
  }

  try {
    await paymentReconciliationQueue.add("reconcile-payment", {
      orderId: order.orderId,
      userId: order.userId,
      eventName,
    })
  } catch (error) {
    await redis.del(idemKey)
    throw error
  }

  return { received: true, enqueued: true, eventName }
}
