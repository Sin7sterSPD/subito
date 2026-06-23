import { db } from "@subito/db"
import {
  bookings,
  bookingItems,
  bookingSlots,
  bookingInstances,
  recurringBookings,
  bookingStatusHistory,
  partnerLocations,
  partners,
  refunds,
  catalogs,
  coupons,
  orders,
  addresses,
  idempotencyKeys,
  bookingStatusEnum,
  bookingTypeEnum,
  recurringTypeEnum,
} from "@subito/db"

import { eq, and, inArray, desc, gte, lte, sql } from "@subito/db"

import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
  ConflictError,
} from "@/lib/errors"

import {
  generateBookingNumber,
  generateOrderId,
  roundToTwoDecimals,
  calculateGST,
} from "@/utils/helpers"

import { createHash } from "crypto"
import { tryAutoRefundAfterBookingCancel } from "../payments/payments.service"

interface BookingsQuery {
  page: number
  limit: number
  status?: string[]
  bookingType?: string[]
}

type BookingStatus = (typeof bookingStatusEnum.enumValues)[number]
type BookingType = (typeof bookingTypeEnum.enumValues)[number]

function requireDefined<T>(value: T | undefined, message: string): T {
  if (value === undefined) {
    throw new Error(message)
  }

  return value
}

function parseDecimalValue(value: string | null | undefined): number {
  return Number.parseFloat(value ?? "0")
}

function normalizeBookingStatuses(
  raw: string[] | undefined
): BookingStatus[] | undefined {
  if (!raw?.length) return undefined
  const allowed = new Set<string>(bookingStatusEnum.enumValues)
  const out = raw.filter((s): s is BookingStatus => allowed.has(s))
  return out.length ? out : undefined
}

function normalizeBookingTypes(
  raw: string[] | undefined
): BookingType[] | undefined {
  if (!raw?.length) return undefined
  const allowed = new Set<string>(bookingTypeEnum.enumValues)
  const out = raw.filter((s): s is BookingType => allowed.has(s))
  return out.length ? out : undefined
}

/** Clock time string `H:MM` after adding hours to a start time on a calendar day (handles day rollover). */
function clockAfterAddingHours(
  day: Date,
  startHour: number,
  startMinute: number,
  addHours: number
): string {
  const d = new Date(day)
  d.setHours(startHour, startMinute, 0, 0)
  d.setTime(d.getTime() + addHours * 60 * 60 * 1000)
  return `${d.getHours()}:${d.getMinutes().toString().padStart(2, "0")}`
}

const RECURRING_INSTANCE_COUNT: Record<
  (typeof recurringTypeEnum.enumValues)[number],
  number
> = {
  WEEKLY: 12,
  BIWEEKLY: 8,
  MONTHLY: 6,
}

export async function getBookings(userId: string, query: BookingsQuery) {
  const conditions = [eq(bookings.userId, userId)]

  const statuses = normalizeBookingStatuses(query.status)
  if (statuses?.length) {
    conditions.push(inArray(bookings.status, statuses))
  }

  const [allBookings, countResult] = await Promise.all([
    db.query.bookings.findMany({
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
    }),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(bookings)
      .where(and(...conditions)),
  ])

  const total = countResult[0]?.count ?? 0

  return {
    bookings: allBookings,
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      hasMore: query.page * query.limit < total,
    },
  }
}

export async function getBookingsV2(userId: string, query: BookingsQuery) {
  const conditions = [eq(bookings.userId, userId)]

  const statusesV2 = normalizeBookingStatuses(query.status)
  if (statusesV2?.length) {
    conditions.push(inArray(bookings.status, statusesV2))
  }

  const typesV2 = normalizeBookingTypes(query.bookingType)
  if (typesV2?.length) {
    conditions.push(inArray(bookings.bookingType, typesV2))
  }

  const [allBookings, countResult] = await Promise.all([
    db.query.bookings.findMany({
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
    }),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(bookings)
      .where(and(...conditions)),
  ])

  const total = countResult[0]?.count ?? 0

  return {
    bookings: allBookings,
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      hasMore: query.page * query.limit < total,
    },
  }
}

const bookingDetailWith = {
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
} as const

export async function getBookingById(userId: string, bookingId: string) {
  const booking = await db.query.bookings.findFirst({
    where: and(eq(bookings.id, bookingId), eq(bookings.userId, userId)),
    with: bookingDetailWith,
  })

  if (!booking) {
    throw new NotFoundError("Booking")
  }

  return booking
}

/** Partner (or admin) viewing an assigned job — scoped by `bookings.partnerId`. */
export async function getBookingByIdForPartnerUser(
  userId: string,
  bookingId: string,
  role: "customer" | "partner" | "admin"
) {
  if (role === "customer") {
    return getBookingById(userId, bookingId)
  }

  if (role === "admin") {
    const booking = await db.query.bookings.findFirst({
      where: eq(bookings.id, bookingId),
      with: bookingDetailWith,
    })
    if (!booking) {
      throw new NotFoundError("Booking")
    }
    return booking
  }

  const partner = await db.query.partners.findFirst({
    where: eq(partners.userId, userId),
    columns: { id: true },
  })

  if (!partner) {
    throw new NotFoundError("Booking")
  }

  const booking = await db.query.bookings.findFirst({
    where: and(eq(bookings.id, bookingId), eq(bookings.partnerId, partner.id)),
    with: bookingDetailWith,
  })

  if (!booking) {
    throw new NotFoundError("Booking")
  }

  return booking
}

export async function getLatestBooking(userId: string) {
  const booking = await db.query.bookings.findFirst({
    where: and(
      eq(bookings.userId, userId),
      inArray(bookings.status, [
        "PENDING_MATCH",
        "MATCHED",
        "ARRIVING",
        "STARTED",
      ])
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
  })

  return booking
}

export async function getAvailableSlots(query: {
  lat: number
  lng: number
  bookingType?: string
  time?: string
  days: number
}) {
  const now = new Date()
  
  // Self-healing: if all slots in the DB are in the past, shift them forward
  const allSlots = await db.query.bookingSlots.findMany()
  if (allSlots.length > 0) {
    const nowTime = now.getTime()
    const hasFutureSlots = allSlots.some(s => s.date.getTime() >= nowTime)
    if (!hasFutureSlots) {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const minSlotTime = Math.min(...allSlots.map(s => s.date.getTime()))
      const minSlotDate = new Date(minSlotTime)
      const diffTime = todayStart.getTime() - new Date(minSlotDate.getFullYear(), minSlotDate.getMonth(), minSlotDate.getDate()).getTime()
      const daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1

      for (const slot of allSlots) {
        const newDate = new Date(slot.date)
        newDate.setDate(newDate.getDate() + daysDiff)
        await db
          .update(bookingSlots)
          .set({ date: newDate, updatedAt: new Date() })
          .where(eq(bookingSlots.id, slot.id))
      }
    }
  }

  const endDate = new Date()
  endDate.setDate(endDate.getDate() + query.days)

  const slots = await db.query.bookingSlots.findMany({
    where: and(
      eq(bookingSlots.isAvailable, true),
      gte(bookingSlots.date, now),
      lte(bookingSlots.date, endDate),
      sql`COALESCE(${bookingSlots.currentBookings}, 0) < ${bookingSlots.maxCapacity}`
    ),
    orderBy: [bookingSlots.date, bookingSlots.startTime],
  })

  const groupedSlots: Record<string, typeof slots> = {}
  for (const slot of slots) {
    const dateKey = slot.date.toISOString().slice(0, 10)
    if (!groupedSlots[dateKey]) {
      groupedSlots[dateKey] = []
    }
    groupedSlots[dateKey].push(slot)
  }

  return {
    slots: groupedSlots,
    availableDates: Object.keys(groupedSlots),
  }
}

export async function getPartnerLocation(userId: string, bookingId: string) {
  const booking = await db.query.bookings.findFirst({
    where: and(eq(bookings.id, bookingId), eq(bookings.userId, userId)),
  })

  if (!booking) {
    throw new NotFoundError("Booking")
  }

  if (!booking.partnerId) {
    return { location: null }
  }

  const location = await db.query.partnerLocations.findFirst({
    where: eq(partnerLocations.partnerId, booking.partnerId),
    orderBy: [desc(partnerLocations.recordedAt)],
  })

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
  }
}

export async function getChildBookings(userId: string, parentId: string) {
  const parent = await db.query.bookings.findFirst({
    where: and(eq(bookings.id, parentId), eq(bookings.userId, userId)),
  })

  if (!parent) {
    throw new NotFoundError("Parent booking")
  }

  const recurringConfig = await db.query.recurringBookings.findFirst({
    where: eq(recurringBookings.bookingId, parentId),
    with: {
      instances: {
        orderBy: [bookingInstances.instanceNumber],
      },
    },
  })

  return {
    parentBooking: parent,
    instances: recurringConfig?.instances || [],
  }
}

export async function getRefundDetails(userId: string, bookingId: string) {
  const booking = await db.query.bookings.findFirst({
    where: and(eq(bookings.id, bookingId), eq(bookings.userId, userId)),
  })

  if (!booking) {
    throw new NotFoundError("Booking")
  }

  const refundRecords = await db.query.refunds.findMany({
    where: eq(refunds.bookingId, bookingId),
    orderBy: [desc(refunds.createdAt)],
  })

  return {
    booking,
    refunds: refundRecords,
  }
}

export async function getBridgingContext(
  idParam: string,
  userId: string,
  role: "customer" | "partner" | "admin"
) {
  const instance = await db.query.bookingInstances.findFirst({
    where: eq(bookingInstances.id, idParam),
    columns: { parentBookingId: true },
  })
  const bookingId = instance?.parentBookingId ?? idParam

  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.id, bookingId),
    with: {
      items: true,
      address: true,
      partner: true,
    },
  })

  if (!booking) {
    throw new NotFoundError("Booking")
  }

  if (role === "customer" && booking.userId !== userId) {
    throw new ForbiddenError()
  }

  if (role === "partner") {
    const partner = await db.query.partners.findFirst({
      where: eq(partners.userId, userId),
      columns: { id: true },
    })
    if (!partner || booking.partnerId !== partner.id) {
      throw new ForbiddenError()
    }
  }

  return {
    bookingId: booking.id,
    status: booking.status,
    partnerId: booking.partnerId,
    addressId: booking.addressId,
    metadata: booking.metadata,
  }
}

export async function cancelBooking(
  userId: string,
  data: { bookingId: string; reason: string }
) {
  const booking = await db.query.bookings.findFirst({
    where: and(eq(bookings.id, data.bookingId), eq(bookings.userId, userId)),
  })

  if (!booking) {
    throw new NotFoundError("Booking")
  }

  if (booking.status === "CANCELLED") {
    throw new BadRequestError("Booking is already cancelled")
  }

  const cancellableStatuses = [
    "PENDING_PAYMENT",
    "PENDING_MATCH",
    "MATCHED",
    "ARRIVING",
    "STARTED",
  ]
  if (!cancellableStatuses.includes(booking.status)) {
    throw new BadRequestError(
      `Booking in status ${booking.status} cannot be cancelled`
    )
  }

  const needsPartnerAck =
    Boolean(booking.partnerId) &&
    ["MATCHED", "ARRIVING", "STARTED"].includes(booking.status)

  if (needsPartnerAck) {
    if (booking.cancellationAwaitingPartnerAck) {
      return {
        awaitingPartnerAck: true,
        bookingId: data.bookingId,
      }
    }

    await db.transaction(async (tx) => {
      await tx
        .update(bookings)
        .set({
          cancellationAwaitingPartnerAck: true,
          cancellationRequestedAt: new Date(),
          cancellationReason: "USER_REQUESTED",
          cancellationNote: data.reason,
          updatedAt: new Date(),
        })
        .where(eq(bookings.id, data.bookingId))

      await tx.insert(bookingStatusHistory).values({
        bookingId: data.bookingId,
        fromStatus: booking.status,
        toStatus: booking.status,
        changedBy: userId,
        reason: `Cancellation requested; awaiting partner acknowledgment. ${data.reason}`,
        metadata: { phase: "awaiting_partner_ack" },
      })
    })

    return {
      awaitingPartnerAck: true,
      bookingId: data.bookingId,
    }
  }

  const previousStatus = booking.status
  const mergedMetadata = {
    ...((booking.metadata as Record<string, unknown> | null) ?? {}),
    statusBeforeCancel: previousStatus,
  }

  await db.transaction(async (tx) => {
    await tx
      .update(bookings)
      .set({
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancellationReason: "USER_REQUESTED",
        cancellationNote: data.reason,
        cancellationAwaitingPartnerAck: false,
        metadata: mergedMetadata,
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, data.bookingId))

    const slotId = (
      booking.metadata as { reservedBookingSlotId?: string } | null
    )?.reservedBookingSlotId
    if (slotId) {
      await tx
        .update(bookingSlots)
        .set({
          currentBookings: sql`GREATEST(COALESCE(${bookingSlots.currentBookings}, 0) - 1, 0)`,
          updatedAt: new Date(),
        })
        .where(eq(bookingSlots.id, slotId))
    }

    await tx.insert(bookingStatusHistory).values({
      bookingId: data.bookingId,
      fromStatus: booking.status,
      toStatus: "CANCELLED",
      changedBy: userId,
      reason: data.reason,
    })
  })

  try {
    await tryAutoRefundAfterBookingCancel({
      userId,
      bookingId: data.bookingId,
      previousStatus,
      reason: data.reason,
    })
  } catch (err) {
    console.error("Auto-refund after cancel failed:", err)
  }

  return { cancelled: true, bookingId: data.bookingId }
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
  })

  if (!instance) {
    throw new NotFoundError("Booking instance")
  }

  if (instance.parentBooking.userId !== userId) {
    throw new ForbiddenError()
  }

  await db
    .update(bookingInstances)
    .set({
      rescheduledFrom: instance.scheduledDate,
      scheduledDate: new Date(data.rescheduleTo),
      status: "RESCHEDULED",
      updatedAt: new Date(),
    })
    .where(eq(bookingInstances.id, instanceId))

  return { rescheduled: true, instanceId }
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
  })

  if (!instance) {
    throw new NotFoundError("Booking instance")
  }

  if (instance.parentBooking.userId !== userId) {
    throw new ForbiddenError()
  }

  await db
    .update(bookingInstances)
    .set({
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancellationReason: data.reason,
      updatedAt: new Date(),
    })
    .where(eq(bookingInstances.id, instanceId))

  if (instance.recurringBooking) {
    await db
      .update(recurringBookings)
      .set({
        cancelledInstances: sql`COALESCE(${recurringBookings.cancelledInstances}, 0) + 1`,
        updatedAt: new Date(),
      })
      .where(eq(recurringBookings.id, instance.recurringBookingId))
  }

  return { cancelled: true, instanceId }
}

interface CreateBookingData {
  addressId: string
  items: Array<{
    catalogId: string
    quantity: number
    propertyConfig?: Record<string, unknown>
  }>
  bookingType: "INSTANT" | "SCHEDULED" | "RECURRING"
  scheduledDate?: string
  scheduledTime?: string
  /** From GET /bookings/slots; optional capacity is enforced only when set. */
  bookingSlotId?: string
  recurringType?: "WEEKLY" | "BIWEEKLY" | "MONTHLY"
  couponCode?: string
  customerNotes?: string
}

async function checkAndStoreIdempotencyKey(
  userId: string,
  idempotencyKey: string | undefined,
  resourceType: string,
  requestData: unknown
): Promise<{ existingResourceId: string | null; requestHash: string }> {
  if (!idempotencyKey) {
    return { existingResourceId: null, requestHash: "" }
  }

  const requestHash = createHash("sha256")
    .update(JSON.stringify(requestData))
    .digest("hex")

  const existing = await db.query.idempotencyKeys.findFirst({
    where: and(
      eq(idempotencyKeys.key, idempotencyKey),
      eq(idempotencyKeys.userId, userId),
      eq(idempotencyKeys.resourceType, resourceType)
    ),
  })

  if (existing) {
    if (existing.requestHash !== requestHash) {
      throw new ConflictError(
        "Idempotency key has already been used with a different request payload"
      )
    }

    if (existing.resourceId) {
      return { existingResourceId: existing.resourceId, requestHash }
    }
  }

  return { existingResourceId: null, requestHash }
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
  )

  if (existingResourceId) {
    const existingBooking = await db.query.bookings.findFirst({
      where: eq(bookings.id, existingResourceId),
      with: { items: true },
    })

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
      }
    }
  }
  const address = await db.query.addresses.findFirst({
    where: and(eq(addresses.id, data.addressId), eq(addresses.userId, userId)),
  })

  if (!address) {
    throw new NotFoundError("Address")
  }

  if (data.bookingType === "INSTANT" && data.bookingSlotId) {
    throw new BadRequestError(
      "bookingSlotId is only valid for scheduled or recurring bookings"
    )
  }

  const catalogItems = await db.query.catalogs.findMany({
    where: inArray(
      catalogs.id,
      data.items.map((i) => i.catalogId)
    ),
    with: {
      listing: true,
    },
  })

  if (catalogItems.length !== data.items.length) {
    throw new BadRequestError("One or more catalog items not found")
  }

  let subtotal = 0
  const itemsWithPrice = data.items.map((item) => {
    const catalog = catalogItems.find((c) => c.id === item.catalogId)
    const unitPrice = parseDecimalValue(
      catalog?.discountedPrice ?? catalog?.price
    )
    const itemTotal = unitPrice * item.quantity
    subtotal += itemTotal
    return {
      ...item,
      unitPrice,
      totalPrice: itemTotal,
      catalog: requireDefined(
        catalog,
        `Catalog ${item.catalogId} not found while creating booking`
      ),
    }
  })

  let discountAmount = 0
  let appliedCouponId: string | undefined

  if (data.couponCode) {
    const coupon = await db.query.coupons.findFirst({
      where: and(eq(coupons.code, data.couponCode), eq(coupons.isActive, true)),
    })

    if (coupon) {
      const now = new Date()
      const validFrom = coupon.validFrom ? new Date(coupon.validFrom) : null
      const validTill = coupon.validTill ? new Date(coupon.validTill) : null

      const isDateValid =
        (!validFrom || now >= validFrom) && (!validTill || now <= validTill)
      const meetsMinValue =
        !coupon.minCartValue ||
        subtotal >= parseDecimalValue(coupon.minCartValue)

      if (isDateValid && meetsMinValue) {
        if (coupon.discountType === "PERCENTAGE") {
          discountAmount =
            (subtotal * parseDecimalValue(coupon.discountValue)) / 100
          if (coupon.maxDiscount) {
            discountAmount = Math.min(
              discountAmount,
              parseDecimalValue(coupon.maxDiscount)
            )
          }
        } else {
          discountAmount = parseDecimalValue(coupon.discountValue)
        }
        appliedCouponId = coupon.id
      }
    }
  }

  const totalAfterDiscount = subtotal - discountAmount
  const gst = calculateGST(totalAfterDiscount)
  const finalTotal = roundToTwoDecimals(totalAfterDiscount + gst)

  const bookingNumber = generateBookingNumber()
  const orderId = generateOrderId()

  let scheduledDate: Date | undefined
  let scheduledStartTime: string | undefined
  let scheduledEndTime: string | undefined

  if (data.bookingType === "SCHEDULED" && data.scheduledDate) {
    scheduledDate = new Date(data.scheduledDate)
    scheduledStartTime = data.scheduledTime
    if (data.scheduledTime) {
      const [h, m] = data.scheduledTime.split(":").map((x) => parseInt(x, 10))
      scheduledEndTime = clockAfterAddingHours(scheduledDate, h || 0, m || 0, 2)
    }
  } else if (data.bookingType === "INSTANT") {
    scheduledDate = new Date()
    const now = new Date()
    scheduledStartTime = `${now.getHours()}:${now.getMinutes().toString().padStart(2, "0")}`
    scheduledEndTime = clockAfterAddingHours(
      now,
      now.getHours(),
      now.getMinutes(),
      2
    )
  }

  const bookingMetadata: Record<string, unknown> | undefined =
    data.bookingSlotId
      ? { reservedBookingSlotId: data.bookingSlotId }
      : undefined

  const result = await db.transaction(async (tx) => {
    const insertedOrders = await tx
      .insert(orders)
      .values({
        userId,
        orderId,
        amount: finalTotal.toString(),
        currency: "INR",
        status: "CREATED",
      })
      .returning()
    const order = requireDefined(
      insertedOrders[0],
      "Order insert returned no row while creating booking"
    )

    const insertedBookings = await tx
      .insert(bookings)
      .values({
        userId,
        bookingNumber,
        orderId: order.id,
        addressId: data.addressId,
        hubId: null,
        microHubId: null,
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
        metadata: bookingMetadata,
      })
      .returning()
    const booking = requireDefined(
      insertedBookings[0],
      "Booking insert returned no row while creating booking"
    )

    await tx.insert(bookingItems).values(
      itemsWithPrice.map((item) => ({
        bookingId: booking.id,
        catalogId: item.catalogId,
        name: item.catalog.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toString(),
        totalPrice: item.totalPrice.toString(),
        propertyConfig: item.propertyConfig,
      }))
    )

    if (data.bookingType === "RECURRING" && data.recurringType) {
      const startDate = scheduledDate ?? new Date()
      await tx.insert(recurringBookings).values({
        bookingId: booking.id,
        recurringType: data.recurringType,
        startDate,
        totalInstances: RECURRING_INSTANCE_COUNT[data.recurringType],
        completedInstances: 0,
        cancelledInstances: 0,
      })
    }

    if (data.bookingSlotId) {
      const slotRows = await tx
        .update(bookingSlots)
        .set({
          currentBookings: sql`COALESCE(${bookingSlots.currentBookings}, 0) + 1`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(bookingSlots.id, data.bookingSlotId),
            eq(bookingSlots.isAvailable, true),
            sql`COALESCE(${bookingSlots.currentBookings}, 0) < ${bookingSlots.maxCapacity}`
          )
        )
        .returning({ id: bookingSlots.id })
      const slotRow = slotRows[0]
      if (!slotRow) {
        throw new ConflictError("Time slot is full or not available")
      }
    }

    await tx.insert(bookingStatusHistory).values({
      bookingId: booking.id,
      fromStatus: null,
      toStatus: "PENDING_PAYMENT",
      changedBy: userId,
    })

    if (idempotencyKey) {
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 24)

      await tx.insert(idempotencyKeys).values({
        key: idempotencyKey,
        userId,
        resourceType: "booking",
        resourceId: booking.id,
        requestHash,
        responseCode: 200,
        responseBody: {
          booking: {
            id: booking.id,
            bookingNumber: booking.bookingNumber,
            status: booking.status,
            totalAmount: booking.totalAmount,
          },
          order: {
            id: order.id,
            orderId: order.orderId,
            amount: order.amount,
          },
        },
        expiresAt,
      })
    }

    return {
      booking: {
        id: booking.id,
        bookingNumber: booking.bookingNumber,
        status: booking.status,
        totalAmount: booking.totalAmount,
      },
      order: {
        id: order.id,
        orderId: order.orderId,
        amount: order.amount,
      },
    }
  })

  return result
}

interface ExtendBookingData {
  bookingId: string
  additionalItems: Array<{
    catalogId: string
    quantity: number
  }>
  paymentMethodId?: string
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
  )

  if (existingResourceId) {
    const existingExtension = await db.query.orders.findFirst({
      where: eq(orders.id, existingResourceId),
    })

    if (existingExtension) {
      return {
        bookingId: data.bookingId,
        extensionOrder: {
          id: existingExtension.id,
          orderId: existingExtension.orderId,
          amount: existingExtension.amount,
        },
        newTotal: null,
        idempotent: true,
      }
    }
  }

  const booking = await db.query.bookings.findFirst({
    where: and(eq(bookings.id, data.bookingId), eq(bookings.userId, userId)),
    with: {
      items: true,
    },
  })

  if (!booking) {
    throw new NotFoundError("Booking")
  }

  const extendableStatuses = ["STARTED"]
  if (!extendableStatuses.includes(booking.status)) {
    throw new BadRequestError(
      `Booking in status ${booking.status} cannot be extended`
    )
  }

  const catalogItems = await db.query.catalogs.findMany({
    where: inArray(
      catalogs.id,
      data.additionalItems.map((i) => i.catalogId)
    ),
    with: {
      listing: true,
    },
  })

  if (catalogItems.length !== data.additionalItems.length) {
    throw new BadRequestError("One or more additional catalog items not found")
  }

  let additionalSubtotal = 0
  const newItems = data.additionalItems.map((item) => {
    const catalog = catalogItems.find((c) => c.id === item.catalogId)
    const unitPrice = parseDecimalValue(
      catalog?.discountedPrice ?? catalog?.price
    )
    const itemTotal = unitPrice * item.quantity
    additionalSubtotal += itemTotal
    return {
      ...item,
      unitPrice,
      totalPrice: itemTotal,
      catalog: requireDefined(
        catalog,
        `Catalog ${item.catalogId} not found while extending booking`
      ),
    }
  })

  const additionalGst = calculateGST(additionalSubtotal)
  const additionalTotal = roundToTwoDecimals(additionalSubtotal + additionalGst)

  const extensionOrderId = generateOrderId()
  const newTotal = parseFloat(booking.totalAmount || "0") + additionalTotal

  const result = await db.transaction(async (tx) => {
    const insertedExtensionOrders = await tx
      .insert(orders)
      .values({
        userId,
        orderId: extensionOrderId,
        amount: additionalTotal.toString(),
        currency: "INR",
        status: "CREATED",
        metadata: { type: "extension", parentBookingId: booking.id },
      })
      .returning()
    const extensionOrder = requireDefined(
      insertedExtensionOrders[0],
      "Order insert returned no row while extending booking"
    )

    await tx.insert(bookingItems).values(
      newItems.map((item) => ({
        bookingId: booking.id,
        catalogId: item.catalogId,
        name: item.catalog.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toString(),
        totalPrice: item.totalPrice.toString(),
        metadata: { isExtension: true },
      }))
    )

    await tx
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
      .where(eq(bookings.id, booking.id))

    if (idempotencyKey) {
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 24)

      await tx.insert(idempotencyKeys).values({
        key: idempotencyKey,
        userId,
        resourceType: "booking_extension",
        resourceId: extensionOrder.id,
        requestHash,
        responseCode: 200,
        responseBody: {
          bookingId: booking.id,
          extensionOrder: {
            id: extensionOrder.id,
            orderId: extensionOrder.orderId,
            amount: extensionOrder.amount,
          },
          newTotal: newTotal.toString(),
        },
        expiresAt,
      })
    }

    return {
      bookingId: booking.id,
      extensionOrder: {
        id: extensionOrder.id,
        orderId: extensionOrder.orderId,
        amount: extensionOrder.amount,
      },
      newTotal: newTotal.toString(),
    }
  })

  return result
}
