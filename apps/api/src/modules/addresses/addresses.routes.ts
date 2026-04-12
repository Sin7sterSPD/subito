import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { AppEnv } from "../../lib/types";
import { requireAuth } from "../../middleware/auth";
import * as addressesService from "./addresses.service";

export const addressesRouter = new Hono<AppEnv>();

const createAddressSchema = z.object({
  name: z.string().max(100).optional(),
  addressLine1: z.string().min(1),
  addressLine2: z.string().optional(),
  landmark: z.string().optional(),
  area: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  pincode: z.string().min(1),
  latitude: z.number(),
  longitude: z.number(),
  type: z.enum(["HOME", "OFFICE", "OTHER"]).default("HOME"),
  bhk: z.number().optional(),
  bathroom: z.number().optional(),
  balcony: z.number().optional(),
  floor: z.number().optional(),
  buildingName: z.string().optional(),
  houseNo: z.string().optional(),
  otherName: z.string().optional(),
  otherPhone: z.string().optional(),
});

const updateAddressSchema = createAddressSchema.partial().extend({
  id: z.string().uuid(),
});

const deleteAddressSchema = z.object({
  id: z.string().uuid(),
});

addressesRouter.get("/", requireAuth, async (c) => {
  const userId = c.get("userId")!;
  const lat = c.req.query("lat");
  const lng = c.req.query("lng");
  const nearestRequired = c.req.query("nearestAddressRequired") === "true";

  const addresses = await addressesService.getUserAddresses(userId, {
    lat: lat ? parseFloat(lat) : undefined,
    lng: lng ? parseFloat(lng) : undefined,
    nearestRequired,
  });

  return c.json({
    success: true,
    data: addresses,
  });
});

addressesRouter.post(
  "/",
  requireAuth,
  zValidator("json", createAddressSchema),
  async (c) => {
    const userId = c.get("userId")!;
    const data = c.req.valid("json");
    const address = await addressesService.createAddress(userId, data);

    return c.json({
      success: true,
      data: address,
    });
  }
);

addressesRouter.patch(
  "/",
  requireAuth,
  zValidator("json", updateAddressSchema),
  async (c) => {
    const userId = c.get("userId")!;
    const data = c.req.valid("json");
    const address = await addressesService.updateAddress(userId, data);

    return c.json({
      success: true,
      data: address,
    });
  }
);

addressesRouter.delete(
  "/",
  requireAuth,
  zValidator("json", deleteAddressSchema),
  async (c) => {
    const userId = c.get("userId")!;
    const { id } = c.req.valid("json");
    await addressesService.deleteAddress(userId, id);

    return c.json({
      success: true,
      data: { deleted: true },
    });
  }
);
