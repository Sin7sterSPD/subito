import { Worker, Job } from "bullmq";
import { db } from "@subito/db";
import { orders, payments, bookings } from "@subito/db/schema";
import { eq } from "drizzle-orm";
import { redis } from "../lib/redis";
import type { PaymentReconciliationJobData } from "../queues";
import { notificationQueue } from "../queues";

async function processPaymentReconciliation(
  job: Job<PaymentReconciliationJobData>
) {
  const { orderId, userId } = job.data;

  console.log(`Processing payment reconciliation for order ${orderId}`);

  const order = await db.query.orders.findFirst({
    where: eq(orders.orderId, orderId),
    with: {
      payments: true,
      booking: true,
    },
  });

  if (!order) {
    throw new Error(`Order ${orderId} not found`);
  }

  if (order.status === "COMPLETED" || order.status === "FAILED") {
    console.log(`Order ${orderId} already in terminal state: ${order.status}`);
    return { status: order.status, alreadyProcessed: true };
  }

  const paymentStatus = await checkPaymentStatusWithGateway(order.juspayOrderId || orderId);

  if (paymentStatus.status === "SUCCESS") {
    await db
      .update(orders)
      .set({ status: "COMPLETED", updatedAt: new Date() })
      .where(eq(orders.id, order.id));

    if (order.bookingId) {
      await db
        .update(bookings)
        .set({
          status: "PENDING_MATCH",
          paidAmount: order.amount,
          updatedAt: new Date(),
        })
        .where(eq(bookings.id, order.bookingId));

      await notificationQueue.add("payment-success", {
        type: "PAYMENT_SUCCESS",
        userId,
        title: "Payment Successful",
        body: "Your payment has been processed successfully.",
        data: {
          referenceType: "booking",
          referenceId: order.bookingId,
          orderId,
        },
      });
    }

    return { status: "COMPLETED", orderId };
  } else if (paymentStatus.status === "FAILED") {
    await db
      .update(orders)
      .set({ status: "FAILED", updatedAt: new Date() })
      .where(eq(orders.id, order.id));

    await notificationQueue.add("payment-failed", {
      type: "PAYMENT_FAILED",
      userId,
      title: "Payment Failed",
      body: "Your payment could not be processed. Please try again.",
      data: {
        orderId,
        reason: paymentStatus.reason,
      },
    });

    return { status: "FAILED", orderId, reason: paymentStatus.reason };
  }

  throw new Error(`Payment still pending for order ${orderId}`);
}

async function checkPaymentStatusWithGateway(
  orderId: string
): Promise<{ status: "SUCCESS" | "FAILED" | "PENDING"; reason?: string }> {
  return { status: "PENDING" };
}

export const paymentReconciliationWorker = new Worker<PaymentReconciliationJobData>(
  "payment-reconciliation-queue",
  processPaymentReconciliation,
  {
    connection: redis,
    concurrency: 5,
  }
);

paymentReconciliationWorker.on("completed", (job) => {
  console.log(`Payment reconciliation job ${job.id} completed`);
});

paymentReconciliationWorker.on("failed", (job, err) => {
  console.error(`Payment reconciliation job ${job?.id} failed:`, err);
});
