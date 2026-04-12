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
  catalogs,
  coupons,
  orders,
  addresses,
  idempotencyKeys,
} from "@subito/db/schema";
import { eq, and, inArray, desc, gte, lte } from "drizzle-orm";
import { NotFoundError, ForbiddenError, BadRequestError, ConflictError } from "../../lib/errors";
import { generateBookingNumber, generateOrderId, roundToTwoDecimals, calculateGST } from "../../utils/helpers";
import { createHash } from "crypto";

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

  if (booking.status === "CANCELLED") {
    throw new BadRequestError("Booking is already cancelled");
  }

  const cancellableStatuses = [
    "PENDING_PAYMENT",
    "PENDING_MATCH",
    "MATCHED",
    "ARRIVING",
    "STARTED",
  ];
  if (!cancellableStatuses.includes(booking.status)) {
    throw new BadRequestError(
      `Booking in status ${booking.status} cannot be cancelled`
    );
  }

  const needsPartnerAck =
    Boolean(booking.partnerId) &&
    ["MATCHED", "ARRIVING", "STARTED"].includes(booking.status);

  if (needsPartnerAck) {
    if (booking.cancellationAwaitingPartnerAck) {
      return {
        awaitingPartnerAck: true,
        bookingId: data.bookingId,
      };
    }

    await db
      .update(bookings)
      .set({
        cancellationAwaitingPartnerAck: true,
        cancellationRequestedAt: new Date(),
        cancellationReason: "USER_REQUESTED",
        cancellationNote: data.reason,
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, data.bookingId));

    return {
      awaitingPartnerAck: true,
      bookingId: data.bookingId,
    };
  }

  await db
    .update(bookings)
    .set({
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancellationReason: "USER_REQUESTED",
      cancellationNote: data.reason,
      cancellationAwaitingPartnerAck: false,
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

interface CreateBookingData {
  addressId: string;
  items: Array<{
    catalogId: string;
    quantity: number;
    propertyConfig?: Record<string, unknown>;
  }>;
  bookingType: "INSTANT" | "SCHEDULED" | "RECURRING";
  scheduledDate?: string;
  scheduledTime?: string;
  recurringType?: "WEEKLY" | "BIWEEKLY" | "MONTHLY";
  couponCode?: string;
  customerNotes?: string;
}

async function checkAndStoreIdempotencyKey(
  userId: string,
  idempotencyKey: string | undefined,
  resourceType: string,
  requestData: unknown
): Promise<{ existingResourceId: string | null; requestHash: string }> {
  if (!idempotencyKey) {
    return { existingResourceId: null, requestHash: "" };
  }

  const requestHash = createHash("sha256")
    .update(JSON.stringify(requestData))
    .digest("hex");

  const existing = await db.query.idempotencyKeys.findFirst({
    where: and(
      eq(idempotencyKeys.key, idempotencyKey),
      eq(idempotencyKeys.userId, userId),
      eq(idempotencyKeys.resourceType, resourceType)
    ),
  });

  if (existing) {
    if (existing.requestHash !== requestHash) {
      throw new ConflictError(
        "Idempotency key has already been used with a different request payload"
      );
    }

    if (existing.resourceId) {
      return { existingResourceId: existing.resourceId, requestHash };
    }
  }

  return { existingResourceId: null, requestHash };
}

async function saveIdempotencyKey(
  userId: string,
  idempotencyKey: string | undefined,
  resourceType: string,
  resourceId: string,
  requestHash: string,
  responseBody: unknown
) {
  if (!idempotencyKey) return;

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  await db.insert(idempotencyKeys).values({
    key: idempotencyKey,
    userId,
    resourceType,
    resourceId,
    requestHash,
    responseCode: 200,
    responseBody,
    expiresAt,
  });
}

export async function createBooking(
  userId: string,
  data: CreateBookingData,
  idempotencyKey?: string
) {
  // Layer 2: DB-level idempotency check
  const { existingResourceId, requestHash } = await checkAndStoreIdempotencyKey(
    userId,
    idempotencyKey,
    "booking",
    data
  );

  if (existingResourceId) {
    const existingBooking = await db.query.bookings.findFirst({
      where: eq(bookings.id, existingResourceId),
      with: { items: true },
    });

    if (existingBooking) {
      return {
        booking: {
          id: existingBooking.id,
          bookingNumber: existingBooking.bookingNumber,
          status: existingBooking.status,
          totalAmount: existingBooking.totalAmount,
        },
        order: null,
        idempotent: true,
      };
    }
  }
  const address = await db.query.addresses.findFirst({
    where: and(eq(addresses.id, data.addressId), eq(addresses.userId, userId)),
  });

  if (!address) {
    throw new NotFoundError("Address");
  }

  const catalogItems = await db.query.catalogs.findMany({
    where: inArray(
      catalogs.id,
      data.items.map((i) => i.catalogId)
    ),
    with: {
      listing: true,
    },
  });

  if (catalogItems.length !== data.items.length) {
    throw new BadRequestError("One or more catalog items not found");
  }

  let subtotal = 0;
  const itemsWithPrice = data.items.map((item) => {
    const catalog = catalogItems.find((c) => c.id === item.catalogId)!;
    const basePrice = parseFloat(catalog.basePrice || "0");
    const itemTotal = basePrice * item.quantity;
    subtotal += itemTotal;
    return {
      ...item,
      unitPrice: basePrice,
      totalPrice: itemTotal,
      catalog,
    };
  });

  let discountAmount = 0;
  let appliedCouponId: string | undefined;

  if (data.couponCode) {
    const coupon = await db.query.coupons.findFirst({
      where: and(
        eq(coupons.code, data.couponCode),
        eq(coupons.isActive, true)
      ),
    });

    if (coupon) {
      const now = new Date();
      const validFrom = coupon.validFrom ? new Date(coupon.validFrom) : null;
      const validUntil = coupon.validUntil ? new Date(coupon.validUntil) : null;

      const isDateValid =
        (!validFrom || now >= validFrom) && (!validUntil || now <= validUntil);
      const meetsMinValue =
        !coupon.minCartValue || subtotal >= parseFloat(coupon.minCartValue);

      if (isDateValid && meetsMinValue) {
        if (coupon.discountType === "PERCENTAGE") {
          discountAmount = (subtotal * parseFloat(coupon.discountValue)) / 100;
          if (coupon.maxDiscountValue) {
            discountAmount = Math.min(
              discountAmount,
              parseFloat(coupon.maxDiscountValue)
            );
          }
        } else {
          discountAmount = parseFloat(coupon.discountValue);
        }
        appliedCouponId = coupon.id;
      }
    }
  }

  const totalAfterDiscount = subtotal - discountAmount;
  const gst = calculateGST(totalAfterDiscount);
  const finalTotal = roundToTwoDecimals(totalAfterDiscount + gst);

  const bookingNumber = generateBookingNumber();
  const orderId = generateOrderId();

  const [order] = await db
    .insert(orders)
    .values({
      userId,
      orderNumber: orderId,
      amount: finalTotal.toString(),
      currency: "INR",
      status: "CREATED",
    })
    .returning();

  let scheduledDate: Date | undefined;
  let scheduledStartTime: string | undefined;
  let scheduledEndTime: string | undefined;

  if (data.bookingType === "SCHEDULED" && data.scheduledDate) {
    scheduledDate = new Date(data.scheduledDate);
    scheduledStartTime = data.scheduledTime;
    scheduledEndTime = data.scheduledTime
      ? `${parseInt(data.scheduledTime.split(":")[0]) + 2}:00`
      : undefined;
  } else if (data.bookingType === "INSTANT") {
    scheduledDate = new Date();
    const now = new Date();
    scheduledStartTime = `${now.getHours()}:${now.getMinutes().toString().padStart(2, "0")}`;
    scheduledEndTime = `${now.getHours() + 2}:00`;
  }

  const [booking] = await db
    .insert(bookings)
    .values({
      userId,
      bookingNumber,
      orderId: order.id,
      addressId: data.addressId,
      hubId: address.hubId || null,
      microHubId: address.microHubId || null,
      bookingType: data.bookingType,
      status: "PENDING_PAYMENT",
      scheduledDate,
      scheduledStartTime,
      scheduledEndTime,
      subtotal: subtotal.toString(),
      discountAmount: discountAmount.toString(),
      surgeAmount: "0",
      gstAmount: gst.toString(),
      totalAmount: finalTotal.toString(),
      couponId: appliedCouponId,
      customerNotes: data.customerNotes,
    })
    .returning();

  for (const item of itemsWithPrice) {
    await db.insert(bookingItems).values({
      bookingId: booking.id,
      catalogId: item.catalogId,
      listingId: item.catalog.listingId,
      quantity: item.quantity,
      unitPrice: item.unitPrice.toString(),
      totalPrice: item.totalPrice.toString(),
      propertyConfig: item.propertyConfig,
    });
  }

  if (data.bookingType === "RECURRING" && data.recurringType) {
    await db.insert(recurringBookings).values({
      bookingId: booking.id,
      recurringType: data.recurringType,
      totalInstances: 4,
      completedInstances: 0,
      cancelledInstances: 0,
    });
  }

  await db.insert(bookingStatusHistory).values({
    bookingId: booking.id,
    fromStatus: null,
    toStatus: "PENDING_PAYMENT",
    changedBy: userId,
  });

  const result = {
    booking: {
      id: booking.id,
      bookingNumber: booking.bookingNumber,
      status: booking.status,
      totalAmount: booking.totalAmount,
    },
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      amount: order.amount,
    },
  };

  // Layer 2: Store idempotency key in DB
  await saveIdempotencyKey(
    userId,
    idempotencyKey,
    "booking",
    booking.id,
    requestHash,
    result
  );

  return result;
}

interface ExtendBookingData {
  bookingId: string;
  additionalItems: Array<{
    catalogId: string;
    quantity: number;
  }>;
  paymentMethodId?: string;
}

export async function extendBooking(
  userId: string,
  data: ExtendBookingData,
  idempotencyKey?: string
) {
  // Layer 2: DB-level idempotency check for extension
  const { existingResourceId, requestHash } = await checkAndStoreIdempotencyKey(
    userId,
    idempotencyKey,
    "booking_extension",
    data
  );

  if (existingResourceId) {
    const existingExtension = await db.query.orders.findFirst({
      where: eq(orders.id, existingResourceId),
    });

    if (existingExtension) {
      return {
        bookingId: data.bookingId,
        extensionOrder: {
          id: existingExtension.id,
          orderNumber: existingExtension.orderNumber,
          amount: existingExtension.amount,
        },
        newTotal: null,
        idempotent: true,
      };
    }
  }

  const booking = await db.query.bookings.findFirst({
    where: and(eq(bookings.id, data.bookingId), eq(bookings.userId, userId)),
    with: {
      items: true,
    },
  });

  if (!booking) {
    throw new NotFoundError("Booking");
  }

  const extendableStatuses = ["STARTED"];
  if (!extendableStatuses.includes(booking.status)) {
    throw new BadRequestError(
      `Booking in status ${booking.status} cannot be extended`
    );
  }

  const catalogItems = await db.query.catalogs.findMany({
    where: inArray(
      catalogs.id,
      data.additionalItems.map((i) => i.catalogId)
    ),
    with: {
      listing: true,
    },
  });

  let additionalSubtotal = 0;
  const newItems = data.additionalItems.map((item) => {
    const catalog = catalogItems.find((c) => c.id === item.catalogId)!;
    const basePrice = parseFloat(catalog.basePrice || "0");
    const itemTotal = basePrice * item.quantity;
    additionalSubtotal += itemTotal;
    return {
      ...item,
      unitPrice: basePrice,
      totalPrice: itemTotal,
      catalog,
    };
  });

  const additionalGst = calculateGST(additionalSubtotal);
  const additionalTotal = roundToTwoDecimals(additionalSubtotal + additionalGst);

  const extensionOrderId = generateOrderId();

  const [extensionOrder] = await db
    .insert(orders)
    .values({
      userId,
      orderNumber: extensionOrderId,
      amount: additionalTotal.toString(),
      currency: "INR",
      status: "CREATED",
      metadata: { type: "extension", parentBookingId: booking.id },
    })
    .returning();

  for (const item of newItems) {
    await db.insert(bookingItems).values({
      bookingId: booking.id,
      catalogId: item.catalogId,
      listingId: item.catalog.listingId,
      quantity: item.quantity,
      unitPrice: item.unitPrice.toString(),
      totalPrice: item.totalPrice.toString(),
      metadata: { isExtension: true },
    });
  }

  const newTotal =
    parseFloat(booking.totalAmount || "0") + additionalTotal;

  await db
    .update(bookings)
    .set({
      totalAmount: newTotal.toString(),
      updatedAt: new Date(),
      metadata: {
        ...((booking.metadata as object) || {}),
        hasExtension: true,
        extensionOrderId: extensionOrder.id,
      },
    })
    .where(eq(bookings.id, booking.id));

  const result = {
    bookingId: booking.id,
    extensionOrder: {
      id: extensionOrder.id,
      orderNumber: extensionOrder.orderNumber,
      amount: extensionOrder.amount,
    },
    newTotal: newTotal.toString(),
  };

  // Layer 2: Store idempotency key in DB
  await saveIdempotencyKey(
    userId,
    idempotencyKey,
    "booking_extension",
    extensionOrder.id,
    requestHash,
    result
  );

  return result;
}
