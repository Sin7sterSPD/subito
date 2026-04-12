import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { AppEnv } from "../../lib/types";
import { requireAuth, requirePartner, requireAdmin } from "../../middleware/auth";
import * as partnersService from "./partners.service";

export const partnersRouter = new Hono<AppEnv>();

const availablePartnersSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  serviceId: z.string().uuid().optional(),
  bookingId: z.string().uuid().optional(),
});

const assignPartnerSchema = z.object({
  bookingId: z.string().uuid(),
  partnerId: z.string().uuid(),
});

const updateStatusSchema = z.object({
  status: z.enum(["EN_ROUTE", "ARRIVED", "WORKING", "COMPLETED"]),
  bookingId: z.string().uuid(),
});

const updateLocationSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  accuracy: z.number().optional(),
  heading: z.number().optional(),
  speed: z.number().optional(),
});

partnersRouter.post(
  "/available",
  requireAuth,
  zValidator("json", availablePartnersSchema),
  async (c) => {
    const data = c.req.valid("json");
    const partners = await partnersService.findAvailablePartners(data);

    return c.json({
      success: true,
      data: partners,
    });
  }
);

partnersRouter.post(
  "/assign",
  requireAdmin,
  zValidator("json", assignPartnerSchema),
  async (c) => {
    const data = c.req.valid("json");
    const result = await partnersService.assignPartner(data);

    return c.json({
      success: true,
      data: result,
    });
  }
);

partnersRouter.get("/me/bookings", requirePartner, async (c) => {
  const userId = c.get("userId")!;
  const rows = await partnersService.listBookingsForPartnerUser(userId);

  return c.json({
    success: true,
    data: rows,
  });
});

partnersRouter.get("/me", requirePartner, async (c) => {
  const userId = c.get("userId")!;
  const partner = await partnersService.getPartnerByUserId(userId);

  return c.json({
    success: true,
    data: partner,
  });
});

const acknowledgeReleaseSchema = z.object({
  bookingId: z.string().uuid(),
});

partnersRouter.post(
  "/:id/acknowledge-release",
  requirePartner,
  zValidator("json", acknowledgeReleaseSchema),
  async (c) => {
    const partnerId = c.req.param("id");
    const user = c.get("user")!;
    const { bookingId } = c.req.valid("json");
    const result = await partnersService.acknowledgePartnerRelease(
      partnerId,
      bookingId,
      user.userId,
      user.role
    );

    return c.json({
      success: true,
      data: result,
    });
  }
);

partnersRouter.get("/:id", requireAuth, async (c) => {
  const partnerId = c.req.param("id");
  const partner = await partnersService.getPartnerById(partnerId);

  return c.json({
    success: true,
    data: partner,
  });
});

partnersRouter.put(
  "/:id/status",
  requirePartner,
  zValidator("json", updateStatusSchema),
  async (c) => {
    const partnerId = c.req.param("id");
    const data = c.req.valid("json");
    const result = await partnersService.updatePartnerStatus(partnerId, data);

    return c.json({
      success: true,
      data: result,
    });
  }
);

partnersRouter.put(
  "/:id/location",
  requirePartner,
  zValidator("json", updateLocationSchema),
  async (c) => {
    const partnerId = c.req.param("id");
    const data = c.req.valid("json");
    const result = await partnersService.updatePartnerLocation(partnerId, data);

    return c.json({
      success: true,
      data: result,
    });
  }
);

partnersRouter.get("/:id/ratings", requireAuth, async (c) => {
  const partnerId = c.req.param("id");
  const ratingsData = await partnersService.getPartnerRatings(partnerId);

  return c.json({
    success: true,
    data: ratingsData,
  });
});
