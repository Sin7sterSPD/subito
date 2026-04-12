import { db } from "@subito/db";
import { coupons, couponUsage, carts } from "@subito/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { NotFoundError, BadRequestError } from "../../lib/errors";

export async function listCoupons(
  userId: string,
  query: { page: number; limit: number }
) {
  const now = new Date();

  const availableCoupons = await db.query.coupons.findMany({
    where: and(
      eq(coupons.isActive, true),
      lte(coupons.validFrom, now),
      gte(coupons.validTill, now)
    ),
    limit: query.limit,
    offset: (query.page - 1) * query.limit,
  });

  const usagePromises = availableCoupons.map(async (coupon) => {
    const usageCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(couponUsage)
      .where(
        and(eq(couponUsage.couponId, coupon.id), eq(couponUsage.userId, userId))
      );

    return {
      ...coupon,
      userUsageCount: Number(usageCount[0]?.count || 0),
    };
  });

  const couponsWithUsage = await Promise.all(usagePromises);

  const eligibleCoupons = couponsWithUsage.filter((c) => {
    if (c.maxUsagePerUser && c.userUsageCount >= c.maxUsagePerUser) {
      return false;
    }
    if (c.maxUsageTotal && (c.currentUsageTotal || 0) >= c.maxUsageTotal) {
      return false;
    }
    return true;
  });

  return {
    coupons: eligibleCoupons.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      description: c.description,
      discountType: c.discountType,
      discountValue: c.discountValue,
      maxDiscount: c.maxDiscount,
      minCartValue: c.minCartValue,
      validTill: c.validTill,
      isFirstTimeOnly: c.isFirstTimeOnly,
    })),
    meta: {
      page: query.page,
      limit: query.limit,
      hasMore: eligibleCoupons.length === query.limit,
    },
  };
}

export async function getBestCoupon(
  userId: string,
  query: { lat: number; long: number }
) {
  const cart = await db.query.carts.findFirst({
    where: and(eq(carts.userId, userId), eq(carts.isActive, true)),
  });

  if (!cart) {
    return { coupon: null };
  }

  const cartTotal = parseFloat(cart.totalPrice);
  const now = new Date();

  const availableCoupons = await db.query.coupons.findMany({
    where: and(
      eq(coupons.isActive, true),
      lte(coupons.validFrom, now),
      gte(coupons.validTill, now)
    ),
  });

  let bestCoupon = null;
  let bestDiscount = 0;

  for (const coupon of availableCoupons) {
    if (coupon.minCartValue && cartTotal < parseFloat(coupon.minCartValue)) {
      continue;
    }

    const usageCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(couponUsage)
      .where(
        and(eq(couponUsage.couponId, coupon.id), eq(couponUsage.userId, userId))
      );

    if (coupon.maxUsagePerUser && Number(usageCount[0]?.count || 0) >= coupon.maxUsagePerUser) {
      continue;
    }

    let discount = 0;
    if (coupon.discountType === "PERCENTAGE") {
      discount = cartTotal * (parseFloat(coupon.discountValue) / 100);
      if (coupon.maxDiscount) {
        discount = Math.min(discount, parseFloat(coupon.maxDiscount));
      }
    } else {
      discount = parseFloat(coupon.discountValue);
    }

    if (discount > bestDiscount) {
      bestDiscount = discount;
      bestCoupon = coupon;
    }
  }

  return {
    coupon: bestCoupon
      ? {
          id: bestCoupon.id,
          code: bestCoupon.code,
          name: bestCoupon.name,
          description: bestCoupon.description,
          discountType: bestCoupon.discountType,
          discountValue: bestCoupon.discountValue,
          maxDiscount: bestCoupon.maxDiscount,
          estimatedDiscount: bestDiscount,
        }
      : null,
  };
}

export async function applyCoupon(userId: string, code: string | null) {
  const cart = await db.query.carts.findFirst({
    where: and(eq(carts.userId, userId), eq(carts.isActive, true)),
  });

  if (!cart) {
    throw new NotFoundError("Cart");
  }

  if (code === null) {
    await db
      .update(carts)
      .set({ couponId: null, updatedAt: new Date() })
      .where(eq(carts.id, cart.id));

    return { removed: true };
  }

  const coupon = await db.query.coupons.findFirst({
    where: and(eq(coupons.code, code), eq(coupons.isActive, true)),
  });

  if (!coupon) {
    throw new BadRequestError("Invalid coupon code");
  }

  const now = new Date();
  if (coupon.validFrom > now || coupon.validTill < now) {
    throw new BadRequestError("Coupon has expired or is not yet valid");
  }

  const cartTotal = parseFloat(cart.totalPrice);
  if (coupon.minCartValue && cartTotal < parseFloat(coupon.minCartValue)) {
    throw new BadRequestError(
      `Minimum cart value of ₹${coupon.minCartValue} required`
    );
  }

  const usageCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(couponUsage)
    .where(
      and(eq(couponUsage.couponId, coupon.id), eq(couponUsage.userId, userId))
    );

  if (coupon.maxUsagePerUser && Number(usageCount[0]?.count || 0) >= coupon.maxUsagePerUser) {
    throw new BadRequestError("You have already used this coupon");
  }

  if (coupon.maxUsageTotal && (coupon.currentUsageTotal || 0) >= coupon.maxUsageTotal) {
    throw new BadRequestError("Coupon usage limit reached");
  }

  await db
    .update(carts)
    .set({ couponId: coupon.id, updatedAt: new Date() })
    .where(eq(carts.id, cart.id));

  let discount = 0;
  if (coupon.discountType === "PERCENTAGE") {
    discount = cartTotal * (parseFloat(coupon.discountValue) / 100);
    if (coupon.maxDiscount) {
      discount = Math.min(discount, parseFloat(coupon.maxDiscount));
    }
  } else {
    discount = parseFloat(coupon.discountValue);
  }

  return {
    applied: true,
    coupon: {
      id: coupon.id,
      code: coupon.code,
      name: coupon.name,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      appliedDiscount: discount,
    },
  };
}
