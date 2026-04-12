import { db } from "@subito/db";
import {
  partners,
  partnerLocations,
  partnerServices,
  bookings,
  bookingStatusHistory,
  ratings,
} from "@subito/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { NotFoundError, BadRequestError } from "../../lib/errors";
import { calculateDistance } from "../../utils/helpers";

interface AvailablePartnersQuery {
  latitude: number;
  longitude: number;
  serviceId?: string;
  bookingId?: string;
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
  });

  const partnersWithDistance = await Promise.all(
    allPartners.map(async (partner) => {
      const latestLocation = await db.query.partnerLocations.findFirst({
        where: eq(partnerLocations.partnerId, partner.id),
        orderBy: [desc(partnerLocations.recordedAt)],
      });

      const distance = latestLocation
        ? calculateDistance(
            query.latitude,
            query.longitude,
            latestLocation.latitude,
            latestLocation.longitude
          )
        : Infinity;

      return {
        ...partner,
        distance,
        location: latestLocation,
      };
    })
  );

  const filteredPartners = partnersWithDistance
    .filter((p) => p.distance <= (p.serviceRadius || 10))
    .sort((a, b) => {
      const scoreA = calculatePartnerScore(a);
      const scoreB = calculatePartnerScore(b);
      return scoreB - scoreA;
    });

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
  };
}

function calculatePartnerScore(partner: {
  averageRating: string | null;
  completedBookings: number | null;
  distance: number;
}): number {
  const rating = partner.averageRating ? parseFloat(partner.averageRating) : 3;
  const bookings = partner.completedBookings || 0;
  const distanceScore = Math.max(0, 10 - partner.distance);

  return rating * 2 + Math.min(bookings / 10, 3) + distanceScore * 0.5;
}

export async function assignPartner(data: {
  bookingId: string;
  partnerId: string;
}) {
  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.id, data.bookingId),
  });

  if (!booking) {
    throw new NotFoundError("Booking");
  }

  const partner = await db.query.partners.findFirst({
    where: eq(partners.id, data.partnerId),
  });

  if (!partner) {
    throw new NotFoundError("Partner");
  }

  if (partner.availabilityStatus !== "online") {
    throw new BadRequestError("Partner is not available");
  }

  await db
    .update(bookings)
    .set({
      partnerId: data.partnerId,
      status: "MATCHED",
      updatedAt: new Date(),
    })
    .where(eq(bookings.id, data.bookingId));

  await db
    .update(partners)
    .set({ availabilityStatus: "busy", updatedAt: new Date() })
    .where(eq(partners.id, data.partnerId));

  await db.insert(bookingStatusHistory).values({
    bookingId: data.bookingId,
    fromStatus: booking.status,
    toStatus: "MATCHED",
    reason: `Partner ${data.partnerId} assigned`,
  });

  return { assigned: true, bookingId: data.bookingId, partnerId: data.partnerId };
}

export async function getPartnerById(partnerId: string) {
  const partner = await db.query.partners.findFirst({
    where: eq(partners.id, partnerId),
    with: {
      user: true,
      services: true,
    },
  });

  if (!partner) {
    throw new NotFoundError("Partner");
  }

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
  };
}

export async function updatePartnerStatus(
  partnerId: string,
  data: {
    status: "EN_ROUTE" | "ARRIVED" | "WORKING" | "COMPLETED";
    bookingId: string;
  }
) {
  const booking = await db.query.bookings.findFirst({
    where: and(
      eq(bookings.id, data.bookingId),
      eq(bookings.partnerId, partnerId)
    ),
  });

  if (!booking) {
    throw new NotFoundError("Booking");
  }

  const statusMap: Record<string, string> = {
    EN_ROUTE: "ARRIVING",
    ARRIVED: "ARRIVING",
    WORKING: "STARTED",
    COMPLETED: "COMPLETED",
  };

  const newBookingStatus = statusMap[data.status] as any;

  const updateData: Record<string, unknown> = {
    status: newBookingStatus,
    updatedAt: new Date(),
  };

  if (data.status === "WORKING") {
    updateData.startedAt = new Date();
  } else if (data.status === "COMPLETED") {
    updateData.completedAt = new Date();
  }

  await db.update(bookings).set(updateData).where(eq(bookings.id, data.bookingId));

  await db.insert(bookingStatusHistory).values({
    bookingId: data.bookingId,
    fromStatus: booking.status,
    toStatus: newBookingStatus,
    reason: `Partner status: ${data.status}`,
  });

  if (data.status === "COMPLETED") {
    await db
      .update(partners)
      .set({
        availabilityStatus: "online",
        completedBookings: (booking.partnerId ? 1 : 0),
        updatedAt: new Date(),
      })
      .where(eq(partners.id, partnerId));
  }

  return { updated: true, status: data.status };
}

export async function updatePartnerLocation(
  partnerId: string,
  data: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    heading?: number;
    speed?: number;
  }
) {
  await db.insert(partnerLocations).values({
    partnerId,
    latitude: data.latitude,
    longitude: data.longitude,
    accuracy: data.accuracy,
    heading: data.heading,
    speed: data.speed,
  });

  return { updated: true };
}

export async function getPartnerRatings(partnerId: string) {
  const partner = await db.query.partners.findFirst({
    where: eq(partners.id, partnerId),
  });

  if (!partner) {
    throw new NotFoundError("Partner");
  }

  const partnerRatings = await db.query.ratings.findMany({
    where: eq(ratings.partnerId, partnerId),
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
  });

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
  };
}
