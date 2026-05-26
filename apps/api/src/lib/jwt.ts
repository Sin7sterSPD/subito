import "../env"
import * as jose from "jose"

import type { JWTPayload } from "./types"

import { log } from "./logger"
import { parseDurationToSeconds } from "./duration"

const JWT_SECRET_RAW = process.env.JWT_SECRET
if (!JWT_SECRET_RAW || JWT_SECRET_RAW.length < 32) {
  throw new Error(
    "FATAL: JWT_SECRET must be set in the environment (minimum 32 characters)."
  )
}

const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_RAW)
const JWT_ISSUER = process.env.JWT_ISSUER || "subito-api"
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || "subito-app"

const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || "15m"
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || "30d"

export const ACCESS_TOKEN_EXPIRY_SEC = parseDurationToSeconds(
  ACCESS_TOKEN_EXPIRY,
  900
)
export const REFRESH_TOKEN_EXPIRY_SEC = parseDurationToSeconds(
  REFRESH_TOKEN_EXPIRY,
  30 * 86400
)

export function permissionsForRole(
  role: "customer" | "partner" | "admin"
): string[] {
  const base = ["read:profile"]
  if (role === "customer") {
    return [
      ...base,
      "create:booking",
      "read:booking",
      "read:listing",
      "read:cart",
    ]
  }
  if (role === "partner") {
    return [
      ...base,
      "read:partner_bookings",
      "update:partner_status",
      "update:partner_location",
    ]
  }
  return ["*"]
}

export async function generateAccessToken(payload: {
  userId: string
  role: "customer" | "partner" | "admin"
  phone: string
  sessionId: string
  deviceId: string | null
}): Promise<string> {
  const permissions = permissionsForRole(payload.role)
  const jwt = await new jose.SignJWT({
    userId: payload.userId,
    role: payload.role,
    phone: payload.phone,
    sessionId: payload.sessionId,
    deviceId: payload.deviceId,
    permissions,
    scope: payload.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(JWT_SECRET)

  return jwt
}

export async function generateRefreshToken(input: {
  userId: string
  sessionId: string
}): Promise<string> {
  const jwt = await new jose.SignJWT({
    type: "refresh",
    userId: input.userId,
    sessionId: input.sessionId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(input.userId)
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(JWT_SECRET)

  return jwt
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jose.jwtVerify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    })

    return {
      sub: payload.sub as string,
      userId: payload.userId as string,
      role: payload.role as "customer" | "partner" | "admin",
      phone: payload.phone as string,
      sessionId: payload.sessionId as string | undefined,
      deviceId: payload.deviceId as string | null | undefined,
      permissions: (payload.permissions as string[] | undefined) ?? [],
      scope: payload.scope as string | undefined,
      iat: payload.iat as number,
      exp: payload.exp as number,
    }
  } catch {
    log.debug("JWT verification failed")
    return null
  }
}

export async function verifyRefreshToken(
  token: string
): Promise<{ userId: string; sessionId?: string } | null> {
  try {
    const { payload } = await jose.jwtVerify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    })

    if (payload.type !== "refresh") {
      return null
    }

    return {
      userId: payload.userId as string,
      sessionId: payload.sessionId as string | undefined,
    }
  } catch {
    return null
  }
}

export async function generatePhoneChangeToken(input: {
  userId: string
  newPhone: string
}): Promise<string> {
  const jwt = await new jose.SignJWT({
    type: "phone_change",
    userId: input.userId,
    newPhone: input.newPhone,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(input.userId)
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime("15m")
    .sign(JWT_SECRET)

  return jwt
}

export async function verifyPhoneChangeToken(
  token: string
): Promise<{ userId: string; newPhone: string } | null> {
  try {
    const { payload } = await jose.jwtVerify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    })
    if (payload.type !== "phone_change") {
      return null
    }
    return {
      userId: payload.userId as string,
      newPhone: payload.newPhone as string,
    }
  } catch {
    return null
  }
}
