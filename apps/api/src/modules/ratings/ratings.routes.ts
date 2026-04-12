import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { AppEnv } from "../../lib/types";
import { requireAuth } from "../../middleware/auth";
import * as ratingsService from "./ratings.service";

export const ratingsRouter = new Hono<AppEnv>();

const getRatingSchema = z.object({
  bookingId: z.string().uuid(),
});

const submitRatingSchema = z.object({
  bookingId: z.string().uuid(),
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
  partnerId: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
  serviceQuality: z.number().min(1).max(5).optional(),
  punctuality: z.number().min(1).max(5).optional(),
  professionalism: z.number().min(1).max(5).optional(),
  cleanliness: z.number().min(1).max(5).optional(),
  isAnonymous: z.boolean().default(false),
});

ratingsRouter.get(
  "/",
  requireAuth,
  zValidator("query", getRatingSchema),
  async (c) => {
    const userId = c.get("userId")!;
    const { bookingId } = c.req.valid("query");
    const rating = await ratingsService.getRating(userId, bookingId);

    return c.json({
      success: true,
      data: rating,
    });
  }
);

ratingsRouter.post(
  "/",
  requireAuth,
  zValidator("json", submitRatingSchema),
  async (c) => {
    const userId = c.get("userId")!;
    const data = c.req.valid("json");
    const result = await ratingsService.submitRating(userId, data);

    return c.json({
      success: true,
      data: result,
    });
  }
);

ratingsRouter.put("/:id/discard", requireAuth, async (c) => {
  const userId = c.get("userId")!;
  const ratingId = c.req.param("id");
  const result = await ratingsService.discardRating(userId, ratingId);

  return c.json({
    success: true,
    data: result,
  });
});
