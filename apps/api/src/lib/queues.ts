import { Queue } from "bullmq";
import { redis } from "./redis";

/** Producer-side queue clients (API enqueues; worker consumes). Same names as `apps/worker`. */
export const partnerMatchingQueue = new Queue("partner-matching-queue", {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 500,
    attempts: 5,
    backoff: { type: "exponential", delay: 3000 },
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
      backoff: { type: "exponential", delay: 2000 },
    },
  }
);
