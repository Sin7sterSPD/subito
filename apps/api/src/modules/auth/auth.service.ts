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