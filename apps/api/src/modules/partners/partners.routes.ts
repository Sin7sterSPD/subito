import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import type { AppEnv } from "../../lib/types"
import {
  requireAuth,
  requirePartner,
  requireAdmin,
} from "../../middleware/auth"
import * as partnersService from "./partners.service"

export const partnersRouter = new Hono<AppEnv>()

const availablePartnersSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  serviceId: z.string().uuid().optional(),
  bookingId: z.string().uuid().optional(),
})

const assignPartnerSchema = z.object({
  bookingId: z.string().uuid(),
  partnerId: z.string().uuid(),
})

const updateStatusSchema = z.object({
  status: z.enum(["EN_ROUTE", "ARRIVED", "WORKING", "COMPLETED"]),
  bookingId: z.string().uuid(),
})

const updateLocationSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  accuracy: z.number().optional(),
  heading: z.number().optional(),
  speed: z.number().optional(),
})

const updateKycSchema = z
  .object({
    aadharNumber: z.string().min(8).max(20).nullable().optional(),
    panNumber: z.string().length(10).nullable().optional(),
    bankAccountNumber: z.string().min(5).max(30).nullable().optional(),
  })
  .refine(
    (d) =>
      d.aadharNumber !== undefined ||
      d.panNumber !== undefined ||
      d.bankAccountNumber !== undefined,
    { message: "At least one KYC field is required" }
  )

partnersRouter.post(
  "/available",
  requireAuth,
  zValidator("json", availablePartnersSchema),
  async (c) => {
    const data = c.req.valid("json")
    const partners = await partnersService.findAvailablePartners(data)

    return c.json({
      success: true,
      data: partners,
    })
  }
)

partnersRouter.post(
  "/assign",
  requireAdmin,
  zValidator("json", assignPartnerSchema),
  async (c) => {
    const data = c.req.valid("json")
    const result = await partnersService.assignPartner(data)

    return c.json({
      success: true,
      data: result,
    })
  }
)

partnersRouter.get("/me/bookings", requirePartner, async (c) => {
  const userId = c.get("userId")!
  const page = Math.max(1, parseInt(c.req.query("page") || "1", 10) || 1)
  const limit = Math.min(
    100,
    Math.max(1, parseInt(c.req.query("limit") || "50", 10) || 50)
  )
  const result = await partnersService.listBookingsForPartnerUser(userId, {
    page,
    limit,
  })

  return c.json({
    success: true,
    data: result.bookings,
    meta: result.meta,
  })
})

partnersRouter.get("/me", requirePartner, async (c) => {
  const userId = c.get("userId")!
  const partner = await partnersService.getPartnerByUserId(userId)

  return c.json({
    success: true,
    data: partner,
  })
})

partnersRouter.patch(
  "/me/kyc",
  requirePartner,
  zValidator("json", updateKycSchema),
  async (c) => {
    const userId = c.get("userId")!
    const me = await partnersService.getPartnerByUserId(userId)
    const data = c.req.valid("json")
    const result = await partnersService.updatePartnerKyc(me.id, userId, data)

    return c.json({
      success: true,
      data: result,
    })
  }
)

const acknowledgeReleaseSchema = z.object({
  bookingId: z.string().uuid(),
})

partnersRouter.post(
  "/:id/acknowledge-release",
  requirePartner,
  zValidator("json", acknowledgeReleaseSchema),
  async (c) => {
    const partnerId = c.req.param("id")
    const user = c.get("user")!
    const { bookingId } = c.req.valid("json")
    const result = await partnersService.acknowledgePartnerRelease(
      partnerId,
      bookingId,
      user.userId,
      user.role
    )

    return c.json({
      success: true,
      data: result,
    })
  }
)

partnersRouter.get("/:id", requireAuth, async (c) => {
  const partnerId = c.req.param("id")
  const partner = await partnersService.getPartnerById(partnerId)

  return c.json({
    success: true,
    data: partner,
  })
})

partnersRouter.put(
  "/:id/status",
  requirePartner,
  zValidator("json", updateStatusSchema),
  async (c) => {
    const userId = c.get("userId")!
    const partnerId = c.req.param("id")
    const me = await partnersService.getPartnerByUserId(userId)
    if (me.id !== partnerId) {
      return c.json(
        {
          success: false,
          error: { code: "FORBIDDEN", message: "Not this partner" },
        },
        403
      )
    }
    const data = c.req.valid("json")
    const result = await partnersService.updatePartnerStatus(partnerId, data)

    return c.json({
      success: true,
      data: result,
    })
  }
)

partnersRouter.put(
  "/:id/location",
  requirePartner,
  zValidator("json", updateLocationSchema),
  async (c) => {
    const userId = c.get("userId")!
    const partnerId = c.req.param("id")
    const me = await partnersService.getPartnerByUserId(userId)
    if (me.id !== partnerId) {
      return c.json(
        {
          success: false,
          error: { code: "FORBIDDEN", message: "Not this partner" },
        },
        403
      )
    }
    const data = c.req.valid("json")
    const result = await partnersService.updatePartnerLocation(partnerId, data)

    return c.json({
      success: true,
      data: result,
    })
  }
)

partnersRouter.get("/:id/ratings", requireAuth, async (c) => {
  const partnerId = c.req.param("id")
  const ratingsData = await partnersService.getPartnerRatings(partnerId)

  return c.json({
    success: true,
    data: ratingsData,
  })
})
