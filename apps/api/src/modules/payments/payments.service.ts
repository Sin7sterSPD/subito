import { db } from "@subito/db";
import { orders, payments, bookings, refunds } from "@subito/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { NotFoundError, BadRequestError } from "../../lib/errors";
import { generatePaymentId } from "../../utils/helpers";
import { enqueuePartnerMatchingJob } from "../../lib/enqueue-partner-match";
import { paymentReconciliationQueue } from "../../lib/queues";

const JUSPAY_API_KEY = process.env.JUSPAY_API_KEY;
const JUSPAY_MERCHANT_ID = process.env.JUSPAY_MERCHANT_ID;

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
  ];

  if (platform === "ios") {
    options.unshift({
      id: "apple_pay",
      name: "Apple Pay",
      type: "APPLE_PAY",
      icon: "apple",
      description: "Pay using Apple Pay",
    });
  }

  return { options };
}

export async function verifyUpi(upiId: string) {
  const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/;
  const isValid = upiRegex.test(upiId);

  return {
    upiId,
    isValid,
    name: isValid ? "Verified UPI ID" : null,
  };
}

export async function getPaymentHistory(
  userId: string,
  query: { page: number; limit: number }
) {
  const paymentList = await db.query.payments.findMany({
    where: eq(payments.userId, userId),
    orderBy: [desc(payments.createdAt)],
    limit: query.limit,
    offset: (query.page - 1) * query.limit,
    with: {
      order: {
        with: {
          booking: true,
        },
      },
    },
  });

  const refundList = await db.query.refunds.findMany({
    where: eq(refunds.userId, userId),
    orderBy: [desc(refunds.createdAt)],
  });

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
      hasMore: paymentList.length === query.limit,
    },
  };
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
  });

  if (!order) {
    throw new NotFoundError("Order");
  }

  const booking = order.bookingId
    ? await db.query.bookings.findFirst({
        where: eq(bookings.id, order.bookingId),
        columns: { id: true, status: true, bookingNumber: true },
      })
    : null;

  const terminalOrder = ["COMPLETED", "FAILED", "CANCELLED"].includes(order.status);

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
  };
}

export async function initiatePayment(
  userId: string,
  data: {
    orderId: string;
    amount: number;
    paymentMethodId?: string;
  }
) {
  const order = await db.query.orders.findFirst({
    where: and(eq(orders.orderId, data.orderId), eq(orders.userId, userId)),
  });

  if (!order) {
    throw new NotFoundError("Order");
  }

  if (order.status !== "CREATED" && order.status !== "PENDING") {
    throw new BadRequestError(`Order is in ${order.status} status`);
  }

  const clientAuthToken = generateMockClientAuthToken(order.orderId);
  const clientAuthTokenExpiry = new Date();
  clientAuthTokenExpiry.setMinutes(clientAuthTokenExpiry.getMinutes() + 30);

  await db
    .update(orders)
    .set({
      status: "PENDING",
      juspayClientAuthToken: clientAuthToken,
      juspayClientAuthTokenExpiry: clientAuthTokenExpiry,
      paymentMethodId: data.paymentMethodId,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, order.id));

  return {
    orderId: order.orderId,
    amount: data.amount,
    currency: "INR",
    clientAuthToken,
    clientAuthTokenExpiry: clientAuthTokenExpiry.toISOString(),
    merchantId: JUSPAY_MERCHANT_ID || "subito_merchant",
    sdkPayload: {
      requestId: order.orderId,
      service: "in.juspay.hyperpay",
      payload: {
        action: "initiate",
        merchantId: JUSPAY_MERCHANT_ID || "subito_merchant",
        clientId: "subito",
        orderId: order.orderId,
        amount: data.amount.toString(),
        customerId: userId,
        customerPhone: "",
        customerEmail: "",
      },
    },
  };
}

export async function processOrder(
  userId: string,
  data: {
    orderId: string;
    status: string;
    txnId?: string;
  }
) {
  const order = await db.query.orders.findFirst({
    where: and(eq(orders.orderId, data.orderId), eq(orders.userId, userId)),
  });

  if (!order) {
    throw new NotFoundError("Order");
  }

  const paymentId = generatePaymentId();

  if (data.status === "SUCCESS" || data.status === "CHARGED") {
    const [payment] = await db
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
      .returning();

    await db
      .update(orders)
      .set({
        status: "COMPLETED",
        updatedAt: new Date(),
      })
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

      await enqueuePartnerMatchingJob(order.bookingId);
    }

    return {
      success: true,
      orderId: data.orderId,
      paymentId: payment.paymentId,
      status: "COMPLETED",
    };
  } else {
    await db.insert(payments).values({
      paymentId,
      orderId: order.id,
      userId,
      amount: order.amount,
      status: "FAILED",
      juspayTxnId: data.txnId,
      failedAt: new Date(),
      errorCode: data.status,
    });

    await db
      .update(orders)
      .set({
        status: "FAILED",
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));

    return {
      success: false,
      orderId: data.orderId,
      status: "FAILED",
      reason: data.status,
    };
  }
}

/**
 * Juspay (and similar) webhooks: enqueue server-side reconciliation.
 * Do not trust payload alone — reconciliation worker / gateway verify is source of truth.
 */
export async function handleWebhook(body: unknown) {
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const orderId =
    (typeof record.order_id === "string" && record.order_id) ||
    (typeof record.orderId === "string" && record.orderId) ||
    (typeof record.id === "string" && record.id) ||
    undefined;

  if (!orderId) {
    console.warn("Webhook missing order id", JSON.stringify(body).slice(0, 500));
    return { received: true, enqueued: false };
  }

  const order = await db.query.orders.findFirst({
    where: eq(orders.orderId, orderId),
  });

  if (!order) {
    console.warn(`Webhook order not found: ${orderId}`);
    return { received: true, enqueued: false };
  }

  await paymentReconciliationQueue.add("reconcile-payment", {
    orderId: order.orderId,
    userId: order.userId,
  });

  return { received: true, enqueued: true };
}

function generateMockClientAuthToken(orderId: string): string {
  return Buffer.from(`${orderId}:${Date.now()}`).toString("base64");
}
