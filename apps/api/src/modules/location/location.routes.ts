import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { AppEnv } from "../../lib/types";
import { optionalAuth } from "../../middleware/auth";
import * as locationService from "./location.service";

export const locationRouter = new Hono<AppEnv>();

const availabilitySchema = z.object({
  lat: z.string().transform(Number),
  long: z.string().transform(Number),
});

const reverseGeocodeSchema = z.object({
  lat: z.string().transform(Number),
  lng: z.string().transform(Number),
});

const placesSchema = z.object({
  placeId: z.string(),
});

const autocompleteSchema = z.object({
  input: z.string().min(1),
});

locationRouter.get(
  "/availability",
  optionalAuth,
  zValidator("query", availabilitySchema),
  async (c) => {
    const { lat, long } = c.req.valid("query");
    const result = await locationService.checkAvailability(lat, long);

    return c.json({
      success: true,
      data: result,
    });
  }
);

locationRouter.get(
  "/places",
  optionalAuth,
  zValidator("query", placesSchema),
  async (c) => {
    const { placeId } = c.req.valid("query");
    const result = await locationService.getPlaceDetails(placeId);

    return c.json({
      success: true,
      data: result,
    });
  }
);

locationRouter.get(
  "/v2/reverse-geocode",
  optionalAuth,
  zValidator("query", reverseGeocodeSchema),
  async (c) => {
    const { lat, lng } = c.req.valid("query");
    const result = await locationService.reverseGeocode(lat, lng);

    return c.json({
      success: true,
      data: result,
    });
  }
);

locationRouter.get(
  "/auto-complete",
  optionalAuth,
  zValidator("query", autocompleteSchema),
  async (c) => {
    const { input } = c.req.valid("query");
    const result = await locationService.autocomplete(input);

    return c.json({
      success: true,
      data: result,
    });
  }
);
