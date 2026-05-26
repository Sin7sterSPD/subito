import { createMiddleware } from "hono/factory"
import { verifyToken } from "@/lib/jwt"
import { log } from "@/lib/logger"
import type { AppEnv } from "@/lib/types"

import {
  isTokenBlacklisted,
  touchSessionFromPayload,
} from "@/modules/auth/auth.service"

import { UnauthorizedError } from "@/lib/errors"

export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const authHeader = c.req.header("Authorization")

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new UnauthorizedError("Missing or invalid authorization header")
  }

  const token = authHeader.substring(7)

  const isBlacklisted = await isTokenBlacklisted(token)
  if (isBlacklisted) {
    throw new UnauthorizedError("Token has been revoked")
  }

  const payload = await verifyToken(token)

  if (!payload) {
    throw new UnauthorizedError("Invalid or expired token")
  }

  if (payload.sessionId) {
    await touchSessionFromPayload(payload.sessionId, payload.userId)
  }

  const headerDevice =
    c.req.header("X-Device-ID") || c.req.header("x-device-id")
  if (payload.deviceId && payload.deviceId !== headerDevice) {
    log.warn(
      {
        userId: payload.userId,
        jwtDevice: payload.deviceId,
        headerDevice,
      },
      "Device ID header does not match JWT"
    )
    throw new UnauthorizedError("Device mismatch")
  }

  const user = {
    ...payload,
    permissions: payload.permissions ?? [],
  }
  c.set("user", user)
  c.set("userId", payload.userId)

  await next()
})

export const optionalAuth = createMiddleware<AppEnv>(async (c, next) => {
  const authHeader = c.req.header("Authorization")

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7)

    const isBlacklisted = await isTokenBlacklisted(token)
    if (!isBlacklisted) {
      const payload = await verifyToken(token)

      if (payload) {
        const headerDevice =
          c.req.header("X-Device-ID") || c.req.header("x-device-id")
        if (payload.deviceId && payload.deviceId !== headerDevice) {
          throw new UnauthorizedError("Device mismatch")
        }
        if (payload.sessionId) {
          await touchSessionFromPayload(payload.sessionId, payload.userId)
        }
        c.set("user", {
          ...payload,
          permissions: payload.permissions ?? [],
        })
        c.set("userId", payload.userId)
      }
    }
  }

  await next()
})

export const requireRole = (...roles: ("customer" | "partner" | "admin")[]) =>
  createMiddleware<AppEnv>(async (c, next) => {
    const user = c.get("user")

    if (!user) {
      throw new UnauthorizedError("Authentication required")
    }

    if (!roles.includes(user.role)) {
      throw new UnauthorizedError(
        `Access denied. Required role: ${roles.join(" or ")}`
      )
    }

    await next()
  })

export const requireAdmin = requireRole("admin")
export const requirePartner = requireRole("partner", "admin")
export const requireCustomer = requireRole("customer", "admin")
