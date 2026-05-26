import { Hono } from "hono";
import type { AppEnv } from "@/lib/types";

import * as authService from "./auth.service"
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

import { authRateLimit } from "@/middleware/rate-limit";
import { requireAuth } from "@/middleware/auth";


export const authRouter = new Hono<AppEnv>()

const loginSchema = z.object({
  mobileNumber: z.string().min(10).max(15),
})

const verifySchema = z.object({
  challengeId: z.string().uuid(),
  firebaseIdToken: z.string(),
  mobileNumber: z.string().min(10).max(15),
  referralCode: z.string().optional(),
  appType: z.enum(["customer", "partner"]).optional(),
})

const refreshSchema = z.object({
  refreshToken: z.string(),
})


const changePhoneRequestSchema = z.object({
  newPhone: z.string().min(10).max(15),
})

const changePhoneVerifySchema = z.object({
  changeToken: z.string(),
  idtoken: z.string(),
  newPhone: z.string().min(10).max(15),
})

function getAuthDeviceContext(c: {
  req: {
    header: (name: string) => string | undefined
  }
}): authService.AuthDeviceContext {
  const forwarded = c.req.header("x-forwarded-for")
  const ip =
    forwarded?.split(",")[0]?.trim() || c.req.header("x-real-ip") || null
  return {
    deviceId:
      c.req.header("X-Device-ID") || c.req.header("x-device-id") || null,
    deviceType:
      c.req.header("X-Platform") || c.req.header("x-platform") || null,
    appVersion:
      c.req.header("X-App-Version") || c.req.header("x-app-version") || null,
    ip,
  }
}

authRouter.post(
  "/login",
  authRateLimit,
  zValidator("json", loginSchema),
  async (c) => {
    const { mobileNumber } = c.req.valid("json")
    const result = await authService.login(
      mobileNumber,
      getAuthDeviceContext(c)
    )

    return c.json({
      success: true,
      data: result,
    })
  }
)

authRouter.post(
  "/verify",
  authRateLimit,
  zValidator("json", verifySchema),
  async (c) => {
    const body = c.req.valid("json")
    const result = await authService.verify(body, getAuthDeviceContext(c))

    return c.json({
      success: true,
      data: result,
    })
  }
)

authRouter.post(
  "/refresh",
  authRateLimit,
  zValidator("json", refreshSchema),
  async (c) => {
    const { refreshToken } = c.req.valid("json")
    const result = await authService.refreshAccessToken(
      refreshToken,
      getAuthDeviceContext(c)
    )

    return c.json({
      success: true,
      data: result,
    })
  }
)

authRouter.post("/logout", requireAuth, async (c) => {
  const userId = c.get("userId")!
  const authHeader = c.req.header("Authorization")!
  const token = authHeader.substring(7)
  await authService.logout(token, userId)

  return c.json({
    success: true,
    data: { loggedOut: true },
  })
})

authRouter.get("/sessions", authRateLimit, requireAuth, async (c) => {
  const userId = c.get("userId")!
  const user = c.get("user")
  const sessions = await authService.getSessionsForUser(userId, user?.sessionId)
  return c.json({ success: true, data: { sessions } })
})

authRouter.delete(
  "/sessions/:sessionId",
  authRateLimit,
  requireAuth,
  async (c) => {
    const userId = c.get("userId")!
    const user = c.get("user")
    const sessionId = c.req.param("sessionId")
    await authService.logoutOtherSession(userId, sessionId, user?.sessionId)
    return c.json({ success: true, data: { revoked: true, sessionId } })
  }
)

authRouter.delete("/sessions", authRateLimit, requireAuth, async (c) => {
  const userId = c.get("userId")!
  const authHeader = c.req.header("Authorization")!
  const token = authHeader.substring(7)
  await authService.logoutAllDevices(token, userId)
  return c.json({ success: true, data: { loggedOutAll: true } })
})

authRouter.post(
  "/change-phone/request",
  authRateLimit,
  requireAuth,
  zValidator("json", changePhoneRequestSchema),
  async (c) => {
    const userId = c.get("userId")!
    const user = c.get("user")!
    const { newPhone } = c.req.valid("json")
    const result = await authService.requestPhoneChange(
      userId,
      newPhone,
      user.phone
    )
    return c.json({ success: true, data: result })
  }
)

authRouter.post(
  "/change-phone/verify",
  authRateLimit,
  requireAuth,
  zValidator("json", changePhoneVerifySchema),
  async (c) => {
    const userId = c.get("userId")!
    const body = c.req.valid("json")
    const result = await authService.verifyPhoneChange({
      ...body,
      userId,
      ctx: getAuthDeviceContext(c),
    })
    return c.json({ success: true, data: result })
  }
)
