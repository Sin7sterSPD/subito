import { Worker, Job } from "bullmq";
import { db } from "@subito/db";
import { recurringBookings, bookingInstances, bookings } from "@subito/db/schema";
import { eq } from "drizzle-orm";
import { redis } from "../lib/redis";
import type { RecurringBookingJobData } from "../queues";

async function processRecurringBooking(job: Job<RecurringBookingJobData>) {
  const { recurringBookingId, parentBookingId } = job.data;

  console.log(`Processing recurring booking ${recurringBookingId}`);

  const recurring = await db.query.recurringBookings.findFirst({
    where: eq(recurringBookings.id, recurringBookingId),
    with: {
      booking: {
        with: {
          items: true,
          address: true,
        },
      },
      instances: true,
    },
  });

  if (!recurring) {
    throw new Error(`Recurring booking ${recurringBookingId} not found`);
  }

  if (!recurring.isActive) {
    console.log(`Recurring booking ${recurringBookingId} is not active`);
    return { processed: false, reason: "Inactive" };
  }

  const existingInstanceNumbers = new Set(
    recurring.instances.map((i) => i.instanceNumber)
  );

  const totalInstances = recurring.totalInstances || 12;
  const nextInstanceNumber = Math.max(...existingInstanceNumbers, 0) + 1;

  if (nextInstanceNumber > totalInstances) {
    console.log(`All instances created for ${recurringBookingId}`);
    await db
      .update(recurringBookings)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(recurringBookings.id, recurringBookingId));
    return { processed: true, completed: true };
  }

  const nextDate = calculateNextDate(
    recurring.startDate,
    recurring.recurringType,
    nextInstanceNumber - 1,
    recurring.recurringDays
  );

  if (recurring.endDate && nextDate > recurring.endDate) {
    console.log(`End date reached for ${recurringBookingId}`);
    await db
      .update(recurringBookings)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(recurringBookings.id, recurringBookingId));
    return { processed: true, completed: true };
  }

  const [newInstance] = await db
    .insert(bookingInstances)
    .values({
      recurringBookingId,
      parentBookingId,
      instanceNumber: nextInstanceNumber,
      status: "SCHEDULED",
      scheduledDate: nextDate,
      scheduledTime: recurring.booking.scheduledTime,
    })
    .returning();

  console.log(
    `Created instance ${nextInstanceNumber} for recurring booking ${recurringBookingId}`
  );

  return {
    processed: true,
    instanceId: newInstance.id,
    instanceNumber: nextInstanceNumber,
    scheduledDate: nextDate,
  };
}

function calculateNextDate(
  startDate: Date,
  recurringType: string,
  instanceOffset: number,
  recurringDays?: number[] | null
): Date {
  const date = new Date(startDate);

  switch (recurringType) {
    case "WEEKLY":
      date.setDate(date.getDate() + instanceOffset * 7);
      break;
    case "BIWEEKLY":
      date.setDate(date.getDate() + instanceOffset * 14);
      break;
    case "MONTHLY":
      date.setMonth(date.getMonth() + instanceOffset);
      break;
    default:
      date.setDate(date.getDate() + instanceOffset * 7);
  }

  return date;
}

export const recurringBookingWorker = new Worker<RecurringBookingJobData>(
  "recurring-booking-queue",
  processRecurringBooking,
  {
    connection: redis,
    concurrency: 3,
  }
);

recurringBookingWorker.on("completed", (job) => {
  console.log(`Recurring booking job ${job.id} completed`);
});

recurringBookingWorker.on("failed", (job, err) => {
  console.error(`Recurring booking job ${job?.id} failed:`, err);
});
