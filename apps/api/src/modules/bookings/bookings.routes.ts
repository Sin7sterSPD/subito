import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { AppEnv } from "../../lib/types";
import { requireAuth } from "../../middleware/auth";
import { bookingIdempotency, paymentIdempotency } from "../../middleware/idempotency";
import * as bookingsService from "./bookings.service";

export const bookingsRouter = new Hono<AppEnv>();

const bookingsQuerySchema = z.object({
  page: z.string().transform(Number).default("1"),
  limit: z.string().transform(Number).default("10"),
  "status[]": z.array(z.string()).optional(),
  "bookingType[]": z.array(z.string()).optional(),
});

const slotsQuerySchema = z.object({
  lat: z.string().transform(Number),
  lng: z.string().transform(Number),
  bookingType: z.enum(["INSTANT", "SCHEDULED", "RECURRING"]).optional(),
  time: z.string().optional(),
  days: z.string().transform(Number).default("7"),
});

const createBookingSchema = z.object({
  addressId: z.string().uuid(),
  items: z.array(
    z.object({
      catalogId: z.string().uuid(),
      quantity: z.number().min(1),
      propertyConfig: z.record(z.any()).optional(),
    })
  ),
  bookingType: z.enum(["INSTANT", "SCHEDULED", "RECURRING"]),
  scheduledDate: z.string().optional(),
  scheduledTime: z.string().optional(),
  recurringType: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY"]).optional(),
  couponCode: z.string().optional(),
  customerNotes: z.string().optional(),
});

const cancelSchema = z.object({
  bookingId: z.string().uuid(),
  reason: z.string(),
});

const extendBookingSchema = z.object({
  bookingId: z.string().uuid(),
  additionalItems: z.array(
    z.object({
      catalogId: z.string().uuid(),
      quantity: z.number().min(1),
    })
  ),
  paymentMethodId: z.string().optional(),
});

const rescheduleSchema = z.object({
  rescheduleTo: z.string(),
});

const cancelInstanceSchema = z.object({
  reason: z.string(),
});

bookingsRouter.get(
  "/",
  requireAuth,
  zValidator("query", bookingsQuerySchema),
  async (c) => {
    const userId = c.get("userId")!;
    const query = c.req.valid("query");
    const statusArray = c.req.queries("status[]");
    const result = await bookingsService.getBookings(userId, {
      ...query,
      status: statusArray,
    });

    return c.json({
      success: true,
      data: result.bookings,
      meta: result.meta,
    });
  }
);

bookingsRouter.get(
  "/v2",
  requireAuth,
  zValidator("query", bookingsQuerySchema),
  async (c) => {
    const userId = c.get("userId")!;
    const query = c.req.valid("query");
    const statusArray = c.req.queries("status[]");
    const bookingTypeArray = c.req.queries("bookingType[]");
    const result = await bookingsService.getBookingsV2(userId, {
      ...query,
      status: statusArray,
      bookingType: bookingTypeArray,
    });

    return c.json({
      success: true,
      data: result.bookings,
      meta: result.meta,
    });
  }
);

bookingsRouter.get(
  "/slots",
  requireAuth,
  zValidator("query", slotsQuerySchema),
  async (c) => {
    const query = c.req.valid("query");
    const slots = await bookingsService.getAvailableSlots(query);

    return c.json({
      success: true,
      data: slots,
    });
  }
);

bookingsRouter.get("/get-user-latest-booking/:userId", requireAuth, async (c) => {
  const targetUserId = c.req.param("userId");
  const userId = c.get("userId")!;

  if (targetUserId !== userId) {
    return c.json(
      { success: false, error: { code: "FORBIDDEN", message: "Access denied" } },
      403
    );
  }

  const booking = await bookingsService.getLatestBooking(userId);

  return c.json({
    success: true,
    data: booking,
  });
});

bookingsRouter.get("/:id/partner-location", requireAuth, async (c) => {
  const userId = c.get("userId")!;
  const bookingId = c.req.param("id");
  const location = await bookingsService.getPartnerLocation(userId, bookingId);

  return c.json({
    success: true,
    data: location,
  });
});

bookingsRouter.get("/child-bookings/:id", requireAuth, async (c) => {
  const userId = c.get("userId")!;
  const parentId = c.req.param("id");
  const children = await bookingsService.getChildBookings(userId, parentId);

  return c.json({
    success: true,
    data: children,
  });
});

bookingsRouter.get("/refund/:id", requireAuth, async (c) => {
  const userId = c.get("userId")!;
  const bookingId = c.req.param("id");
  const refund = await bookingsService.getRefundDetails(userId, bookingId);

  return c.json({
    success: true,
    data: refund,
  });
});

bookingsRouter.get("/bridging/context/instance/:id", requireAuth, async (c) => {
  const bookingId = c.req.param("id");
  const context = await bookingsService.getBridgingContext(bookingId);

  return c.json({
    success: true,
    data: context,
  });
});

bookingsRouter.get("/:id", requireAuth, async (c) => {
  const userId = c.get("userId")!;
  const role = c.get("user")!.role;
  const bookingId = c.req.param("id");
  const booking = await bookingsService.getBookingByIdForPartnerUser(
    userId,
    bookingId,
    role
  );

  return c.json({
    success: true,
    data: booking,
  });
});

bookingsRouter.post(
  "/",
  requireAuth,
  bookingIdempotency,
  zValidator("json", createBookingSchema),
  async (c) => {
    const userId = c.get("userId")!;
    const idempotencyKey = c.req.header("Idempotency-Key");
    const data = c.req.valid("json");
    const result = await bookingsService.createBooking(userId, data, idempotencyKey);

    return c.json({
      success: true,
      data: result,
    });
  }
);

bookingsRouter.post(
  "/cancel",
  requireAuth,
  zValidator("json", cancelSchema),
  async (c) => {
    const userId = c.get("userId")!;
    const data = c.req.valid("json");
    const result = await bookingsService.cancelBooking(userId, data);

    return c.json({
      success: true,
      data: result,
    });
  }
);

bookingsRouter.post(
  "/extend",
  requireAuth,
  paymentIdempotency,
  zValidator("json", extendBookingSchema),
  async (c) => {
    const userId = c.get("userId")!;
    const idempotencyKey = c.req.header("Idempotency-Key");
    const data = c.req.valid("json");
    const result = await bookingsService.extendBooking(userId, data, idempotencyKey);

    return c.json({
      success: true,
      data: result,
    });
  }
);

bookingsRouter.post(
  "/instance/:id/reschedule",
  requireAuth,
  zValidator("json", rescheduleSchema),
  async (c) => {
    const userId = c.get("userId")!;
    const instanceId = c.req.param("id");
    const data = c.req.valid("json");
    const result = await bookingsService.rescheduleInstance(
      userId,
      instanceId,
      data
    );

    return c.json({
      success: true,
      data: result,
    });
  }
);

bookingsRouter.put(
  "/cancelInstance/:id",
  requireAuth,
  zValidator("json", cancelInstanceSchema),
  async (c) => {
    const userId = c.get("userId")!;
    const instanceId = c.req.param("id");
    const data = c.req.valid("json");
    const result = await bookingsService.cancelInstance(userId, instanceId, data);

    return c.json({
      success: true,
      data: result,
    });
  }
);
