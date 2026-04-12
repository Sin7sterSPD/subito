import { db } from "@subito/db";
import { ratings, bookings, partners } from "@subito/db/schema";
import { eq, and } from "drizzle-orm";
import { NotFoundError, BadRequestError, ForbiddenError } from "../../lib/errors";

export async function getRating(userId: string, bookingId: string) {
  const booking = await db.query.bookings.findFirst({
    where: and(eq(bookings.id, bookingId), eq(bookings.userId, userId)),
  });

  if (!booking) {
    throw new NotFoundError("Booking");
  }

  const existingRating = await db.query.ratings.findFirst({
    where: and(eq(ratings.bookingId, bookingId), eq(ratings.userId, userId)),
  });

  return {
    rating: existingRating,
    canRate: booking.status === "COMPLETED" && !existingRating,
    bookingCompleted: booking.status === "COMPLETED",
  };
}

export async function submitRating(
  userId: string,
  data: {
    bookingId: string;
    rating: number;
    comment?: string;
    partnerId?: string;
    tags?: string[];
    serviceQuality?: number;
    punctuality?: number;
    professionalism?: number;
    cleanliness?: number;
    isAnonymous?: boolean;
  }
) {
  const booking = await db.query.bookings.findFirst({
    where: and(eq(bookings.id, data.bookingId), eq(bookings.userId, userId)),
  });

  if (!booking) {
    throw new NotFoundError("Booking");
  }

  if (booking.status !== "COMPLETED") {
    throw new BadRequestError("Can only rate completed bookings");
  }

  const existingRating = await db.query.ratings.findFirst({
    where: and(
      eq(ratings.bookingId, data.bookingId),
      eq(ratings.userId, userId)
    ),
  });

  if (existingRating && existingRating.status === "SUBMITTED") {
    throw new BadRequestError("Rating already submitted for this booking");
  }

  const partnerId = data.partnerId || booking.partnerId;

  const [newRating] = await db
    .insert(ratings)
    .values({
      bookingId: data.bookingId,
      userId,
      partnerId,
      status: "SUBMITTED",
      rating: data.rating,
      comment: data.comment,
      tags: data.tags,
      serviceQuality: data.serviceQuality,
      punctuality: data.punctuality,
      professionalism: data.professionalism,
      cleanliness: data.cleanliness,
      isAnonymous: data.isAnonymous,
    })
    .returning();

  if (partnerId) {
    await updatePartnerRating(partnerId);
  }

  return {
    submitted: true,
    rating: newRating,
  };
}

export async function discardRating(userId: string, ratingId: string) {
  const rating = await db.query.ratings.findFirst({
    where: eq(ratings.id, ratingId),
  });

  if (!rating) {
    throw new NotFoundError("Rating");
  }

  if (rating.userId !== userId) {
    throw new ForbiddenError();
  }

  if (rating.status !== "PENDING") {
    throw new BadRequestError("Can only discard pending ratings");
  }

  await db
    .update(ratings)
    .set({
      status: "DISCARDED",
      discardedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(ratings.id, ratingId));

  return { discarded: true };
}

async function updatePartnerRating(partnerId: string) {
  const partnerRatings = await db.query.ratings.findMany({
    where: and(
      eq(ratings.partnerId, partnerId),
      eq(ratings.status, "SUBMITTED")
    ),
  });

  if (partnerRatings.length === 0) return;

  const totalRating = partnerRatings.reduce((sum, r) => sum + r.rating, 0);
  const averageRating = totalRating / partnerRatings.length;

  await db
    .update(partners)
    .set({
      averageRating: averageRating.toFixed(2),
      totalRatings: partnerRatings.length,
      updatedAt: new Date(),
    })
    .where(eq(partners.id, partnerId));
}
