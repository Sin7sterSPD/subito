import { Worker, Job } from "bullmq"
import { db } from "@subito/db"
import {
  bookings,
  partners,
  partnerLocations,
  bookingStatusHistory,
} from "@subito/db/schema"
import { eq, and, desc, inArray } from "@subito/db"
import { calculateDistance, calculatePartnerMatchScore } from "@subito/shared"
import { redis } from "../lib/redis"
import { log } from "../lib/logger"
import type { PartnerMatchingJobData } from "../queues"
import { notificationQueue, bookingStatusQueue } from "../queues"

async function processPartnerMatching(job: Job<PartnerMatchingJobData>) {
  const { bookingId, latitude, longitude, serviceIds } = job.data

  log.info({ bookingId }, "Finding partner for booking")

  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.id, bookingId),
  })

  if (!booking) {
    throw new Error(`Booking ${bookingId} not found`)
  }

  if (booking.status !== "PENDING_MATCH") {
    log.info({ bookingId }, "Booking not in PENDING_MATCH status")
    return { bookingId, matched: false, reason: "Invalid status" }
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
  })

  const serviceIdSet =
    (serviceIds?.length ?? 0) > 0 ? new Set(serviceIds) : null

  const capabilityFiltered = serviceIdSet
    ? availablePartners.filter((p) =>
        (p.services || []).some(
          (s) => s.isActive && s.serviceId && serviceIdSet.has(s.serviceId)
        )
      )
    : availablePartners

  const partnerIds = capabilityFiltered.map((p) => p.id)

  const latestLocations =
    partnerIds.length > 0
      ? await db
          .select()
          .from(partnerLocations)
          .where(inArray(partnerLocations.partnerId, partnerIds))
          .orderBy(desc(partnerLocations.recordedAt))
      : []

  const locationsByPartnerId = new Map<string, (typeof latestLocations)[0]>()
  for (const loc of latestLocations) {
    if (!locationsByPartnerId.has(loc.partnerId)) {
      locationsByPartnerId.set(loc.partnerId, loc)
    }
  }

  const partnersWithDistance = capabilityFiltered.map((partner) => {
    const location = locationsByPartnerId.get(partner.id)
    const distance = location
      ? calculateDistance(
          latitude,
          longitude,
          location.latitude,
          location.longitude
        )
      : Infinity

    return { partner, distance, location }
  })

  const eligiblePartners = partnersWithDistance
    .filter((p) => p.distance <= (p.partner.serviceRadius || 10))
    .sort((a, b) => {
      const scoreA = calculatePartnerMatchScore({
        averageRating: a.partner.averageRating,
        completedBookings: a.partner.completedBookings,
        distanceKm: a.distance,
      })
      const scoreB = calculatePartnerMatchScore({
        averageRating: b.partner.averageRating,
        completedBookings: b.partner.completedBookings,
        distanceKm: b.distance,
      })
      return scoreB - scoreA
    })

  if (eligiblePartners.length === 0) {
    log.info({ bookingId }, "No eligible partners found for booking")

    if (job.attemptsMade < 4) {
      throw new Error("No partners available, will retry")
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
      .where(eq(bookings.id, bookingId))

    await notificationQueue.add("no-partners", {
      type: "BOOKING_CREATED",
      userId: booking.userId,
      title: "No Partners Available",
      body: "Unfortunately, no partners are available in your area. Your booking has been cancelled.",
      data: {
        referenceType: "booking",
        referenceId: bookingId,
      },
    })

    return { bookingId, matched: false, reason: "No partners available" }
  }

  const selectedPartner = eligiblePartners[0]

  await db.transaction(async (tx) => {
    const [lockedBooking] = await tx
      .select()
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .for("update")

    if (!lockedBooking || lockedBooking.status !== "PENDING_MATCH") {
      return
    }

    const [lockedPartner] = await tx
      .select()
      .from(partners)
      .where(eq(partners.id, selectedPartner.partner.id))
      .for("update")

    if (!lockedPartner || lockedPartner.availabilityStatus !== "online") {
      throw new Error("Selected partner is no longer available, will retry")
    }

    await tx
      .update(bookings)
      .set({
        partnerId: selectedPartner.partner.id,
        status: "MATCHED",
        updatedAt: new Date(),
      })
      .where(
        and(eq(bookings.id, bookingId), eq(bookings.status, "PENDING_MATCH"))
      )

    await tx
      .update(partners)
      .set({ availabilityStatus: "busy", updatedAt: new Date() })
      .where(eq(partners.id, selectedPartner.partner.id))

    await tx.insert(bookingStatusHistory).values({
      bookingId,
      fromStatus: "PENDING_MATCH",
      toStatus: "MATCHED",
      reason: `Partner ${selectedPartner.partner.id} assigned automatically`,
    })
  })

  const afterAssign = await db.query.bookings.findFirst({
    where: eq(bookings.id, bookingId),
    columns: { status: true, partnerId: true },
  })
  if (afterAssign?.status !== "MATCHED") {
    return {
      bookingId,
      matched: false,
      reason: "Concurrent assignment or status changed",
    }
  }

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
  })

  log.info(
    { partnerId: selectedPartner.partner.id, bookingId },
    "Partner assigned to booking"
  )

  return {
    bookingId,
    matched: true,
    partnerId: selectedPartner.partner.id,
    distance: selectedPartner.distance,
  }
}

export const partnerMatchingWorker = new Worker<PartnerMatchingJobData>(
  "partner-matching-queue",
  processPartnerMatching,
  {
    connection: redis,
    concurrency: 5,
  }
)

partnerMatchingWorker.on("completed", (job) => {
  log.info({ jobId: job.id }, "Partner matching job completed")
})

partnerMatchingWorker.on("failed", (job, err) => {
  log.error({ jobId: job?.id, err }, "Partner matching job failed")
})
