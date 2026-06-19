import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import type { AppEnv } from "@/lib/types"
import { optionalAuth } from "@/middleware/auth"
import * as locationService from "./location.service"

export const locationRouter = new Hono<AppEnv>()

const availabilitySchema = z.object({
  lat: z.string().pipe(z.coerce.number().min(-90).max(90)),
  lng: z.string().pipe(z.coerce.number().min(-180).max(180)),
})

const reverseGeocodeSchema = z.object({
  lat: z.string().pipe(z.coerce.number().min(-90).max(90)),
  lng: z.string().pipe(z.coerce.number().min(-180).max(180)),
})

const autocompleteSchema = z.object({
  input: z.string().min(1),
})

locationRouter.get(
  "/availability",
  optionalAuth,
  zValidator("query", availabilitySchema),
  async (c) => {
    const { lat, lng } = c.req.valid("query")
    const result = await locationService.checkAvailability(lat, lng)

    return c.json({
      success: true,
      data: result,
    })
  }
)

locationRouter.get(
  "/v2/reverse-geocode",
  optionalAuth,
  zValidator("query", reverseGeocodeSchema),
  async (c) => {
    const { lat, lng } = c.req.valid("query")
    const result = await locationService.reverseGeocode(lat, lng)

    if ("error" in result) {
      return c.json(
        {
          success: false,
          error: result.error,
        },
        400
      )
    }

    return c.json({
      success: true,
      data: result,
    })
  }
)

locationRouter.get(
  "/auto-complete",
  optionalAuth,
  zValidator("query", autocompleteSchema),
  async (c) => {
    const { input } = c.req.valid("query")
    const result = await locationService.autocomplete(input)

    return c.json({
      success: true,
      data: result,
    })
  }
)
