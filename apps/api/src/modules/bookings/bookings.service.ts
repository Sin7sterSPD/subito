import { db } from "@subito/db";
import {
  bookings,
  bookingItems,
  bookingSlots,
  bookingInstances,
  recurringBookings,
  bookingStatusHistory,
  partnerLocations,
  refunds,
} from "@subito/db/schema";
import { eq, and, inArray, desc, gte, lte } from "drizzle-orm";
import { NotFoundError, ForbiddenError, BadRequestError } from "../../lib/errors";

interface BookingsQuery {
  page: number;
  limit: number;
  status?: string[];
  bookingType?: string[];
}

export async function getBookings(userId: string, query: BookingsQuery) {
  const conditions = [eq(bookings.userId, userId)];

  if (query.status && query.status.length > 0) {
    conditions.push(inArray(bookings.status, query.status as any));
  }

  const allBookings = await db.query.bookings.findMany({
    where: and(...conditions),
    with: {
      items: true,
      address: true,
      partner: {
        with: {
          user: true,
        },
      },
    },
    orderBy: [desc(bookings.createdAt)],
    limit: query.limit,
    offset: (query.page - 1) * query.limit,
  });

  return {
    bookings: allBookings,
    meta: {
      page: query.page,
      limit: query.limit,
      total: allBookings.length,
      hasMore: allBookings.length === query.limit,
    },
  };
}

export async function getBookingsV2(userId: string, query: BookingsQuery) {
  const conditions = [eq(bookings.userId, userId)];

  if (query.status && query.status.length > 0) {
    conditions.push(inArray(bookings.status, query.status as any));
  }

  if (query.bookingType && query.bookingType.length > 0) {
    conditions.push(inArray(bookings.bookingType, query.bookingType as any));
  }

  const allBookings = await db.query.bookings.findMany({
    where: and(...conditions),
    with: {
      items: {
        with: {
          catalog: {
            with: {
              listing: true,
            },
          },
        },
      },
      address: true,
      partner: {
        with: {
          user: true,
        },
      },
      hub: true,
      coupon: true,
    },
    orderBy: [desc(bookings.createdAt)],
    limit: query.limit,
    offset: (query.page - 1) * query.limit,
  });

  return {
    bookings: allBookings,
    meta: {
      page: query.page,
      limit: query.limit,
      total: allBookings.length,
      hasMore: allBookings.length === query.limit,
    },
  };
}

export async function getBookingById(userId: string, bookingId: string) {
  const booking = await db.query.bookings.findFirst({
    where: and(eq(bookings.id, bookingId), eq(bookings.userId, userId)),
    with: {
      items: {
        with: {
          catalog: {
            with: {
              listing: true,
            },
          },
        },
      },
      address: true,
      partner: {
        with: {
          user: true,
        },
      },
      hub: true,
      coupon: true,
      recurringConfig: {
        with: {
          instances: true,
        },
      },
    },
  });

  if (!booking) {
    throw new NotFoundError("Booking");
  }

  return booking;
}

export async function getLatestBooking(userId: string) {
  const booking = await db.query.bookings.findFirst({
    where: and(
      eq(bookings.userId, userId),
      inArray(bookings.status, ["PENDING_MATCH", "MATCHED", "ARRIVING", "STARTED"])
    ),
    with: {
      items: true,
      address: true,
      partner: {
        with: {
          user: true,
        },
      },
    },
    orderBy: [desc(bookings.createdAt)],
  });

  return booking;
}

export async function getAvailableSlots(query: {
  lat: number;
  lng: number;
  bookingType?: string;
  time?: string;
  days: number;
}) {
  const now = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + query.days);

  const slots = await db.query.bookingSlots.findMany({
    where: and(
      eq(bookingSlots.isAvailable, true),
      gte(bookingSlots.date, now),
      lte(bookingSlots.date, endDate)
    ),
    orderBy: [bookingSlots.date, bookingSlots.startTime],
  });

  const groupedSlots: Record<string, typeof slots> = {};
  for (const slot of slots) {
    const dateKey = slot.date.toISOString().split("T")[0];
    if (!groupedSlots[dateKey]) {
      groupedSlots[dateKey] = [];
    }
    groupedSlots[dateKey].push(slot);
  }

  return {
    slots: groupedSlots,
    availableDates: Object.keys(groupedSlots),
  };
}

export async function getPartnerLocation(userId: string, bookingId: string) {
  const booking = await db.query.bookings.findFirst({
    where: and(eq(bookings.id, bookingId), eq(bookings.userId, userId)),
  });

  if (!booking) {
    throw new NotFoundError("Booking");
  }

  if (!booking.partnerId) {
    return { location: null };
  }

  const location = await db.query.partnerLocations.findFirst({
    where: eq(partnerLocations.partnerId, booking.partnerId),
    orderBy: [desc(partnerLocations.recordedAt)],
  });

  return {
    location: location
      ? {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          heading: location.heading,
          speed: location.speed,
          recordedAt: location.recordedAt,
        }
      : null,
  };
}

export async function getChildBookings(userId: string, parentId: string) {
  const parent = await db.query.bookings.findFirst({
    where: and(eq(bookings.id, parentId), eq(bookings.userId, userId)),
  });

  if (!parent) {
    throw new NotFoundError("Parent booking");
  }

  const recurringConfig = await db.query.recurringBookings.findFirst({
    where: eq(recurringBookings.bookingId, parentId),
    with: {
      instances: {
        orderBy: [bookingInstances.instanceNumber],
      },
    },
  });

  return {
    parentBooking: parent,
    instances: recurringConfig?.instances || [],
  };
}

export async function getRefundDetails(userId: string, bookingId: string) {
  const booking = await db.query.bookings.findFirst({
    where: and(eq(bookings.id, bookingId), eq(bookings.userId, userId)),
  });

  if (!booking) {
    throw new NotFoundError("Booking");
  }

  const refundRecords = await db.query.refunds.findMany({
    where: eq(refunds.bookingId, bookingId),
    orderBy: [desc(refunds.createdAt)],
  });

  return {
    booking,
    refunds: refundRecords,
  };
}

export async function getBridgingContext(bookingId: string) {
  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.id, bookingId),
    with: {
      items: true,
      address: true,
      partner: true,
    },
  });

  if (!booking) {
    throw new NotFoundError("Booking");
  }

  return {
    bookingId: booking.id,
    status: booking.status,
    partnerId: booking.partnerId,
    addressId: booking.addressId,
    metadata: booking.metadata,
  };
}

export async function cancelBooking(
  userId: string,
  data: { bookingId: string; reason: string }
) {
  const booking = await db.query.bookings.findFirst({
    where: and(eq(bookings.id, data.bookingId), eq(bookings.userId, userId)),
  });

  if (!booking) {
    throw new NotFoundError("Booking");
  }

  const cancellableStatuses = ["PENDING_PAYMENT", "PENDING_MATCH", "MATCHED"];
  if (!cancellableStatuses.includes(booking.status)) {
    throw new BadRequestError(
      `Booking in status ${booking.status} cannot be cancelled`
    );
  }

  await db
    .update(bookings)
    .set({
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancellationReason: "USER_REQUESTED",
      cancellationNote: data.reason,
      updatedAt: new Date(),
    })
    .where(eq(bookings.id, data.bookingId));

  await db.insert(bookingStatusHistory).values({
    bookingId: data.bookingId,
    fromStatus: booking.status,
    toStatus: "CANCELLED",
    changedBy: userId,
    reason: data.reason,
  });

  return { cancelled: true, bookingId: data.bookingId };
}

export async function rescheduleInstance(
  userId: string,
  instanceId: string,
  data: { rescheduleTo: string }
) {
  const instance = await db.query.bookingInstances.findFirst({
    where: eq(bookingInstances.id, instanceId),
    with: {
      parentBooking: true,
    },
  });

  if (!instance) {
    throw new NotFoundError("Booking instance");
  }

  if (instance.parentBooking.userId !== userId) {
    throw new ForbiddenError();
  }

  await db
    .update(bookingInstances)
    .set({
      rescheduledFrom: instance.scheduledDate,
      scheduledDate: new Date(data.rescheduleTo),
      status: "RESCHEDULED",
      updatedAt: new Date(),
    })
    .where(eq(bookingInstances.id, instanceId));

  return { rescheduled: true, instanceId };
}

export async function cancelInstance(
  userId: string,
  instanceId: string,
  data: { reason: string }
) {
  const instance = await db.query.bookingInstances.findFirst({
    where: eq(bookingInstances.id, instanceId),
    with: {
      parentBooking: true,
      recurringBooking: true,
    },
  });

  if (!instance) {
    throw new NotFoundError("Booking instance");
  }

  if (instance.parentBooking.userId !== userId) {
    throw new ForbiddenError();
  }

  await db
    .update(bookingInstances)
    .set({
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancellationReason: data.reason,
      updatedAt: new Date(),
    })
    .where(eq(bookingInstances.id, instanceId));

  if (instance.recurringBooking) {
    await db
      .update(recurringBookings)
      .set({
        cancelledInstances: (instance.recurringBooking.cancelledInstances || 0) + 1,
        updatedAt: new Date(),
      })
      .where(eq(recurringBookings.id, instance.recurringBookingId));
  }

  return { cancelled: true, instanceId };
}
