import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { AppEnv } from "../../lib/types";
import { requireAuth } from "../../middleware/auth";
import * as couponsService from "./coupons.service";

export const couponsRouter = new Hono<AppEnv>();

const listCouponsSchema = z.object({
  page: z.string().transform(Number).default("1"),
  limit: z.string().transform(Number).default("20"),
});

const bestCouponSchema = z.object({
  lat: z.string().transform(Number),
  long: z.string().transform(Number),
});

const applyCouponSchema = z.object({
  code: z.string().nullable(),
});

couponsRouter.get(
  "/",
  requireAuth,
  zValidator("query", listCouponsSchema),
  async (c) => {
    const userId = c.get("userId")!;
    const query = c.req.valid("query");
    const result = await couponsService.listCoupons(userId, query);

    return c.json({
      success: true,
      data: result.coupons,
      meta: result.meta,
    });
  }
);

couponsRouter.get(
  "/best",
  requireAuth,
  zValidator("query", bestCouponSchema),
  async (c) => {
    const userId = c.get("userId")!;
    const query = c.req.valid("query");
    const coupon = await couponsService.getBestCoupon(userId, query);

    return c.json({
      success: true,
      data: coupon,
    });
  }
);

couponsRouter.post(
  "/apply",
  requireAuth,
  zValidator("json", applyCouponSchema),
  async (c) => {
    const userId = c.get("userId")!;
    const { code } = c.req.valid("json");
    const result = await couponsService.applyCoupon(userId, code);

    return c.json({
      success: true,
      data: result,
    });
  }
);
