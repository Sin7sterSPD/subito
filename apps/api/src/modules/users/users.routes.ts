import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { AppEnv } from "../../lib/types";
import { requireAuth } from "../../middleware/auth";
import * as usersService from "./users.service";
import { addressesRouter } from "../addresses/addresses.routes";

export const usersRouter = new Hono<AppEnv>();

const createUserSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  mobileNumber: z.string().min(10).max(15),
  type: z.enum(["USER", "PARTNER"]).default("USER"),
  email: z.string().email().optional(),
});

const updateUserSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  profileImage: z.string().optional(),
});

const referralDetailsSchema = z.object({
  referralCode: z.string().optional(),
});

usersRouter.get("/", requireAuth, async (c) => {
  const userId = c.get("userId")!;
  const user = await usersService.getCurrentUser(userId);

  return c.json({
    success: true,
    data: user,
  });
});

usersRouter.patch(
  "/",
  requireAuth,
  zValidator("json", updateUserSchema),
  async (c) => {
    const userId = c.get("userId")!;
    const data = c.req.valid("json");
    const user = await usersService.updateUser(userId, data);

    return c.json({
      success: true,
      data: user,
    });
  }
);

usersRouter.post(
  "/create_user",
  requireAuth,
  zValidator("json", createUserSchema),
  async (c) => {
    const userId = c.get("userId")!;
    const data = c.req.valid("json");
    const user = await usersService.completeOnboarding(userId, data);

    return c.json({
      success: true,
      data: user,
    });
  }
);

usersRouter.get("/mobile/:phone/exists", async (c) => {
  const phone = c.req.param("phone");
  const exists = await usersService.checkUserExists(phone);

  return c.json({
    success: true,
    data: { exists },
  });
});

usersRouter.get("/preferences", requireAuth, async (c) => {
  const userId = c.get("userId")!;
  const preferences = await usersService.getUserPreferences(userId);

  return c.json({
    success: true,
    data: preferences,
  });
});

usersRouter.post(
  "/referral-details",
  requireAuth,
  zValidator("json", referralDetailsSchema),
  async (c) => {
    const userId = c.get("userId")!;
    const { referralCode } = c.req.valid("json");
    const result = await usersService.processReferralCode(userId, referralCode);

    return c.json({
      success: true,
      data: result,
    });
  }
);

usersRouter.route("/addresses", addressesRouter);
