import { eq, and, desc, ne, sql, inArray } from "@subito/db"

import { db } from "@subito/db"
import { NotFoundError, BadRequestError, ForbiddenError } from "@/lib/errors"
import { encryptPii } from "@/lib/pii-crypto"
import {
  partners,
  partnerLocations,
  bookings,
  bookingStatusHistory,
  ratings,
} from "@subito/db"

import { calculateDistance, calculatePartnerMatchScore } from "@subito/shared"

interface AvailablePartnersQuery {
  latitude: number
  longitude: number
  serviceId?: string
  bookingId?: string
}

export async function findAvailablePartners(query: AvailablePartnersQuery) {
  const allPartners = await db.query.partners.findMany({
    where: and(
      eq(partners.status, "approved"),
      eq(partners.availabilityStatus, "online")
    ),
    with: {
      user: true,
      services: true,
    },
  })

  const partnerIds = allPartners.map((p) => p.id)
  const locRows =
    partnerIds.length > 0
      ? await db
          .select()
          .from(partnerLocations)
          .where(inArray(partnerLocations.partnerId, partnerIds))
          .orderBy(desc(partnerLocations.recordedAt))
      : []

  const latestByPartnerId = new Map<string, (typeof locRows)[number]>()
  for (const loc of locRows) {
    if (!latestByPartnerId.has(loc.partnerId)) {
      latestByPartnerId.set(loc.partnerId, loc)
    }
  }

  const partnersWithDistance = allPartners.map((partner) => {
    const latestLocation = latestByPartnerId.get(partner.id)
    const distance = latestLocation
      ? calculateDistance(
          query.latitude,
          query.longitude,
          latestLocation.latitude,
          latestLocation.longitude
        )
      : Infinity

    return {
      ...partner,
      distance,
      location: latestLocation,
    }
  })

  const filteredPartners = partnersWithDistance
    .filter((p) => p.distance <= (p.serviceRadius || 10))
    .sort((a, b) => {
      const scoreA = calculatePartnerMatchScore({
        averageRating: a.averageRating,
        completedBookings: a.completedBookings,
        distanceKm: a.distance,
      })
      const scoreB = calculatePartnerMatchScore({
        averageRating: b.averageRating,
        completedBookings: b.completedBookings,
        distanceKm: b.distance,
      })
      return scoreB - scoreA
    })

  return {
    partners: filteredPartners.slice(0, 10).map((p) => ({
      id: p.id,
      userId: p.userId,
      name: `${p.user.firstName || ""} ${p.user.lastName || ""}`.trim(),
      phone: p.user.phone,
      profileImage: p.user.profileImage,
      rating: p.averageRating,
      totalRatings: p.totalRatings,
      completedBookings: p.completedBookings,
      distance: p.distance,
      location: p.location
        ? {
            latitude: p.location.latitude,
            longitude: p.location.longitude,
          }
        : null,
    })),
  }
}

export async function assignPartner(data: {
  bookingId: string
  partnerId: string
}) {
  return await db.transaction(async (tx) => {
    const [booking] = await tx
      .select()
      .from(bookings)
      .where(eq(bookings.id, data.bookingId))
      .for("update")

    if (!booking) {
      throw new NotFoundError("Booking")
    }
    if (booking.status !== "PENDING_MATCH") {
      throw new BadRequestError(
        `Booking cannot be assigned in status ${booking.status}`
      )
    }

    const [partner] = await tx
      .select()
      .from(partners)
      .where(eq(partners.id, data.partnerId))
      .for("update")

    if (!partner) {
      throw new NotFoundError("Partner")
    }
    if (partner.status !== "approved") {
      throw new BadRequestError("Partner is not approved")
    }

    if (partner.availabilityStatus !== "online") {
      throw new BadRequestError("Partner is not available")
    }

    await tx
      .update(bookings)
      .set({
        partnerId: data.partnerId,
        status: "MATCHED",
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, data.bookingId))

    await tx
      .update(partners)
      .set({ availabilityStatus: "busy", updatedAt: new Date() })
      .where(eq(partners.id, data.partnerId))

    await tx.insert(bookingStatusHistory).values({
      bookingId: data.bookingId,
      fromStatus: booking.status,
      toStatus: "MATCHED",
      reason: `Partner ${data.partnerId} assigned`,
    })

    return {
      assigned: true,
      bookingId: data.bookingId,
      partnerId: data.partnerId,
    }
  })
}

function mapPartnerRow(partner: {
  id: string
  userId: string
  status: string
  availabilityStatus: string
  averageRating: string | null
  totalRatings: number | null
  totalBookings: number | null
  completedBookings: number | null
  user: {
    firstName: string | null
    lastName: string | null
    phone: string
    profileImage: string | null
  }
  services: {
    id: string
    partnerId: string
    serviceId: string
    isActive: boolean
  }[]
}) {
  return {
    id: partner.id,
    userId: partner.userId,
    name: `${partner.user.firstName || ""} ${partner.user.lastName || ""}`.trim(),
    phone: partner.user.phone,
    profileImage: partner.user.profileImage,
    status: partner.status,
    availabilityStatus: partner.availabilityStatus,
    rating: partner.averageRating,
    totalRatings: partner.totalRatings,
    totalBookings: partner.totalBookings,
    completedBookings: partner.completedBookings,
    services: partner.services,
  }
}

export async function getPartnerById(partnerId: string) {
  const partner = await db.query.partners.findFirst({
    where: eq(partners.id, partnerId),
    with: {
      user: true,
      services: true,
    },
  })

  if (!partner) {
    throw new NotFoundError("Partner")
  }

  return mapPartnerRow(partner)
}

/** Partner app: resolve partner record from auth user id. */
export async function getPartnerByUserId(userId: string) {
  const partner = await db.query.partners.findFirst({
    where: eq(partners.userId, userId),
    with: {
      user: true,
      services: true,
    },
  })

  if (!partner) {
    throw new NotFoundError("Partner")
  }

  return mapPartnerRow(partner)
}

/** Active assignments for the logged-in partner (excludes cancelled). */
export async function listBookingsForPartnerUser(
  userId: string,
  query: { page: number; limit: number } = { page: 1, limit: 50 }
) {
  const partner = await db.query.partners.findFirst({
    where: eq(partners.userId, userId),
    columns: { id: true },
  })

  if (!partner) {
    throw new NotFoundError("Partner")
  }

  const limit = Math.min(Math.max(1, query.limit), 100)
  const offset = (Math.max(1, query.page) - 1) * limit

  const [rows, countResult] = await Promise.all([
    db.query.bookings.findMany({
      where: and(
        eq(bookings.partnerId, partner.id),
        ne(bookings.status, "CANCELLED")
      ),
      orderBy: [desc(bookings.updatedAt)],
      limit,
      offset,
      with: {
        address: true,
        items: { limit: 40 },
      },
    }),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(bookings)
      .where(
        and(
          eq(bookings.partnerId, partner.id),
          ne(bookings.status, "CANCELLED")
        )
      ),
  ])

  const total = countResult[0]?.count ?? 0

  return {
    bookings: rows,
    meta: {
      page: query.page,
      limit,
      total,
      hasMore: query.page * limit < total,
    },
  }
}

export async function acknowledgePartnerRelease(
  partnerRecordId: string,
  bookingId: string,
  actingUserId: string,
  actingRole: "customer" | "partner" | "admin"
) {
  if (actingRole !== "admin") {
    const partner = await db.query.partners.findFirst({
      where: eq(partners.id, partnerRecordId),
    })
    if (!partner || partner.userId !== actingUserId) {
      throw new ForbiddenError()
    }
  }

  await db.transaction(async (tx) => {
    const [booking] = await tx
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.id, bookingId),
          eq(bookings.partnerId, partnerRecordId),
          eq(bookings.cancellationAwaitingPartnerAck, true)
        )
      )
      .for("update")

    if (!booking) {
      throw new NotFoundError("Booking")
    }

    await tx
      .update(bookings)
      .set({
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancellationAwaitingPartnerAck: false,
        partnerReleaseAcknowledgedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, bookingId))

    await tx
      .update(partners)
      .set({ availabilityStatus: "online", updatedAt: new Date() })
      .where(eq(partners.id, partnerRecordId))

    await tx.insert(bookingStatusHistory).values({
      bookingId,
      fromStatus: booking.status,
      toStatus: "CANCELLED",
      reason: "Partner acknowledged release; customer cancellation completed",
    })
  })

  return { acknowledged: true, bookingId }
}

export async function updatePartnerStatus(
  partnerId: string,
  data: {
    status: "EN_ROUTE" | "ARRIVED" | "WORKING" | "COMPLETED"
    bookingId: string
  }
) {
  const statusMap: Record<string, string> = {
    EN_ROUTE: "ARRIVING",
    ARRIVED: "ARRIVING",
    WORKING: "STARTED",
    COMPLETED: "COMPLETED",
  }

  const newBookingStatus = statusMap[data.status] as
    | "ARRIVING"
    | "STARTED"
    | "COMPLETED"

  const updateData: Record<string, unknown> = {
    status: newBookingStatus,
    updatedAt: new Date(),
  }

  if (data.status === "WORKING") {
    updateData.startedAt = new Date()
  } else if (data.status === "COMPLETED") {
    updateData.completedAt = new Date()
  }

  await db.transaction(async (tx) => {
    const [booking] = await tx
      .select()
      .from(bookings)
      .where(
        and(eq(bookings.id, data.bookingId), eq(bookings.partnerId, partnerId))
      )
      .for("update")

    if (!booking) {
      throw new NotFoundError("Booking")
    }
    // chekc this later
    //     const allowedTransitions = {
    //       MATCHED: ["ARRIVING"],
    //       ARRIVING: ["STARTED"],
    //       STARTED: ["COMPLETED"],
    //     } as const

    //     if (
    //       !allowedTransitions[
    //         booking.status as keyof typeof allowedTransitions
    //       ]?.includes(newBookingStatus)
    //     ) {
    //       throw new BadRequestError(
    //         `Cannot transition from ${booking.status} to ${newBookingStatus}`
    //       )
    //     }
    //     leaving here so come back again

    await tx
      .update(bookings)
      .set(updateData)
      .where(eq(bookings.id, data.bookingId))

    await tx.insert(bookingStatusHistory).values({
      bookingId: data.bookingId,
      fromStatus: booking.status,
      toStatus: newBookingStatus,
      reason: `Partner status: ${data.status}`,
    })

    if (data.status === "COMPLETED") {
      await tx
        .update(partners)
        .set({
          availabilityStatus: "online",
          completedBookings: sql`COALESCE(${partners.completedBookings}, 0) + 1`,
          updatedAt: new Date(),
        })
        .where(eq(partners.id, partnerId))
    }
  })

  return { updated: true, status: data.status }
}

export async function updatePartnerLocation(
  partnerId: string,
  data: {
    latitude: number
    longitude: number
    accuracy?: number
    heading?: number
    speed?: number
  }
) {
  await db.insert(partnerLocations).values({
    partnerId,
    latitude: data.latitude,
    longitude: data.longitude,
    accuracy: data.accuracy,
    heading: data.heading,
    speed: data.speed,
  })

  return { updated: true }
}

export async function getPartnerRatings(partnerId: string) {
  const partner = await db.query.partners.findFirst({
    where: eq(partners.id, partnerId),
  })

  if (!partner) {
    throw new NotFoundError("Partner")
  }

  const partnerRatings = await db.query.ratings.findMany({
    where: and(
      eq(ratings.partnerId, partnerId),
      eq(ratings.status, "SUBMITTED")
    ),
    orderBy: [desc(ratings.createdAt)],
    limit: 50,
    with: {
      user: {
        columns: {
          firstName: true,
          lastName: true,
          profileImage: true,
        },
      },
    },
  })

  return {
    averageRating: partner.averageRating,
    totalRatings: partner.totalRatings,
    ratings: partnerRatings.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      tags: r.tags,
      createdAt: r.createdAt,
      user: r.isAnonymous
        ? null
        : {
            name: `${r.user.firstName || ""} ${r.user.lastName || ""}`.trim(),
            profileImage: r.user.profileImage,
          },
    })),
  }
}

export async function updatePartnerKyc(
  partnerId: string,
  actingUserId: string,
  data: {
    aadharNumber?: string | null
    panNumber?: string | null
    bankAccountNumber?: string | null
  }
) {
  const partner = await db.query.partners.findFirst({
    where: eq(partners.id, partnerId),
  })

  if (!partner) {
    throw new NotFoundError("Partner")
  }
  if (partner.userId !== actingUserId) {
    throw new ForbiddenError()
  }

  const hasField =
    data.aadharNumber !== undefined ||
    data.panNumber !== undefined ||
    data.bankAccountNumber !== undefined
  if (!hasField) {
    throw new BadRequestError("No KYC fields to update")
  }

  const patch: Record<string, unknown> = { updatedAt: new Date() }

  if (data.aadharNumber !== undefined) {
    patch.aadharNumber =
      data.aadharNumber == null || data.aadharNumber === ""
        ? null
        : encryptPii(data.aadharNumber)
  }
  if (data.panNumber !== undefined) {
    patch.panNumber =
      data.panNumber == null || data.panNumber === ""
        ? null
        : encryptPii(data.panNumber)
  }
  if (data.bankAccountNumber !== undefined) {
    patch.bankAccountNumber =
      data.bankAccountNumber == null || data.bankAccountNumber === ""
        ? null
        : encryptPii(data.bankAccountNumber)
  }

  await db.update(partners).set(patch).where(eq(partners.id, partnerId))

  return { updated: true }
}

/** Use when persisting or reading `aadharNumber` / `panNumber` / `bankAccountNumber` (set `PII_ENCRYPTION_KEY` in production). */
export { decryptPii } from "../../lib/pii-crypto"
export { encryptPii }
