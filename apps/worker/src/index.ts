import "dotenv/config";
import { notificationWorker } from "./processors/notification.processor";
import { paymentReconciliationWorker } from "./processors/payment.processor";
import { bookingStatusWorker } from "./processors/booking.processor";
import { partnerMatchingWorker } from "./processors/partner.processor";
import { recurringBookingWorker } from "./processors/recurring.processor";

console.log("Starting workers...");

const workers = [
  notificationWorker,
  paymentReconciliationWorker,
  bookingStatusWorker,
  partnerMatchingWorker,
  recurringBookingWorker,
];

process.on("SIGTERM", async () => {
  console.log("Received SIGTERM, shutting down workers...");
  await Promise.all(workers.map((worker) => worker.close()));
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("Received SIGINT, shutting down workers...");
  await Promise.all(workers.map((worker) => worker.close()));
  process.exit(0);
});

console.log("All workers started successfully");
