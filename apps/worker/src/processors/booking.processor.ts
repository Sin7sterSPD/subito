import { Worker, Job } from "bullmq";
import { db } from "@subito/db";
import { bookings, bookingStatusHistory } from "@subito/db/schema";
import { eq } from "drizzle-orm";
import { redis } from "../lib/redis";
import type { BookingStatusJobData } from "../queues";
import { notificationQueue, partnerMatchingQueue } from "../queues";

async function processBookingStatus(job: Job<BookingStatusJobData>) {
  const { bookingId, fromStatus, toStatus, triggeredBy } = job.data;

  console.log(
    `Processing booking status change: ${bookingId} from ${fromStatus} to ${toStatus}`
  );

  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.id, bookingId),
    with: {
      user: true,
      address: true,
    },
  });

  if (!booking) {
    throw new Error(`Booking ${bookingId} not found`);
  }

  await db.insert(bookingStatusHistory).values({
    bookingId,
    fromStatus,
    toStatus,
    changedBy: triggeredBy,
    reason: `Status changed from ${fromStatus} to ${toStatus}`,
  });

  if (toStatus === "PENDING_MATCH") {
    await partnerMatchingQueue.add(
      "match-partner",
      {
        bookingId,
        latitude: booking.address.latitude,
        longitude: booking.address.longitude,
      },
      { delay: 5000 }
    );

    await notificationQueue.add("booking-created", {
      type: "BOOKING_CREATED",
      userId: booking.userId,
      title: "Booking Confirmed",
      body: "Your booking has been confirmed. We are finding a partner for you.",
      data: {
        referenceType: "booking",
        referenceId: bookingId,
      },
    });
  } else if (toStatus === "MATCHED") {
    await notificationQueue.add("partner-assigned", {
      type: "PARTNER_ASSIGNED",
      userId: booking.userId,
      title: "Partner Assigned",
      body: "A partner has been assigned to your booking.",
      data: {
        referenceType: "booking",
        referenceId: bookingId,
        partnerId: booking.partnerId,
      },
    });
  } else if (toStatus === "STARTED") {
    await notificationQueue.add("service-started", {
      type: "SERVICE_STARTED",
      userId: booking.userId,
      title: "Service Started",
      body: "Your service has started.",
      data: {
        referenceType: "booking",
        referenceId: bookingId,
      },
    });
  } else if (toStatus === "COMPLETED") {
    await notificationQueue.add("service-completed", {
      type: "SERVICE_COMPLETED",
      userId: booking.userId,
      title: "Service Completed",
      body: "Your service has been completed. Please rate your experience.",
      data: {
        referenceType: "booking",
        referenceId: bookingId,
      },
    });
  }

  return { bookingId, fromStatus, toStatus, processed: true };
}

export const bookingStatusWorker = new Worker<BookingStatusJobData>(
  "booking-status-queue",
  processBookingStatus,
  {
    connection: redis,
    concurrency: 10,
  }
);

bookingStatusWorker.on("completed", (job) => {
  console.log(`Booking status job ${job.id} completed`);
});

bookingStatusWorker.on("failed", (job, err) => {
  console.error(`Booking status job ${job?.id} failed:`, err);
});
