import { Queue } from "bullmq";
import { redis } from "../lib/redis";

export const notificationQueue = new Queue("notification-queue", {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 500,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
  },
});

export const paymentReconciliationQueue = new Queue(
  "payment-reconciliation-queue",
  {
    connection: redis,
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 500,
      attempts: 5,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
    },
  }
);

export const bookingStatusQueue = new Queue("booking-status-queue", {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 500,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
  },
});

export const partnerMatchingQueue = new Queue("partner-matching-queue", {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 500,
    attempts: 5,
    backoff: {
      type: "exponential",
      delay: 3000,
    },
  },
});

export const recurringBookingQueue = new Queue("recurring-booking-queue", {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 500,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
  },
});

export type NotificationJobData = {
  type: "BOOKING_CREATED" | "PARTNER_ASSIGNED" | "SERVICE_STARTED" | "SERVICE_COMPLETED" | "PAYMENT_SUCCESS" | "PAYMENT_FAILED" | "PROMOTIONAL";
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

export type PaymentReconciliationJobData = {
  orderId: string;
  userId: string;
};

export type BookingStatusJobData = {
  bookingId: string;
  fromStatus: string;
  toStatus: string;
  triggeredBy?: string;
};

export type PartnerMatchingJobData = {
  bookingId: string;
  latitude: number;
  longitude: number;
  serviceIds?: string[];
};

export type RecurringBookingJobData = {
  recurringBookingId: string;
  parentBookingId: string;
};
