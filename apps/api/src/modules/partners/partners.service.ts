import { eq, and, desc, ne, sql, inArray } from "@subito/db"

import { db } from "@subito/db"
import { NotFoundError, BadRequestError, ForbiddenError } from "@/lib/errors"
import { encryptPii } from "@/lib/pii-crypto"
import {
  partners,
  partnerLocations,
  partnerServices,
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
