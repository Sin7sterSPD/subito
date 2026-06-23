import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import type { AppEnv } from "../../lib/types"
import { requireAuth } from "../../middleware/auth"
import {
  checkoutIdempotency,
  paymentIdempotency,
} from "@/middleware/idempotency"

import { checkoutRateLimit } from "../../middleware/rate-limit"
import * as cartService from "./cart.service"

export const cartRouter = new Hono<AppEnv>()

const addItemSchema = z.object({
  catalogInfo: z.object({
    catalogId: z.string(),
    quantity: z.number().min(1).default(1),
    propertyConfig: z.record(z.any()).optional(),
  }),

  isQuickAdd: z.boolean().default(false),
  forceAdd: z.boolean().optional(),
  bundleId: z.string().nullable().optional(),
  bundleInfo: z
    .object({
      bundleId: z.string(),
    })
    .nullable()
    .optional(),
})

const updateCartSchema = z.object({
  deliveryAddressId: z.string().uuid().optional(),
  bookingType: z.enum(["INSTANT", "SCHEDULED", "RECURRING"]).optional(),
  timeSlot: z
    .object({
      time: z.array(
        z.object({
          start: z.string(),
        })
      ),
    })
    .optional(),
  recurringType: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY"]).optional(),
})

const updateItemSchema = z.object({
  catalogItemId: z.string(),
  changeType: z.enum(["INCREMENT", "DECREMENT"]),
  isQuickAdd: z.boolean().default(false),
  quantity: z.number().int().min(1).optional(),
  listingItemId: z.string().optional(),
})

const removeItemSchema = z
  .object({
    itemId: z.string().uuid().optional(),
    bundleId: z.string().nullable().optional(),
  })
  .refine((v) => Boolean(v.itemId || v.bundleId), {
    message: "Either itemId or bundleId is required",
  })

const checkoutSchema = z.object({
  paymentMethodId: z.string().optional(),
  amount: z.number().optional(),
  meta: z
    .object({
      orderSource: z.string().default("APP"),
    })
    .optional(),
  cartVersion: z.number(),
})

const checkoutV2Schema = z.object({
  cartVersion: z.number().int().nonnegative(),
})

const extendedCheckoutSchema = z.object({
  bookingId: z.string().uuid(),
  additionalItems: z.array(
    z.object({
      catalogId: z.string().uuid(),
      quantity: z.number().min(1),
    })
  ),
  cartVersion: z.number(),
})

cartRouter.get("/v2", requireAuth, async (c) => {
  const userId = c.get("userId")!
  const cart = await cartService.getCart(userId)

  return c.json({
    success: true,
    data: cart,
  })
})

cartRouter.post(
  "/v2",
  requireAuth,
  zValidator("json", addItemSchema, (result, c) => {
    if (!result.success) {
      console.error("addItem validation failed details:", JSON.stringify(result.error.format(), null, 2))
      return c.json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          details: result.error.format()
        }
      }, 400)
    }
  }),
  async (c) => {
    const userId = c.get("userId")!
    const data = c.req.valid("json")
    const cart = await cartService.addItem(userId, data)

    return c.json({
      success: true,
      data: cart,
    })
  }
)

cartRouter.post("/", requireAuth, async (c) => {
  const userId = c.get("userId")!
  const cart = await cartService.createCart(userId)

  return c.json({
    success: true,
    data: cart,
  })
})

cartRouter.patch(
  "/",
  requireAuth,
  zValidator("json", updateCartSchema),
  async (c) => {
    const userId = c.get("userId")!
    const data = c.req.valid("json")
    const cart = await cartService.updateCart(userId, data)

    return c.json({
      success: true,
      data: cart,
    })
  }
)

cartRouter.patch(
  "/UpdateCartItem",
  requireAuth,
  zValidator("json", updateItemSchema),
  async (c) => {
    const userId = c.get("userId")!
    const data = c.req.valid("json")
    const cart = await cartService.updateCartItem(userId, data)

    return c.json({
      success: true,
      data: cart,
    })
  }
)

cartRouter.delete(
  "/item",
  requireAuth,
  zValidator("json", removeItemSchema),
  async (c) => {
    const userId = c.get("userId")!
    const data = c.req.valid("json")
    const cart = await cartService.removeItem(userId, data)

    return c.json({
      success: true,
      data: cart,
    })
  }
)

cartRouter.post("/remove-inactive", requireAuth, async (c) => {
  const userId = c.get("userId")!
  const cart = await cartService.removeInactiveItems(userId)

  return c.json({
    success: true,
    data: cart,
  })
})

cartRouter.post(
  "/checkout",
  requireAuth,
  checkoutRateLimit,
  checkoutIdempotency,
  zValidator("json", checkoutSchema),
  async (c) => {
    const userId = c.get("userId")!
    const idempotencyKey = c.req.header("Idempotency-Key")
    const data = c.req.valid("json")
    const result = await cartService.checkout(userId, data, idempotencyKey)

    return c.json({
      success: true,
      data: result,
    })
  }
)

cartRouter.post(
  "/checkout-v2",
  requireAuth,
  checkoutRateLimit,
  checkoutIdempotency,
  zValidator("json", checkoutV2Schema),
  async (c) => {
    const userId = c.get("userId")!
    const idempotencyKey = c.req.header("Idempotency-Key")
    const data = c.req.valid("json")
    const result = await cartService.checkoutV2(userId, data, idempotencyKey)

    return c.json({
      success: true,
      data: result,
    })
  }
)

cartRouter.post(
  "/checkout/extended",
  requireAuth,
  checkoutRateLimit,
  paymentIdempotency,
  zValidator("json", extendedCheckoutSchema),
  async (c) => {
    const userId = c.get("userId")!
    const idempotencyKey = c.req.header("Idempotency-Key")
    const data = c.req.valid("json")
    const result = await cartService.extendedCheckout(
      userId,
      data,
      idempotencyKey
    )

    return c.json({
      success: true,
      data: result,
    })
  }
)

