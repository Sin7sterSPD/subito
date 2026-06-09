import { db } from "@subito/db"

import { eq, and, inArray } from "@subito/db"
import {
  carts,
  cartItems,
  catalogs,
  bundles,
  coupons,
  bookings,
  bookingItems,
  orders,
  idempotencyKeys,
} from "@subito/db"

import { createHash } from "crypto"
import { NotFoundError, BadRequestError, ConflictError } from "@/lib/errors"
import {
  generateBookingNumber,
  generateOrderId,
  roundToTwoDecimals,
  calculateGST,
} from "@/utils/helpers"

import { enqueuePartnerMatchingJob } from "@/lib/enqueue-partner-match"
import { verifyPaymentResponseSignature } from "@/lib/juspay-signature"

async function checkIdempotencyKey(
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

type ResponseCart = NonNullable<
  Awaited<ReturnType<typeof findActiveCartForResponse>>
>
type CartResponseItem = ResponseCart["items"][number]

async function findActiveCartForResponse(userId: string) {
  return db.query.carts.findFirst({
    where: and(eq(carts.userId, userId), eq(carts.isActive, true)),
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
      bundle: true,
      coupon: true,
      address: true,
    },
  })
}

async function findActiveCartForMutation(userId: string) {
  return db.query.carts.findFirst({
    where: and(eq(carts.userId, userId), eq(carts.isActive, true)),
    with: {
      items: true,
      bundle: true,
      coupon: true,
    },
  })
}

export async function getCart(userId: string) {
  let cart = await findActiveCartForResponse(userId)

  if (!cart) {
    await createCart(userId)
    cart = await findActiveCartForResponse(userId)
  }

  if (!cart) {
    throw new BadRequestError("Failed to create cart")
  }

  return formatCartResponse(cart)
}

// export async function createCart(userId: string) {
//   await db
//     .update(carts)
//     .set({ isActive: false })
//     .where(and(eq(carts.userId, userId), eq(carts.isActive, true)))

//   const [newCart] = await db
//     .insert(carts)
//     .values({
//       userId,
//       bookingType: "SCHEDULED",
//     })
//     .returning()

//   if (!newCart) {
//     throw new BadRequestError("Failed to create cart")
//   }

//   return newCart
// }

export async function createCart(userId: string) {
  return db.transaction(async (tx) => {
    // Lock any existing active cart
    const existing = await tx
      .select()
      .from(carts)
      .where(and(eq(carts.userId, userId), eq(carts.isActive, true)))
      .for("update")
    await tx
      .update(carts)
      .set({ isActive: false })
      .where(and(eq(carts.userId, userId), eq(carts.isActive, true)))
    const [newCart] = await tx
      .insert(carts)
      .values({
        userId,
        bookingType: "SCHEDULED",
      })
      .returning()
    if (!newCart) {
      throw new BadRequestError("Failed to create cart")
    }
    return newCart
  })
}
export async function addItem(
  userId: string,
  data: {
    catalogInfo: {
      catalogId: string
      quantity: number
      propertyConfig?: Record<string, unknown>
    }
    isQuickAdd: boolean
    forceAdd?: boolean
    bundleId?: string
    bundleInfo?: { bundleId: string }
  }
) {
  const cart = await getOrCreateCart(userId)

  const catalog = await db.query.catalogs.findFirst({
    where: eq(catalogs.id, data.catalogInfo.catalogId),
    with: {
      listing: true,
      pricing: true,
    },
  })

  if (!catalog) {
    throw new NotFoundError("Catalog item")
  }

  const existingItem = cart.items?.find(
    (item) => item.catalogId === data.catalogInfo.catalogId
  )

  const quantity = data.catalogInfo.quantity
  const unitPrice = calculateUnitPrice(catalog, data.catalogInfo.propertyConfig)
  const totalPrice = roundToTwoDecimals(unitPrice * quantity)

  if (existingItem && !data.forceAdd) {
    await db
      .update(cartItems)
      .set({
        quantity: existingItem.quantity + quantity,
        totalPrice: roundToTwoDecimals(
          (existingItem.quantity + quantity) * unitPrice
        ).toString(),
        updatedAt: new Date(),
      })
      .where(eq(cartItems.id, existingItem.id))
  } else {
    await db.insert(cartItems).values({
      cartId: cart.id,
      catalogId: data.catalogInfo.catalogId,
      quantity,
      unitPrice: unitPrice.toString(),
      totalPrice: totalPrice.toString(),
      isQuickAdd: data.isQuickAdd,
      propertyConfig: data.catalogInfo.propertyConfig,
    })
  }

  if (data.bundleInfo?.bundleId || data.bundleId) {
    const bundleId = data.bundleInfo?.bundleId || data.bundleId
    await db
      .update(carts)
      .set({ bundleId, version: cart.version + 1 })
      .where(eq(carts.id, cart.id))
  }

  await recalculateCart(cart.id)
  return getCart(userId)
}

export async function updateCart(
  userId: string,
  data: {
    deliveryAddressId?: string
    bookingType?: "INSTANT" | "SCHEDULED" | "RECURRING"
    timeSlot?: { time: { start: string }[] }
    recurringType?: "WEEKLY" | "BIWEEKLY" | "MONTHLY"
  }
) {
  const cart = await getOrCreateCart(userId)

  const updateData: Record<string, unknown> = {
    version: cart.version + 1,
    updatedAt: new Date(),
  }

  if (data.deliveryAddressId) {
    updateData.addressId = data.deliveryAddressId
  }
  if (data.bookingType) {
    updateData.bookingType = data.bookingType
  }
  if (data.timeSlot) {
    updateData.timeSlot = data.timeSlot
  }
  if (data.recurringType) {
    updateData.recurringType = data.recurringType
  }

  await db.update(carts).set(updateData).where(eq(carts.id, cart.id))

  await recalculateCart(cart.id)
  return getCart(userId)
}

export async function updateCartItem(
  userId: string,
  data: {
    catalogItemId: string
    changeType: "INCREMENT" | "DECREMENT"
    isQuickAdd: boolean
    quantity?: number
    listingItemId?: string
  }
) {
  const cart = await getOrCreateCart(userId)

  const item = cart.items?.find((i) => i.catalogId === data.catalogItemId)
  if (!item) {
    throw new NotFoundError("Cart item")
  }

  const catalog = await db.query.catalogs.findFirst({
    where: eq(catalogs.id, data.catalogItemId),
  })

  if (!catalog) {
    throw new NotFoundError("Catalog")
  }

  const step = catalog.stepQuantity || 1
  const min = catalog.minQuantity || 1
  const max = catalog.maxQuantity || 100

  let newQuantity = item.quantity
  if (data.changeType === "INCREMENT") {
    newQuantity = Math.min(item.quantity + step, max)
  } else {
    newQuantity = item.quantity - step
  }

  if (newQuantity < min) {
    await db.delete(cartItems).where(eq(cartItems.id, item.id))
  } else {
    const totalPrice = roundToTwoDecimals(
      newQuantity * parseFloat(item.unitPrice)
    )
    await db
      .update(cartItems)
      .set({
        quantity: newQuantity,
        totalPrice: totalPrice.toString(),
        updatedAt: new Date(),
      })
      .where(eq(cartItems.id, item.id))
  }

  await recalculateCart(cart.id)
  return getCart(userId)
}

export async function removeItem(
  userId: string,
  data: { itemId?: string; bundleId?: string }
) {
  const cart = await getOrCreateCart(userId)

  if (data.bundleId) {
    await db
      .update(carts)
      .set({ bundleId: null, version: cart.version + 1 })
      .where(eq(carts.id, cart.id))

    const bundleItemRecords = await db.query.bundles.findFirst({
      where: eq(bundles.id, data.bundleId),
      with: { items: true },
    })

    if (bundleItemRecords) {
      for (const bi of bundleItemRecords.items) {
        const cartItem = cart.items?.find((i) => i.catalogId === bi.catalogId)
        if (cartItem) {
          await db.delete(cartItems).where(eq(cartItems.id, cartItem.id))
        }
      }
    }
  } else if (data.itemId) {
    await db.delete(cartItems).where(eq(cartItems.id, data.itemId))
  }

  await recalculateCart(cart.id)
  return getCart(userId)
}

export async function removeInactiveItems(userId: string) {
  const cart = await getOrCreateCart(userId)
  const items = cart.items || []
  if (items.length === 0) {
    await recalculateCart(cart.id)
    return getCart(userId)
  }

  const catalogIds = [...new Set(items.map((i) => i.catalogId))]
  const catalogRows = await db.query.catalogs.findMany({
    where: inArray(catalogs.id, catalogIds),
  })
  const byCatalogId = new Map(catalogRows.map((c) => [c.id, c]))

  const itemIdsToRemove = items
    .filter((item) => {
      const c = byCatalogId.get(item.catalogId)
      return !c || !c.isActive
    })
    .map((i) => i.id)

  if (itemIdsToRemove.length > 0) {
    await db.delete(cartItems).where(inArray(cartItems.id, itemIdsToRemove))
  }

  await recalculateCart(cart.id)
  return getCart(userId)
}

export async function checkout(
  userId: string,
  data: {
    paymentMethodId?: string
    amount?: number
    meta?: { orderSource: string }
    cartVersion: number
  },
  idempotencyKey?: string
) {
  const { existingResourceId, requestHash } = await checkIdempotencyKey(
    userId,
    idempotencyKey,
    "checkout",
    { cartVersion: data.cartVersion, userId }
  )
  if (existingResourceId) {
    const existingOrder = await db.query.orders.findFirst({
      where: eq(orders.id, existingResourceId),
    })
    if (existingOrder) {
      return {
        orderId: existingOrder.orderId,
        amount: existingOrder.amount,
        currency: "INR",
        status: existingOrder.status,
        idempotent: true,
      }
    }
  }
  const cart = await getOrCreateCart(userId)
  if (cart.version !== data.cartVersion) {
    throw new ConflictError("Cart has been modified. Please refresh.")
  }
  if (!cart.items || cart.items.length === 0) {
    throw new BadRequestError("Cart is empty")
  }
  if (!cart.addressId) {
    throw new BadRequestError("Delivery address is required")
  }
  const orderId = generateOrderId()
  const result = await db.transaction(async (tx) => {
    const createdOrders = await tx
      .insert(orders)
      .values({
        orderId,
        userId,
        amount: cart.finalAmount,
        status: "CREATED",
      })
      .returning()
    const order = createdOrders[0]
    if (!order) {
      throw new BadRequestError("Failed to create order")
    }
    await tx.update(carts).set({ isActive: false }).where(eq(carts.id, cart.id))
    if (idempotencyKey) {
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 6)
      await tx.insert(idempotencyKeys).values({
        key: idempotencyKey,
        userId,
        resourceType: "checkout",
        resourceId: order.id,
        requestHash,
        responseCode: 200,
        responseBody: {
          orderId: order.orderId,
          amount: order.amount,
          currency: "INR",
          status: "CREATED",
        },
        expiresAt,
      })
    }
    return {
      orderId: order.orderId,
      amount: cart.finalAmount,
      currency: "INR",
      status: "CREATED",
    }
  })
  return result
}
   

export async function checkoutV2(
  userId: string,
  data: { cartVersion: number },
  idempotencyKey?: string
) {
  const { existingResourceId, requestHash } = await checkIdempotencyKey(
    userId,
    idempotencyKey,
    "checkout_v2",
    { cartVersion: data.cartVersion, userId }
  )

  if (existingResourceId) {
    const existingBooking = await db.query.bookings.findFirst({
      where: eq(bookings.id, existingResourceId),
    })

    if (existingBooking) {
      return {
        bookingId: existingBooking.id,
        bookingNumber: existingBooking.bookingNumber,
        orderId: null,
        amount: existingBooking.finalAmount,
        currency: "INR",
        status: existingBooking.status,
        idempotent: true,
      }
    }
  }

  const cart = await getOrCreateCart(userId)

  if (cart.version !== data.cartVersion) {
    throw new ConflictError("Cart has been modified. Please refresh.")
  }

  if (!cart.items || cart.items.length === 0) {
    throw new BadRequestError("Cart is empty")
  }

  if (!cart.addressId) {
    throw new BadRequestError("Delivery address is required")
  }
  const addressId = cart.addressId

  const bookingNumber = generateBookingNumber()
  const orderId = generateOrderId()

  const catalogIds = cart.items?.map((item) => item.catalogId) || []
  const catalogsForItems =
    catalogIds.length > 0
      ? await db.query.catalogs.findMany({
          where: inArray(catalogs.id, catalogIds),
        })
      : []

  const result = await db.transaction(async (tx) => {
    const createdBookings = await tx
      .insert(bookings)
      .values({
        bookingNumber,
        idempotencyKey,
        userId,
        addressId,
        bundleId: cart.bundleId,
        couponId: cart.couponId,
        status: "PENDING_PAYMENT",
        bookingType: cart.bookingType,
        recurringType: cart.recurringType,
        totalPrice: cart.totalPrice,
        discountAmount: cart.discountAmount,
        gstAmount: cart.gstAmount,
        surgeAmount: cart.surgePrice,
        finalAmount: cart.finalAmount,
      })
      .returning()
    const booking = createdBookings[0]

    if (!booking) {
      throw new BadRequestError("Failed to create booking")
    }

    if (cart.items && cart.items.length > 0) {
      await tx.insert(bookingItems).values(
        cart.items.map((item) => {
          const catalog = catalogsForItems.find((c) => c.id === item.catalogId)
          return {
            bookingId: booking.id,
            catalogId: item.catalogId,
            name: catalog?.name || "Item",
            description: catalog?.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            propertyConfig: item.propertyConfig,
          }
        })
      )
    }

    const createdOrders = await tx
      .insert(orders)
      .values({
        orderId,
        bookingId: booking.id,
        userId,
        amount: cart.finalAmount,
        status: "CREATED",
      })
      .returning()
    const order = createdOrders[0]

    if (!order) {
      throw new BadRequestError("Failed to create order")
    }

    await tx.update(carts).set({ isActive: false }).where(eq(carts.id, cart.id))

    if (idempotencyKey) {
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 6)

      await tx.insert(idempotencyKeys).values({
        key: idempotencyKey,
        userId,
        resourceType: "checkout_v2",
        resourceId: booking.id,
        requestHash,
        responseCode: 200,
        responseBody: {
          bookingId: booking.id,
          bookingNumber: booking.bookingNumber,
          orderId: order.orderId,
          amount: cart.finalAmount,
          currency: "INR",
          status: "PENDING_PAYMENT",
        },
        expiresAt,
      })
    }

    return {
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      orderId: order.orderId,
      amount: cart.finalAmount,
      currency: "INR",
      status: "PENDING_PAYMENT",
    }
  })

  return result
}

export async function verifyPayment(
  userId: string,
  data: { orderId: string; paymentId: string; signature: string }
) {
  if (
    !verifyPaymentResponseSignature(
      data.orderId,
      data.paymentId,
      data.signature
    )
  ) {
    throw new BadRequestError(
      "Invalid or missing payment verification signature"
    )
  }

  const result = await db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(orders)
      .where(and(eq(orders.orderId, data.orderId), eq(orders.userId, userId)))
      .for("update")

    if (!order) {
      throw new NotFoundError("Order")
    }

    if (order.status === "COMPLETED") {
      return {
        verified: true,
        orderId: data.orderId,
        alreadyProcessed: true,
        bookingId: order.bookingId,
        shouldEnqueue: false,
      }
    }

    if (order.status === "FAILED" || order.status === "CANCELLED") {
      throw new BadRequestError(`Order is in ${order.status} status`)
    }

    await tx
      .update(orders)
      .set({ status: "COMPLETED", updatedAt: new Date() })
      .where(eq(orders.id, order.id))

    let shouldEnqueue = false
    if (order.bookingId) {
      const updated = await tx
        .update(bookings)
        .set({ status: "PENDING_MATCH", updatedAt: new Date() })
        .where(
          and(
            eq(bookings.id, order.bookingId),
            eq(bookings.status, "PENDING_PAYMENT")
          )
        )
        .returning({ id: bookings.id })
      shouldEnqueue = updated.length > 0
    }

    return {
      verified: true,
      orderId: data.orderId,
      bookingId: order.bookingId,
      shouldEnqueue,
    }
  })

  if (result.bookingId && result.shouldEnqueue) {
    await enqueuePartnerMatchingJob(result.bookingId)
  }

  return { verified: true, orderId: data.orderId }
}

async function getOrCreateCart(userId: string) {
  let cart = await findActiveCartForMutation(userId)

  if (!cart) {
    await createCart(userId)
    cart = await findActiveCartForMutation(userId)
  }

  if (!cart) {
    throw new BadRequestError("Failed to create cart")
  }

  return cart
}

async function recalculateCart(cartId: string) {
  const cart = await db.query.carts.findFirst({
    where: eq(carts.id, cartId),
    with: {
      items: true,
      bundle: true,
      coupon: true,
    },
  })

  if (!cart) return

  let totalPrice = 0
  for (const item of cart.items || []) {
    totalPrice += parseFloat(item.totalPrice)
  }

  let discountAmount = 0

  if (cart.bundle && cart.bundleId) {
    const bundle = await db.query.bundles.findFirst({
      where: eq(bundles.id, cart.bundleId),
    })
    if (bundle && bundle.discountPercentage) {
      discountAmount = roundToTwoDecimals(
        totalPrice * (parseFloat(bundle.discountPercentage) / 100)
      )
    }
  }

  if (cart.coupon && cart.couponId) {
    const coupon = await db.query.coupons.findFirst({
      where: eq(coupons.id, cart.couponId),
    })
    if (coupon) {
      const couponDiscount =
        coupon.discountType === "PERCENTAGE"
          ? roundToTwoDecimals(
              totalPrice * (parseFloat(coupon.discountValue) / 100)
            )
          : parseFloat(coupon.discountValue)

      const maxDiscount = coupon.maxDiscount
        ? parseFloat(coupon.maxDiscount)
        : Infinity
      discountAmount += Math.min(couponDiscount, maxDiscount)
    }
  }

  const totalAfterDiscount = roundToTwoDecimals(
    Math.max(totalPrice - discountAmount, 0)
  )
  const gstAmount = calculateGST(totalAfterDiscount)
  const surgePrice = cart.surgeApplicable
    ? roundToTwoDecimals(totalAfterDiscount * 0.1)
    : 0
  const finalAmount = roundToTwoDecimals(
    totalAfterDiscount + gstAmount + surgePrice
  )

  await db
    .update(carts)
    .set({
      totalPrice: totalPrice.toString(),
      totalAfterDiscount: totalAfterDiscount.toString(),
      discountAmount: discountAmount.toString(),
      gstAmount: gstAmount.toString(),
      surgePrice: surgePrice.toString(),
      finalAmount: finalAmount.toString(),
      updatedAt: new Date(),
    })
    .where(eq(carts.id, cartId))
}

function calculateUnitPrice(
  catalog: {
    price: string
    discountedPrice: string | null
    pricing?: {
      dependentOn: string | null
      dependentValue: string | null
      price: string
    }[]
  },
  propertyConfig?: Record<string, unknown>
): number {
  if (propertyConfig && catalog.pricing && catalog.pricing.length > 0) {
    for (const rule of catalog.pricing) {
      if (
        rule.dependentOn &&
        rule.dependentValue &&
        propertyConfig[rule.dependentOn]?.toString() === rule.dependentValue
      ) {
        return parseFloat(rule.price)
      }
    }
  }

  return parseFloat(catalog.discountedPrice || catalog.price)
}

function formatCartResponse(cart: ResponseCart) {
  return {
    id: cart.id,
    items:
      cart.items?.map((item: CartResponseItem) => ({
        id: item.id,
        catalogId: item.catalogId,
        catalog: item.catalog,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        isQuickAdd: item.isQuickAdd,
        propertyConfig: item.propertyConfig,
      })) || [],
    bundle: cart.bundle,
    coupon: cart.coupon,
    deliveryAddressId: cart.addressId,
    address: cart.address,
    bookingType: cart.bookingType,
    recurringType: cart.recurringType,
    timeSlot: cart.timeSlot,
    totalPrice: cart.totalPrice,
    totalAfterDiscount: cart.totalAfterDiscount,
    discountAmount: cart.discountAmount,
    gst: cart.gstAmount,
    surgeApplicable: cart.surgeApplicable,
    surgePrice: cart.surgePrice,
    finalTotalAmount: cart.finalAmount,
    version: cart.version,
  }
}

export async function extendedCheckout(
  userId: string,
  data: {
    bookingId: string
    additionalItems: Array<{
      catalogId: string
      quantity: number
    }>
    cartVersion: number
  },
  idempotencyKey?: string
) {
  const { existingResourceId, requestHash } = await checkIdempotencyKey(
    userId,
    idempotencyKey,
    "extended_checkout",
    data
  )

  if (existingResourceId) {
    const existingOrder = await db.query.orders.findFirst({
      where: eq(orders.id, existingResourceId),
    })

    if (existingOrder) {
      return {
        bookingId: data.bookingId,
        extensionOrderId: existingOrder.orderId,
        extensionAmount: existingOrder.amount,
        newTotalAmount: null,
        currency: "INR",
        status: existingOrder.status,
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

  const catalogIds = data.additionalItems.map((i) => i.catalogId)
  const catalogRows = await db.query.catalogs.findMany({
    where: inArray(catalogs.id, catalogIds),
    with: { listing: true },
  })

  if (catalogRows.length !== data.additionalItems.length) {
    throw new NotFoundError("One or more catalog items not found")
  }

  let additionalTotal = 0
  const itemsToAdd = data.additionalItems.map((item) => {
    const catalog = catalogRows.find((c) => c.id === item.catalogId)!
    const unitPrice = parseFloat(catalog.discountedPrice || catalog.price)
    const totalPrice = roundToTwoDecimals(unitPrice * item.quantity)
    additionalTotal += totalPrice
    return {
      bookingId: booking.id,
      catalogId: item.catalogId,
      name: catalog.name,
      description: catalog.description,
      quantity: item.quantity,
      unitPrice: unitPrice.toString(),
      totalPrice: totalPrice.toString(),
      metadata: { isExtension: true },
    }
  })

  const additionalGst = calculateGST(additionalTotal)
  const extensionTotal = roundToTwoDecimals(additionalTotal + additionalGst)

  const orderId = generateOrderId()
  const currentTotal = parseFloat(booking.finalAmount || "0")
  const newTotal = roundToTwoDecimals(currentTotal + extensionTotal)

  const result = await db.transaction(async (tx) => {
    if (itemsToAdd.length > 0) {
      await tx.insert(bookingItems).values(itemsToAdd)
    }

    const createdOrders = await tx
      .insert(orders)
      .values({
        orderId,
        bookingId: booking.id,
        userId,
        amount: extensionTotal.toString(),
        status: "CREATED",
        metadata: { type: "extension" },
      })
      .returning()
    const extensionOrder = createdOrders[0]

    if (!extensionOrder) {
      throw new BadRequestError("Failed to create extension order")
    }

    await tx
      .update(bookings)
      .set({
        finalAmount: newTotal.toString(),
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
      expiresAt.setHours(expiresAt.getHours() + 6)
      await tx.insert(idempotencyKeys).values({
        key: idempotencyKey,
        userId,
        resourceType: "extended_checkout",
        resourceId: extensionOrder.id,
        requestHash,
        responseCode: 200,
        responseBody: {
          bookingId: booking.id,
          extensionOrderId: extensionOrder.orderId,
          extensionAmount: extensionTotal.toString(),
          newTotalAmount: newTotal.toString(),
          currency: "INR",
          status: "PENDING_PAYMENT",
        },
        expiresAt,
      })
    }

    return {
      bookingId: booking.id,
      extensionOrderId: extensionOrder.orderId,
      extensionAmount: extensionTotal.toString(),
      newTotalAmount: newTotal.toString(),
      currency: "INR",
      status: "PENDING_PAYMENT",
    }
  })

  return result
}
