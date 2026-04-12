import { Worker, Job } from "bullmq";
import { db } from "@subito/db";
import { bookings, partners, partnerLocations, bookingStatusHistory } from "@subito/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { redis } from "../lib/redis";
import type { PartnerMatchingJobData } from "../queues";
import { notificationQueue, bookingStatusQueue } from "../queues";

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

async function processPartnerMatching(job: Job<PartnerMatchingJobData>) {
  const { bookingId, latitude, longitude, serviceIds } = job.data;

  console.log(`Finding partner for booking ${bookingId}`);

  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.id, bookingId),
  });

  if (!booking) {
    throw new Error(`Booking ${bookingId} not found`);
  }

  if (booking.status !== "PENDING_MATCH") {
    console.log(`Booking ${bookingId} not in PENDING_MATCH status`);
    return { bookingId, matched: false, reason: "Invalid status" };
  }

  const availablePartners = await db.query.partners.findMany({
    where: and(
      eq(partners.status, "approved"),
      eq(partners.availabilityStatus, "online")
    ),
    with: {
      user: true,
      services: true,
    },
  });

  const serviceIdSet =
    (serviceIds?.length ?? 0) > 0 ? new Set(serviceIds) : null;

  const capabilityFiltered = serviceIdSet
    ? availablePartners.filter((p) =>
        (p.services || []).some(
          (s) => s.isActive && s.serviceId && serviceIdSet.has(s.serviceId)
        )
      )
    : availablePartners;

  const partnersWithDistance = await Promise.all(
    capabilityFiltered.map(async (partner) => {
      const location = await db.query.partnerLocations.findFirst({
        where: eq(partnerLocations.partnerId, partner.id),
        orderBy: [desc(partnerLocations.recordedAt)],
      });

      const distance = location
        ? calculateDistance(latitude, longitude, location.latitude, location.longitude)
        : Infinity;

      return { partner, distance, location };
    })
  );

  const eligiblePartners = partnersWithDistance
    .filter((p) => p.distance <= (p.partner.serviceRadius || 10))
    .sort((a, b) => {
      const scoreA = calculateScore(a.partner, a.distance);
      const scoreB = calculateScore(b.partner, b.distance);
      return scoreB - scoreA;
    });

  if (eligiblePartners.length === 0) {
    console.log(`No eligible partners found for booking ${bookingId}`);

    if (job.attemptsMade < 4) {
      throw new Error("No partners available, will retry");
    }

    await db
      .update(bookings)
      .set({
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancellationReason: "NO_PARTNERS_FOUND",
        cancellationNote: "No partners available in your area",
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, bookingId));

    await notificationQueue.add("no-partners", {
      type: "BOOKING_CREATED",
      userId: booking.userId,
      title: "No Partners Available",
      body: "Unfortunately, no partners are available in your area. Your booking has been cancelled.",
      data: {
        referenceType: "booking",
        referenceId: bookingId,
      },
    });

    return { bookingId, matched: false, reason: "No partners available" };
  }

  const selectedPartner = eligiblePartners[0];

  await db
    .update(bookings)
    .set({
      partnerId: selectedPartner.partner.id,
      status: "MATCHED",
      updatedAt: new Date(),
    })
    .where(eq(bookings.id, bookingId));

  await db
    .update(partners)
    .set({ availabilityStatus: "busy", updatedAt: new Date() })
    .where(eq(partners.id, selectedPartner.partner.id));

  await db.insert(bookingStatusHistory).values({
    bookingId,
    fromStatus: "PENDING_MATCH",
    toStatus: "MATCHED",
    reason: `Partner ${selectedPartner.partner.id} assigned automatically`,
  });

  await notificationQueue.add("partner-assigned", {
    type: "PARTNER_ASSIGNED",
    userId: booking.userId,
    title: "Partner Assigned",
    body: `${selectedPartner.partner.user.firstName || "A partner"} has been assigned to your booking.`,
    data: {
      referenceType: "booking",
      referenceId: bookingId,
      partnerId: selectedPartner.partner.id,
    },
  });

  console.log(
    `Partner ${selectedPartner.partner.id} assigned to booking ${bookingId}`
  );

  return {
    bookingId,
    matched: true,
    partnerId: selectedPartner.partner.id,
    distance: selectedPartner.distance,
  };
}

function calculateScore(
  partner: { averageRating: string | null; completedBookings: number | null },
  distance: number
): number {
  const rating = partner.averageRating ? parseFloat(partner.averageRating) : 3;
  const completedBookings = partner.completedBookings || 0;
  const distanceScore = Math.max(0, 10 - distance);

  return rating * 2 + Math.min(completedBookings / 10, 3) + distanceScore * 0.5;
}

export const partnerMatchingWorker = new Worker<PartnerMatchingJobData>(
  "partner-matching-queue",
  processPartnerMatching,
  {
    connection: redis,
    concurrency: 5,
  }
);

partnerMatchingWorker.on("completed", (job) => {
  console.log(`Partner matching job ${job.id} completed`);
});

partnerMatchingWorker.on("failed", (job, err) => {
  console.error(`Partner matching job ${job?.id} failed:`, err);
});
