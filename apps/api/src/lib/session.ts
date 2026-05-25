import { randomUUID } from "node:crypto"

import { db } from "@subito/db"

import { refreshTokens } from "@subito/db"

import { and, eq } from "drizzle-orm"

import { redis } from "./redis"
import { parseDurationToSeconds } from "./duration"

import { log } from "./logger"

import { UnauthorizedError } from "./errors"

const REFRESH_EXPIRY_RAW = process.env.REFRESH_TOKEN_EXPIRY || "30d"
export const SESSION_TTL_SEC = parseDurationToSeconds(
  REFRESH_EXPIRY_RAW,
  30 * 86400
)

const SESSION_KEY = (id: string) => `session:${id}`
const USER_SESSIONS_HASH = (userId: string) => `sessions:${userId}`

const MAX_SESSIONS_PER_USER = 5

const TOUCH_THROTTLE_MS = 300_000
const LAST_TOUCH_MAP_MAX_AGE_MS = 600_000
const lastTouchMap = new Map<string, number>()

export interface SessionRecord {
  userId: string
  deviceId: string | null
  deviceType: string | null
  appVersion: string | null
  ip: string | null
  createdAt: number
  lastActivity: number
}

export interface UserSessionListEntry {
  sessionId: string
  deviceId: string | null
  deviceType: string | null
  appVersion: string | null
  lastActivity: number
  createdAt: number
}