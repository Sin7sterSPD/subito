import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { AppEnv } from "../../lib/types";
import { authRateLimit } from "../../middleware/rate-limit";
import * as authService from "./auth.service";

export const authRouter = new Hono<AppEnv>();

const loginSchema = z.object({
  mobileNumber: z.string().min(10).max(15),
});

const verifySchema = z.object({
  token: z.string(),
  idtoken: z.string(),
  mobileNumber: z.string().min(10).max(15),
  referralCode: z.string().optional(),
});

const refreshSchema = z.object({
  refreshToken: z.string(),
});

authRouter.post(
  "/login",
  authRateLimit,
  zValidator("json", loginSchema),
  async (c) => {
    const { mobileNumber } = c.req.valid("json");
    const result = await authService.login(mobileNumber);

    return c.json({
      success: true,
      data: result,
    });
  }
);

authRouter.post(
  "/verify",
  authRateLimit,
  zValidator("json", verifySchema),
  async (c) => {
    const body = c.req.valid("json");
    const result = await authService.verify(body);

    return c.json({
      success: true,
      data: result,
    });
  }
);

authRouter.post(
  "/refresh",
  authRateLimit,
  zValidator("json", refreshSchema),
  async (c) => {
    const { refreshToken } = c.req.valid("json");
    const result = await authService.refreshAccessToken(refreshToken);

    return c.json({
      success: true,
      data: result,
    });
  }
);

authRouter.post("/logout", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    await authService.logout(token);
  }

  return c.json({
    success: true,
    data: { loggedOut: true },
  });
});
