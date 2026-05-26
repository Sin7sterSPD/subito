import { db } from "@subito/db"

import {
  users,
  referralCodes,
  referralRewards,
  refreshTokens,
} from "@subito/db"

import { eq, and } from "@subito/db"
import { verifyFirebaseToken } from "@/lib/firebase"

import {
  generateAccessToken,
  generateRefreshToken,
  generatePhoneChangeToken,
  verifyRefreshToken,
  verifyPhoneChangeToken,
  ACCESS_TOKEN_EXPIRY_SEC,
  REFRESH_TOKEN_EXPIRY_SEC,
} from "@/lib/jwt"

import {
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  TooManyRequestsError,
  ConflictError,
  InternalError,
} from "@/lib/errors"

import { generateReferralCode } from "@/utils/helpers"

import { redis } from "@/lib/redis"

import { sha256Hex } from "@/lib/token-hash"
import {
  checkOtpSendAllowed,
  checkVerifyAttemptsAllowed,
  recordOtpSend,
  recordVerifyFailure,
  clearOtpKeysForPhone,
} from "@/lib/auth-otp-redis"

import {
  createChallenge,
  getChallenge,
  consumeChallenge,
  incrementChallengeAttempts,
  invalidateChallenge,
  MAX_CHALLENGE_VERIFY_ATTEMPTS,
} from "@/lib/auth-challenge"

import {
  newSessionId,
  createSession,
  getSession,
  revokeSession,
  revokeAllSessionsForUser,
  listSessionsForUser,
  assertSessionActiveAndTouch,
} from "@/lib/session"

import { verifyToken } from "@/lib/jwt"
import { log } from "@/lib/logger"

import {
  getPhoneLookupCandidates,
  normalizePhoneNumber,
  phonesMatch,
} from "@/lib/phone"

import {
  isRefreshTokenFamilyRevoked,
  markRefreshTokenRotated,
  revokeRefreshTokenFamily,
  wasRefreshTokenRotated,
} from "@/lib/refresh-token-family"

const TOKEN_BLACKLIST_PREFIX = "token:blacklist:"
const TOKEN_BLACKLIST_TTL = 60 * 60 * 24 * 7 // 7 days

async function findUserByPhone(phone: string) {
  const candidates = getPhoneLookupCandidates(phone)
  for (const candidate of candidates) {
    const user = await db.query.users.findFirst({
      where: eq(users.phone, candidate),
    })
    if (user) {
      return user
    }
  }
  return null
}

export type AuthDeviceContext = {
  deviceId: string | null
  deviceType: string | null
  appVersion: string | null
  ip: string | null
}

function assertAppTypeAllowed(
  appType: "customer" | "partner" | undefined,
  role: "customer" | "partner" | "admin"
): void {
  if (!appType) {
    return
  }
  if (appType === "partner") {
    if (role !== "partner" && role !== "admin") {
      throw new ForbiddenError(
        "This app is for partner accounts only. Use the customer app instead."
      )
    }
  }
  if (appType === "customer") {
    if (role !== "customer" && role !== "admin") {
      throw new ForbiddenError(
        "This app is for customers only. Use the partner app instead."
      )
    }
  }
}

export async function login(mobileNumber: string, ctx: AuthDeviceContext) {
  const normalizedPhone = normalizePhoneNumber(mobileNumber)
  const send = await checkOtpSendAllowed({
    phone: normalizedPhone,
    deviceId: ctx.deviceId,
    ip: ctx.ip,
  })
  if (!send.allowed) {
    throw new TooManyRequestsError(
      `Too many OTP requests. Try again in ${Math.ceil(send.retryAfterSec / 60)} minutes.`,
      { retryAfterSec: send.retryAfterSec }
    )
  }

  const challenge = await createChallenge({
    phone: normalizedPhone,
    deviceId: ctx.deviceId,
    ip: ctx.ip,
  })
  const retryAfterSec = await recordOtpSend({
    phone: normalizedPhone,
    deviceId: ctx.deviceId,
    ip: ctx.ip,
  })

  const existingUser = await findUserByPhone(normalizedPhone)

  return {
    challengeId: challenge.challengeId,
    isExistingUser: !!existingUser,
    mobileNumber: normalizedPhone,
    retryAfterSec,
  }
}
   

export async function verify(
  data: {
    challengeId: string
    firebaseIdToken: string
    mobileNumber: string
    referralCode?: string
    appType?: "customer" | "partner"
  },
  ctx: AuthDeviceContext
) {
  const normalizedPhone = normalizePhoneNumber(data.mobileNumber)
  const lock = await checkVerifyAttemptsAllowed(normalizedPhone)
  if (!lock.allowed) {
    throw new TooManyRequestsError(
      "Too many failed verification attempts. Try again later.",
      { retryAfterSec: lock.retryAfterSec }
    )
  }

  const bumpFail = async () => {
    await recordVerifyFailure(normalizedPhone)
    const challenge = await incrementChallengeAttempts(data.challengeId)
    if (challenge) {
      const ttl = await redis.ttl(`auth:challenge:${data.challengeId}`)
      if (challenge.attempts >= MAX_CHALLENGE_VERIFY_ATTEMPTS) {
        throw new TooManyRequestsError(
          "Too many failed verification attempts. Try again later.",
          { retryAfterSec: ttl > 0 ? ttl : 0 }
        )
      }
    }
  }

  const challenge = await getChallenge(data.challengeId)
  if (!challenge) {
    throw new UnauthorizedError("Invalid or expired challenge")
  }

  if (challenge.consumed) {
    throw new UnauthorizedError("Challenge already consumed")
  }

  if (challenge.attempts >= MAX_CHALLENGE_VERIFY_ATTEMPTS) {
    const ttl = await redis.ttl(`auth:challenge:${data.challengeId}`)
    throw new TooManyRequestsError(
      "Too many failed verification attempts. Try again later.",
      { retryAfterSec: ttl > 0 ? ttl : 0 }
    )
  }

  if (challenge.phone !== normalizedPhone) {
    await bumpFail()
    throw new BadRequestError("Phone number mismatch")
  }

  if (challenge.deviceId && challenge.deviceId !== ctx.deviceId) {
    await bumpFail()
    throw new UnauthorizedError("Device mismatch")
  }

  const firebaseUser = await verifyFirebaseToken(data.firebaseIdToken)
  if (!firebaseUser) {
    await bumpFail()
    throw new UnauthorizedError("Invalid Firebase token")
  }

  if (!phonesMatch(firebaseUser.phone || "", normalizedPhone)) {
    await bumpFail()
    throw new BadRequestError("Phone number mismatch")
  }

  let user = await findUserByPhone(normalizedPhone)

  let isNewUser = false
  let refreshTokenPlain!: string
  let sessionId: string

  if (!user) {
    isNewUser = true
    const newReferralCode = generateReferralCode()

    let referredByUserId: string | undefined

    if (data.referralCode) {
      const referralCodeRecord = await db.query.referralCodes.findFirst({
        where: and(
          eq(referralCodes.code, data.referralCode),
          eq(referralCodes.isActive, true)
        ),
      })

      if (referralCodeRecord) {
        referredByUserId = referralCodeRecord.userId
      }
    }

    sessionId = newSessionId()

    await db.transaction(async (tx) => {
      const [newUser] = await tx
        .insert(users)
        .values({
          phone: normalizedPhone,
          firebaseUid: firebaseUser.uid,
          referralCode: newReferralCode,
          referredBy: referredByUserId,
          role: "customer",
          isOnboarded: false,
        })
        .returning()

      if (!newUser) {
        throw new InternalError("Failed to create user")
      }
      user = newUser

      await tx.insert(referralCodes).values({
        userId: user.id,
        code: newReferralCode,
        referrerReward: "50.00",
        refereeReward: "50.00",
      })

      if (referredByUserId && data.referralCode) {
        const [referralCodeRecord] = await tx
          .select()
          .from(referralCodes)
          .where(eq(referralCodes.code, data.referralCode))
          .limit(1)

        if (referralCodeRecord) {
          await tx.insert(referralRewards).values({
            referralCodeId: referralCodeRecord.id,
            referrerId: referredByUserId,
            refereeId: user.id,
            referrerRewardAmount: referralCodeRecord.referrerReward || "50.00",
            refereeRewardAmount: referralCodeRecord.refereeReward || "50.00",
          })
        }
      }

      refreshTokenPlain = await generateRefreshToken({
        userId: user.id,
        sessionId,
      })
      const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_SEC * 1000)
      await tx.insert(refreshTokens).values({
        userId: user.id,
        token: sha256Hex(refreshTokenPlain),
        sessionId,
        deviceId: ctx.deviceId,
        expiresAt,
      })
    })
  } else {
    sessionId = newSessionId()
    await db.transaction(async (tx) => {
      if (!user!.firebaseUid) {
        await tx
          .update(users)
          .set({
            firebaseUid: firebaseUser.uid,
            phone: normalizedPhone,
            updatedAt: new Date(),
          })
          .where(eq(users.id, user!.id))
      } else if (user!.phone !== normalizedPhone) {
        await tx
          .update(users)
          .set({ phone: normalizedPhone, updatedAt: new Date() })
          .where(eq(users.id, user!.id))
      }
      refreshTokenPlain = await generateRefreshToken({
        userId: user!.id,
        sessionId,
      })
      const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_SEC * 1000)
      await tx.insert(refreshTokens).values({
        userId: user!.id,
        token: sha256Hex(refreshTokenPlain),
        sessionId,
        deviceId: ctx.deviceId,
        expiresAt,
      })
    })
  }

  if (!user) {
    await bumpFail()
    throw new UnauthorizedError("User not found")
  }

  try {
    assertAppTypeAllowed(data.appType, user.role)
  } catch (e) {
    await bumpFail()
    throw e
  }

  await consumeChallenge(data.challengeId)
  await createSession({
    sessionId,
    userId: user.id,
    deviceId: ctx.deviceId,
    deviceType: ctx.deviceType,
    appVersion: ctx.appVersion,
    ip: ctx.ip,
  })

  const accessToken = await generateAccessToken({
    userId: user.id,
    role: user.role,
    phone: user.phone,
    sessionId,
    deviceId: ctx.deviceId,
  })

  await clearOtpKeysForPhone(data.mobileNumber)
  await invalidateChallenge(data.challengeId)

  return {
    jwt_token: accessToken,
    refreshToken: refreshTokenPlain,
    expiresIn: ACCESS_TOKEN_EXPIRY_SEC,
    refreshExpiresIn: REFRESH_TOKEN_EXPIRY_SEC,
    tokenType: "Bearer" as const,
    sessionId,
    userData: {
      id: user.id,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      profileImage: user.profileImage,
      role: user.role,
      referralCode: user.referralCode,
      isOnboarded: user.isOnboarded,
    },
    isNewUser,
  }
}


export async function refreshAccessToken(
  refreshToken: string,
  ctx: AuthDeviceContext
) {
  const payload = await verifyRefreshToken(refreshToken)
  if (!payload) {
    throw new UnauthorizedError("Invalid refresh token")
  }

  const familyId = payload.sessionId
  if (familyId && (await isRefreshTokenFamilyRevoked(familyId))) {
    throw new UnauthorizedError("Refresh token family revoked")
  }

  const tokenHash = sha256Hex(refreshToken)
  const storedToken = await db.query.refreshTokens.findFirst({
    where: and(
      eq(refreshTokens.token, tokenHash),
      eq(refreshTokens.userId, payload.userId)
    ),
  })

  if (!storedToken) {
    if (familyId && (await wasRefreshTokenRotated(familyId, tokenHash))) {
      log.warn(
        { userId: payload.userId, sessionId: familyId },
        "Refresh token reuse detected"
      )
      await revokeRefreshTokenFamily(familyId, REFRESH_TOKEN_EXPIRY_SEC)
      await revokeAllSessionsForUser(payload.userId)
      throw new UnauthorizedError("Refresh token reuse detected")
    }
    throw new UnauthorizedError("Refresh token not found or revoked")
  }

  if (storedToken.expiresAt < new Date()) {
    await db.delete(refreshTokens).where(eq(refreshTokens.id, storedToken.id))
    throw new UnauthorizedError("Refresh token has expired")
  }

  let resolvedSessionId =
    payload.sessionId ?? storedToken.sessionId ?? undefined

  if (resolvedSessionId) {
    const sess = await getSession(resolvedSessionId)
    if (!sess || sess.userId !== payload.userId) {
      throw new UnauthorizedError("Session expired or logged out")
    }
  }

  if (storedToken.deviceId && storedToken.deviceId !== ctx.deviceId) {
    throw new UnauthorizedError("Device mismatch")
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, payload.userId),
  })

  if (!user) {
    throw new UnauthorizedError("User not found")
  }

  let activeSessionId = resolvedSessionId ?? storedToken.sessionId ?? null
  if (!activeSessionId) {
    activeSessionId = newSessionId()
    await createSession({
      sessionId: activeSessionId,
      userId: user.id,
      deviceId: storedToken.deviceId ?? ctx.deviceId,
      deviceType: ctx.deviceType,
      appVersion: ctx.appVersion,
      ip: ctx.ip,
    })
  }

  const newAccessToken = await generateAccessToken({
    userId: user.id,
    role: user.role,
    phone: user.phone,
    sessionId: activeSessionId,
    deviceId: storedToken.deviceId ?? ctx.deviceId,
  })

  const newRefreshToken = await generateRefreshToken({
    userId: user.id,
    sessionId: activeSessionId,
  })

  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_SEC * 1000)

  await db.transaction(async (tx) => {
    await markRefreshTokenRotated(
      activeSessionId,
      storedToken.token,
      REFRESH_TOKEN_EXPIRY_SEC
    )
    await tx.delete(refreshTokens).where(eq(refreshTokens.id, storedToken.id))

    await tx.insert(refreshTokens).values({
      userId: user.id,
      token: sha256Hex(newRefreshToken),
      sessionId: activeSessionId,
      deviceId: storedToken.deviceId ?? ctx.deviceId,
      expiresAt,
    })
  })

  return {
    jwt_token: newAccessToken,
    refreshToken: newRefreshToken,
    expiresIn: ACCESS_TOKEN_EXPIRY_SEC,
    refreshExpiresIn: REFRESH_TOKEN_EXPIRY_SEC,
    tokenType: "Bearer" as const,
    sessionId: activeSessionId,
  }
}

export async function logout(accessToken: string, userId: string) {
  const payload = await verifyToken(accessToken)

  await redis.setex(
    `${TOKEN_BLACKLIST_PREFIX}${sha256Hex(accessToken)}`,
    TOKEN_BLACKLIST_TTL,
    "1"
  )

  if (payload?.sessionId) {
    await revokeSession(userId, payload.sessionId)
  } else {
    await revokeAllSessionsForUser(userId)
  }
}

export async function logoutAllDevices(accessToken: string, userId: string) {
  await redis.setex(
    `${TOKEN_BLACKLIST_PREFIX}${sha256Hex(accessToken)}`,
    TOKEN_BLACKLIST_TTL,
    "1"
  )
  await revokeAllSessionsForUser(userId)
}

export async function logoutOtherSession(
  userId: string,
  sessionId: string,
  currentSessionId: string | undefined
) {
  if (currentSessionId && sessionId === currentSessionId) {
    throw new BadRequestError("Use logout to end this session")
  }
  const sess = await getSession(sessionId)
  if (!sess || sess.userId !== userId) {
    throw new UnauthorizedError("Session not found")
  }
  await revokeSession(userId, sessionId)
}

export async function getSessionsForUser(
  userId: string,
  currentSessionId: string | undefined
) {
  const rows = await listSessionsForUser(userId)
  return rows.map((r) => ({
    sessionId: r.sessionId,
    deviceId: r.deviceId,
    deviceType: r.deviceType,
    appVersion: r.appVersion,
    lastActivity: r.lastActivity,
    createdAt: r.createdAt,
    isCurrent: r.sessionId === currentSessionId,
  }))
}

export async function touchSessionFromPayload(
  sessionId: string | undefined,
  userId: string
): Promise<void> {
  if (!sessionId) {
    return
  }
  await assertSessionActiveAndTouch(sessionId, userId)
}

export async function requestPhoneChange(
  userId: string,
  newPhone: string,
  currentPhone: string
) {
  if (phonesMatch(newPhone, currentPhone)) {
    throw new BadRequestError("New phone must differ from current phone")
  }
  const normalizedNew = normalizePhoneNumber(newPhone)
  const taken = await findUserByPhone(normalizedNew)
  if (taken) {
    throw new ConflictError("Phone number already in use")
  }
  const token = await generatePhoneChangeToken({
    userId,
    newPhone: normalizedNew,
  })
  return { changeToken: token, newPhone: normalizedNew }
}

export async function verifyPhoneChange(data: {
  changeToken: string
  idtoken: string
  newPhone: string
  userId: string
  ctx: AuthDeviceContext
}) {
  const claims = await verifyPhoneChangeToken(data.changeToken)
  if (!claims || claims.userId !== data.userId) {
    throw new UnauthorizedError("Invalid or expired change token")
  }
  const storedTarget = normalizePhoneNumber(claims.newPhone)
  if (!phonesMatch(claims.newPhone, data.newPhone)) {
    throw new BadRequestError("Phone mismatch with change token")
  }

  const firebaseUser = await verifyFirebaseToken(data.idtoken)
  if (!firebaseUser || !phonesMatch(firebaseUser.phone || "", data.newPhone)) {
    throw new UnauthorizedError("Invalid Firebase token for new phone")
  }

  const taken = await findUserByPhone(storedTarget)
  if (taken && taken.id !== data.userId) {
    throw new ConflictError("Phone number already in use")
  }

  await db
    .update(users)
    .set({
      phone: storedTarget,
      firebaseUid: firebaseUser.uid,
      updatedAt: new Date(),
    })
    .where(eq(users.id, data.userId))

  await revokeAllSessionsForUser(data.userId)

  const user = await db.query.users.findFirst({
    where: eq(users.id, data.userId),
  })
  if (!user) {
    throw new UnauthorizedError("User not found")
  }

  const sessionId = newSessionId()
  await createSession({
    sessionId,
    userId: user.id,
    deviceId: data.ctx.deviceId,
    deviceType: data.ctx.deviceType,
    appVersion: data.ctx.appVersion,
    ip: data.ctx.ip,
  })

  const accessToken = await generateAccessToken({
    userId: user.id,
    role: user.role,
    phone: user.phone,
    sessionId,
    deviceId: data.ctx.deviceId,
  })

  const refreshToken = await generateRefreshToken({
    userId: user.id,
    sessionId,
  })

  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_SEC * 1000)

  await db.insert(refreshTokens).values({
    userId: user.id,
    token: sha256Hex(refreshToken),
    sessionId,
    deviceId: data.ctx.deviceId,
    expiresAt,
  })

  return {
    jwt_token: accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_EXPIRY_SEC,
    refreshExpiresIn: REFRESH_TOKEN_EXPIRY_SEC,
    tokenType: "Bearer" as const,
    sessionId,
    userData: {
      id: user.id,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      profileImage: user.profileImage,
      role: user.role,
      referralCode: user.referralCode,
      isOnboarded: user.isOnboarded,
    },
    isNewUser: false,
  }
}

export async function isTokenBlacklisted(token: string): Promise<boolean> {
  const result = await redis.get(`${TOKEN_BLACKLIST_PREFIX}${sha256Hex(token)}`)
  return result !== null
}
