import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { AppEnv } from "../../lib/types";
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

authRouter.post("/login", zValidator("json", loginSchema), async (c) => {
  const { mobileNumber } = c.req.valid("json");
  const result = await authService.login(mobileNumber);

  return c.json({
    success: true,
    data: result,
  });
});

authRouter.post("/verify", zValidator("json", verifySchema), async (c) => {
  const body = c.req.valid("json");
  const result = await authService.verify(body);

  return c.json({
    success: true,
    data: result,
  });
});
