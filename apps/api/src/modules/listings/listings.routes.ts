import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { AppEnv } from "../../lib/types";
import { requireAuth, optionalAuth } from "../../middleware/auth";
import * as listingsService from "./listings.service";

export const listingsRouter = new Hono<AppEnv>();

const listingsQuerySchema = z.object({
  lat: z.string().transform(Number).optional(),
  lng: z.string().transform(Number).optional(),
  categoryId: z.string().uuid().optional(),
});

const extensionsQuerySchema = z.object({
  bookingId: z.string().uuid(),
});

listingsRouter.get(
  "/",
  requireAuth,
  zValidator("query", listingsQuerySchema),
  async (c) => {
    const query = c.req.valid("query");
    const listings = await listingsService.getListings(query);

    return c.json({
      success: true,
      data: listings,
    });
  }
);

listingsRouter.get(
  "/public",
  optionalAuth,
  zValidator("query", listingsQuerySchema),
  async (c) => {
    const query = c.req.valid("query");
    const listings = await listingsService.getListings(query);

    return c.json({
      success: true,
      data: listings,
    });
  }
);

listingsRouter.get(
  "/extensions",
  requireAuth,
  zValidator("query", extensionsQuerySchema),
  async (c) => {
    const { bookingId } = c.req.valid("query");
    const extensions = await listingsService.getExtensions(bookingId);

    return c.json({
      success: true,
      data: extensions,
    });
  }
);

listingsRouter.get("/:id", optionalAuth, async (c) => {
  const id = c.req.param("id");
  const listing = await listingsService.getListingById(id);

  return c.json({
    success: true,
    data: listing,
  });
});

listingsRouter.get("/categories", optionalAuth, async (c) => {
  const categories = await listingsService.getCategories();

  return c.json({
    success: true,
    data: categories,
  });
});

listingsRouter.get("/categories/:id", optionalAuth, async (c) => {
  const id = c.req.param("id");
  const category = await listingsService.getCategoryById(id);

  return c.json({
    success: true,
    data: category,
  });
});

listingsRouter.get("/services/:id", optionalAuth, async (c) => {
  const id = c.req.param("id");
  const service = await listingsService.getServiceById(id);

  return c.json({
    success: true,
    data: service,
  });
});
