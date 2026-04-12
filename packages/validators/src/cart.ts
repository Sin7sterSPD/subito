import { z } from "zod";
import { bookingTypeSchema, recurringTypeSchema } from "./bookings";

export const addCartItemSchema = z.object({
  catalogInfo: z.object({
    catalogId: z.string().uuid(),
    quantity: z.number().min(1).default(1),
    propertyConfig: z.record(z.any()).optional(),
  }),
  isQuickAdd: z.boolean().default(false),
  forceAdd: z.boolean().optional(),
  bundleId: z.string().uuid().optional(),
  bundleInfo: z
    .object({
      bundleId: z.string().uuid(),
    })
    .optional(),
});

export const updateCartSchema = z.object({
  deliveryAddressId: z.string().uuid().optional(),
  bookingType: bookingTypeSchema.optional(),
  timeSlot: z
    .object({
      time: z.array(
        z.object({
          start: z.string(),
        })
      ),
    })
    .optional(),
  recurringType: recurringTypeSchema.optional(),
});

export const updateCartItemSchema = z.object({
  catalogItemId: z.string().uuid(),
  changeType: z.enum(["INCREMENT", "DECREMENT"]),
  isQuickAdd: z.boolean().default(false),
  quantity: z.number().optional(),
  listingItemId: z.string().optional(),
});

export const checkoutSchema = z.object({
  paymentMethodId: z.string().optional(),
  amount: z.number().optional(),
  meta: z
    .object({
      orderSource: z.string().default("APP"),
    })
    .optional(),
  cartVersion: z.number(),
});

export type AddCartItemInput = z.infer<typeof addCartItemSchema>;
export type UpdateCartInput = z.infer<typeof updateCartSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
