import { Worker, Job } from "bullmq"
import { db } from "@subito/db"
import { orders, bookings } from "@subito/db/schema"
import { and, eq } from "@subito/db"
import { fetchGatewayOrderStatus } from "@subito/shared"
import { redis } from "../lib/redis"
import { enqueuePartnerMatchingJob } from "../lib/enqueue-partner-match"
import type { PaymentReconciliationJobData } from "../queues"
import { notificationQueue } from "../queues"
import { log } from "../lib/logger"

async function processPaymentReconciliation(
  job: Job<PaymentReconciliationJobData>
) {
  const { orderId, userId, eventName } = job.data

  log.info(
    { orderId, eventName },
    "Processing payment reconciliation for order"
  )

  const order = await db.query.orders.findFirst({
    where: eq(orders.orderId, orderId),
    with: {
      payments: true,
      booking: true,
    },
  })

  if (!order) {
    throw new Error(`Order ${orderId} not found`)
  }

  if (order.status === "COMPLETED" || order.status === "FAILED") {
    log.info(
      { orderId, status: order.status },
      "Order already in terminal state"
    )
    return { status: order.status, alreadyProcessed: true }
  }

  const dbCaptured =
    order.status === "CAPTURED" ||
    (order.payments?.some((p) => p.status === "CAPTURED") ?? false)

  const gatewayResult = dbCaptured
    ? { status: "CHARGED" as const, gatewayUnreachable: false }
    : order.gatewayOrderId
      ? await fetchGatewayOrderStatus(order.gatewayOrderId)
      : { status: "PENDING" as const, gatewayUnreachable: false }
  const gateway = gatewayResult.gatewayUnreachable
    ? ("PENDING" as const)
    : gatewayResult.status

  const paymentStatus =
    gateway === "CHARGED"
      ? ({ status: "SUCCESS" } as const)
      : gateway === "FAILED"
        ? { status: "FAILED" as const, reason: "gateway" }
        : { status: "PENDING" as const }

  if (paymentStatus.status === "SUCCESS") {
    const result = await db.transaction(async (tx) => {
      const [lockedOrder] = await tx
        .select()
        .from(orders)
        .where(eq(orders.id, order.id))
        .for("update")

      if (!lockedOrder) {
        return { alreadyProcessed: true, bookingId: order.bookingId }
      }

      if (lockedOrder.status === "COMPLETED") {
        return { alreadyProcessed: true, bookingId: order.bookingId }
      }

      await tx
        .update(orders)
        .set({ status: "COMPLETED", updatedAt: new Date() })
        .where(eq(orders.id, order.id))

      let progressedBooking = false
      if (order.bookingId) {
        const updated = await tx
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
        progressedBooking = updated.length > 0
      }

      return {
        alreadyProcessed: false,
        bookingId: order.bookingId,
        shouldNotify: progressedBooking,
      }
    })

    if (!result.alreadyProcessed && result.shouldNotify && result.bookingId) {
      await notificationQueue.add("payment-success", {
        type: "PAYMENT_SUCCESS",
        userId,
        title: "Payment Successful",
        body: "Your payment has been processed successfully.",
        data: {
          referenceType: "booking",
          referenceId: result.bookingId,
          orderId,
        },
      })

      await enqueuePartnerMatchingJob(result.bookingId)
    }

    return { status: "COMPLETED", orderId }
  } else if (paymentStatus.status === "FAILED") {
    const shouldNotify = await db.transaction(async (tx) => {
      const [lockedOrder] = await tx
        .select()
        .from(orders)
        .where(eq(orders.id, order.id))
        .for("update")

      if (!lockedOrder) {
        return false
      }

      if (lockedOrder.status === "FAILED") {
        return false
      }

      await tx
        .update(orders)
        .set({ status: "FAILED", updatedAt: new Date() })
        .where(eq(orders.id, order.id))
      return true
    })

    if (shouldNotify) {
         await notificationQueue.add("payment-failed", {
           type: "PAYMENT_FAILED",
           userId,
           title: "Payment Failed",
           body: "Your payment could not be processed. Please try again.",
           data: {
             orderId,
             reason: paymentStatus.reason,
           },
         })
    }     

    return { status: "FAILED", orderId, reason: paymentStatus.reason }
  }

  if (job.attemptsMade >= 48) {
    log.warn(
      { orderId, attemptsMade: job.attemptsMade },
      "Payment reconciliation giving up (pending) for order"
    )
    return { status: "PENDING", orderId, deferred: true }
  }

  throw new Error(`Payment still pending for order ${orderId}`)
}

export const paymentReconciliationWorker =
  new Worker<PaymentReconciliationJobData>(
    "payment-reconciliation-queue",
    processPaymentReconciliation,
    {
      connection: redis,
      concurrency: 5,
    }
  )

paymentReconciliationWorker.on("completed", (job) => {
  log.info({ jobId: job.id }, "Payment reconciliation job completed")
})

paymentReconciliationWorker.on("failed", (job, err) => {
  log.error({ jobId: job?.id, err }, "Payment reconciliation job failed")
})
