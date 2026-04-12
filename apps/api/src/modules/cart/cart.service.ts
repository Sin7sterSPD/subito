import { db } from "@subito/db";
import {
  carts,
  cartItems,
  catalogs,
  bundles,
  coupons,
  bookings,
  bookingItems,
  orders,
} from "@subito/db/schema";
import { eq, and } from "drizzle-orm";
import {
  NotFoundError,
  BadRequestError,
  ConflictError,
} from "../../lib/errors";
import {
  generateBookingNumber,
  generateOrderId,
  roundToTwoDecimals,
  calculateGST,
} from "../../utils/helpers";
import { cacheDel } from "../../lib/redis";

export async function getCart(userId: string) {
  let cart = await db.query.carts.findFirst({
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
  });

  if (!cart) {
    cart = await createCart(userId);
  }

  return formatCartResponse(cart);
}

export async function createCart(userId: string) {
  await db
    .update(carts)
    .set({ isActive: false })
    .where(and(eq(carts.userId, userId), eq(carts.isActive, true)));

  const [newCart] = await db
    .insert(carts)
    .values({
      userId,
      bookingType: "SCHEDULED",
    })
    .returning();

  return {
    ...newCart,
    items: [],
    bundle: null,
    coupon: null,
    address: null,
  };
}

export async function addItem(
  userId: string,
  data: {
    catalogInfo: {
      catalogId: string;
      quantity: number;
      propertyConfig?: Record<string, unknown>;
    };
    isQuickAdd: boolean;
    forceAdd?: boolean;
    bundleId?: string;
    bundleInfo?: { bundleId: string };
  }
) {
  const cart = await getOrCreateCart(userId);

  const catalog = await db.query.catalogs.findFirst({
    where: eq(catalogs.id, data.catalogInfo.catalogId),
    with: {
      listing: true,
      pricing: true,
    },
  });

  if (!catalog) {
    throw new NotFoundError("Catalog item");
  }

  const existingItem = cart.items?.find(
    (item) => item.catalogId === data.catalogInfo.catalogId
  );

  const quantity = data.catalogInfo.quantity;
  const unitPrice = calculateUnitPrice(
    catalog,
    data.catalogInfo.propertyConfig
  );
  const totalPrice = roundToTwoDecimals(unitPrice * quantity);

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
      .where(eq(cartItems.id, existingItem.id));
  } else {
    await db.insert(cartItems).values({
      cartId: cart.id,
      catalogId: data.catalogInfo.catalogId,
      quantity,
      unitPrice: unitPrice.toString(),
      totalPrice: totalPrice.toString(),
      isQuickAdd: data.isQuickAdd,
      propertyConfig: data.catalogInfo.propertyConfig,
    });
  }

  if (data.bundleInfo?.bundleId || data.bundleId) {
    const bundleId = data.bundleInfo?.bundleId || data.bundleId;
    await db
      .update(carts)
      .set({ bundleId, version: cart.version + 1 })
      .where(eq(carts.id, cart.id));
  }

  await recalculateCart(cart.id);
  return getCart(userId);
}

export async function updateCart(
  userId: string,
  data: {
    deliveryAddressId?: string;
    bookingType?: "INSTANT" | "SCHEDULED" | "RECURRING";
    timeSlot?: { time: { start: string }[] };
    recurringType?: "WEEKLY" | "BIWEEKLY" | "MONTHLY";
  }
) {
  const cart = await getOrCreateCart(userId);

  const updateData: Record<string, unknown> = {
    version: cart.version + 1,
    updatedAt: new Date(),
  };

  if (data.deliveryAddressId) {
    updateData.addressId = data.deliveryAddressId;
  }
  if (data.bookingType) {
    updateData.bookingType = data.bookingType;
  }
  if (data.timeSlot) {
    updateData.timeSlot = data.timeSlot;
  }
  if (data.recurringType) {
    updateData.recurringType = data.recurringType;
  }

  await db.update(carts).set(updateData).where(eq(carts.id, cart.id));

  await recalculateCart(cart.id);
  return getCart(userId);
}

export async function updateCartItem(
  userId: string,
  data: {
    catalogItemId: string;
    changeType: "INCREMENT" | "DECREMENT";
    isQuickAdd: boolean;
    quantity?: number;
    listingItemId?: string;
  }
) {
  const cart = await getOrCreateCart(userId);

  const item = cart.items?.find((i) => i.catalogId === data.catalogItemId);
  if (!item) {
    throw new NotFoundError("Cart item");
  }

  const catalog = await db.query.catalogs.findFirst({
    where: eq(catalogs.id, data.catalogItemId),
  });

  if (!catalog) {
    throw new NotFoundError("Catalog");
  }

  const step = catalog.stepQuantity || 1;
  const min = catalog.minQuantity || 1;
  const max = catalog.maxQuantity || 100;

  let newQuantity = item.quantity;
  if (data.changeType === "INCREMENT") {
    newQuantity = Math.min(item.quantity + step, max);
  } else {
    newQuantity = item.quantity - step;
  }

  if (newQuantity < min) {
    await db.delete(cartItems).where(eq(cartItems.id, item.id));
  } else {
    const totalPrice = roundToTwoDecimals(
      newQuantity * parseFloat(item.unitPrice)
    );
    await db
      .update(cartItems)
      .set({
        quantity: newQuantity,
        totalPrice: totalPrice.toString(),
        updatedAt: new Date(),
      })
      .where(eq(cartItems.id, item.id));
  }

  await recalculateCart(cart.id);
  return getCart(userId);
}

export async function removeItem(
  userId: string,
  data: { itemId?: string; bundleId?: string }
) {
  const cart = await getOrCreateCart(userId);

  if (data.bundleId) {
    await db
      .update(carts)
      .set({ bundleId: null, version: cart.version + 1 })
      .where(eq(carts.id, cart.id));

    const bundleItemRecords = await db.query.bundles.findFirst({
      where: eq(bundles.id, data.bundleId),
      with: { items: true },
    });

    if (bundleItemRecords) {
      for (const bi of bundleItemRecords.items) {
        const cartItem = cart.items?.find((i) => i.catalogId === bi.catalogId);
        if (cartItem) {
          await db.delete(cartItems).where(eq(cartItems.id, cartItem.id));
        }
      }
    }
  } else if (data.itemId) {
    await db.delete(cartItems).where(eq(cartItems.id, data.itemId));
  }

  await recalculateCart(cart.id);
  return getCart(userId);
}

export async function removeInactiveItems(userId: string) {
  const cart = await getOrCreateCart(userId);

  for (const item of cart.items || []) {
    const catalog = await db.query.catalogs.findFirst({
      where: eq(catalogs.id, item.catalogId),
    });

    if (!catalog || !catalog.isActive) {
      await db.delete(cartItems).where(eq(cartItems.id, item.id));
    }
  }

  await recalculateCart(cart.id);
  return getCart(userId);
}

export async function checkout(
  userId: string,
  data: {
    paymentMethodId?: string;
    amount?: number;
    meta?: { orderSource: string };
    cartVersion: number;
  }
) {
  const cart = await getOrCreateCart(userId);

  if (cart.version !== data.cartVersion) {
    throw new ConflictError("Cart has been modified. Please refresh.");
  }

  if (!cart.items || cart.items.length === 0) {
    throw new BadRequestError("Cart is empty");
  }

  if (!cart.addressId) {
    throw new BadRequestError("Delivery address is required");
  }

  const orderId = generateOrderId();
  const [order] = await db
    .insert(orders)
    .values({
      orderId,
      userId,
      amount: cart.finalAmount,
      status: "CREATED",
    })
    .returning();

  return {
    orderId: order.orderId,
    amount: cart.finalAmount,
    currency: "INR",
    status: "CREATED",
  };
}

export async function checkoutV2(
  userId: string,
  data: { cartVersion: number }
) {
  const cart = await getOrCreateCart(userId);

  if (cart.version !== data.cartVersion) {
    throw new ConflictError("Cart has been modified. Please refresh.");
  }

  if (!cart.items || cart.items.length === 0) {
    throw new BadRequestError("Cart is empty");
  }

  if (!cart.addressId) {
    throw new BadRequestError("Delivery address is required");
  }

  const bookingNumber = generateBookingNumber();
  const orderId = generateOrderId();

  const [booking] = await db
    .insert(bookings)
    .values({
      bookingNumber,
      userId,
      addressId: cart.addressId,
      bundleId: cart.bundleId,
      couponId: cart.couponId,
      status: "PENDING_PAYMENT",
      bookingType: cart.bookingType,
      recurringType: cart.recurringType,
      totalPrice: cart.totalPrice,
      discountAmount: cart.discountAmount,
      gstAmount: cart.gstAmount,
      surgePrice: cart.surgePrice,
      finalAmount: cart.finalAmount,
    })
    .returning();

  for (const item of cart.items || []) {
    const catalog = await db.query.catalogs.findFirst({
      where: eq(catalogs.id, item.catalogId),
      with: { listing: true },
    });

    await db.insert(bookingItems).values({
      bookingId: booking.id,
      catalogId: item.catalogId,
      name: catalog?.name || "Item",
      description: catalog?.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      propertyConfig: item.propertyConfig,
    });
  }

  const [order] = await db
    .insert(orders)
    .values({
      orderId,
      bookingId: booking.id,
      userId,
      amount: cart.finalAmount,
      status: "CREATED",
    })
    .returning();

  await db
    .update(carts)
    .set({ isActive: false })
    .where(eq(carts.id, cart.id));

  return {
    bookingId: booking.id,
    bookingNumber: booking.bookingNumber,
    orderId: order.orderId,
    amount: cart.finalAmount,
    currency: "INR",
    status: "PENDING_PAYMENT",
  };
}

export async function verifyPayment(
  userId: string,
  data: { orderId: string; paymentId: string; signature: string }
) {
  const order = await db.query.orders.findFirst({
    where: and(eq(orders.orderId, data.orderId), eq(orders.userId, userId)),
  });

  if (!order) {
    throw new NotFoundError("Order");
  }

  await db
    .update(orders)
    .set({ status: "COMPLETED", updatedAt: new Date() })
    .where(eq(orders.id, order.id));

  if (order.bookingId) {
    await db
      .update(bookings)
      .set({ status: "PENDING_MATCH", updatedAt: new Date() })
      .where(eq(bookings.id, order.bookingId));
  }

  return { verified: true, orderId: data.orderId };
}

async function getOrCreateCart(userId: string) {
  let cart = await db.query.carts.findFirst({
    where: and(eq(carts.userId, userId), eq(carts.isActive, true)),
    with: {
      items: true,
      bundle: true,
      coupon: true,
    },
  });

  if (!cart) {
    const created = await createCart(userId);
    cart = { ...created, items: [] };
  }

  return cart;
}

async function recalculateCart(cartId: string) {
  const cart = await db.query.carts.findFirst({
    where: eq(carts.id, cartId),
    with: {
      items: true,
      bundle: true,
      coupon: true,
    },
  });

  if (!cart) return;

  let totalPrice = 0;
  for (const item of cart.items || []) {
    totalPrice += parseFloat(item.totalPrice);
  }

  let discountAmount = 0;

  if (cart.bundle && cart.bundleId) {
    const bundle = await db.query.bundles.findFirst({
      where: eq(bundles.id, cart.bundleId),
    });
    if (bundle && bundle.discountPercentage) {
      discountAmount = roundToTwoDecimals(
        totalPrice * (parseFloat(bundle.discountPercentage) / 100)
      );
    }
  }

  if (cart.coupon && cart.couponId) {
    const coupon = await db.query.coupons.findFirst({
      where: eq(coupons.id, cart.couponId),
    });
    if (coupon) {
      const couponDiscount =
        coupon.discountType === "PERCENTAGE"
          ? roundToTwoDecimals(
              totalPrice * (parseFloat(coupon.discountValue) / 100)
            )
          : parseFloat(coupon.discountValue);

      const maxDiscount = coupon.maxDiscount
        ? parseFloat(coupon.maxDiscount)
        : Infinity;
      discountAmount += Math.min(couponDiscount, maxDiscount);
    }
  }

  const totalAfterDiscount = roundToTwoDecimals(
    Math.max(totalPrice - discountAmount, 0)
  );
  const gstAmount = calculateGST(totalAfterDiscount);
  const surgePrice = cart.surgeApplicable ? roundToTwoDecimals(totalAfterDiscount * 0.1) : 0;
  const finalAmount = roundToTwoDecimals(
    totalAfterDiscount + gstAmount + surgePrice
  );

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
    .where(eq(carts.id, cartId));
}

function calculateUnitPrice(
  catalog: {
    price: string;
    discountedPrice: string | null;
    pricing?: { dependentOn: string | null; dependentValue: string | null; price: string }[];
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
        return parseFloat(rule.price);
      }
    }
  }

  return parseFloat(catalog.discountedPrice || catalog.price);
}

function formatCartResponse(cart: any) {
  return {
    id: cart.id,
    items: cart.items?.map((item: any) => ({
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
  };
}
