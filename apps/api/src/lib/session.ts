import "../env"
import { randomUUID } from "crypto"
import { and, db, eq } from "@subito/db"
import { refreshTokens } from "@subito/db/schema"
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

function pruneLastTouchMap(now: number): void {
  for (const [sessionId, ts] of lastTouchMap) {
    if (now - ts > LAST_TOUCH_MAP_MAX_AGE_MS) {
      lastTouchMap.delete(sessionId)
    }
  }
}

async function pruneGhostSessionsFromUserHash(userId: string): Promise<void> {
  const hkey = USER_SESSIONS_HASH(userId)
  const entries = await redis.hgetall(hkey)
  const ids = Object.keys(entries)
  if (ids.length === 0) {
    return
  }
  const pipeline = redis.pipeline()
  for (const sessionId of ids) {
    pipeline.exists(SESSION_KEY(sessionId))
  }
  const existsResults = await pipeline.exec()
  if (!existsResults) {
    return
  }
  const toRemove: string[] = []
  ids.forEach((sessionId, i) => {
    const v = existsResults[i]?.[1]
    const exists = typeof v === "number" ? v : 0
    if (!exists) {
      toRemove.push(sessionId)
    }
  })
  if (toRemove.length > 0) {
    await redis.hdel(hkey, ...toRemove)
  }
}

export function newSessionId(): string {
  return randomUUID()
}

export async function createSession(params: {
  sessionId: string
  userId: string
  deviceId: string | null
  deviceType: string | null
  appVersion: string | null
  ip: string | null
}): Promise<void> {
  const now = Date.now()
  const rec: SessionRecord = {
    userId: params.userId,
    deviceId: params.deviceId,
    deviceType: params.deviceType,
    appVersion: params.appVersion,
    ip: params.ip,
    createdAt: now,
    lastActivity: now,
  }
  await redis.setex(
    SESSION_KEY(params.sessionId),
    SESSION_TTL_SEC,
    JSON.stringify(rec)
  )

  const compact: UserSessionListEntry = {
    sessionId: params.sessionId,
    deviceId: params.deviceId,
    deviceType: params.deviceType,
    appVersion: params.appVersion,
    lastActivity: now,
    createdAt: now,
  }

  await redis.hset(
    USER_SESSIONS_HASH(params.userId),
    params.sessionId,
    JSON.stringify(compact)
  )

  await evictOldestSessionIfNeeded(params.userId)
}

async function evictOldestSessionIfNeeded(userId: string): Promise<void> {
  await pruneGhostSessionsFromUserHash(userId)
  const hkey = USER_SESSIONS_HASH(userId)
  const entries = await redis.hgetall(hkey)
  const ids = Object.keys(entries)
  if (ids.length <= MAX_SESSIONS_PER_USER) {
    return
  }
  const parsed = ids
    .map((id) => {
      try {
        const j = JSON.parse(entries[id]!) as UserSessionListEntry
        return { id, last: j.lastActivity ?? 0 }
      } catch {
        return { id, last: 0 }
      }
    })
    .sort((a, b) => a.last - b.last)
  const toEvict = parsed.slice(0, ids.length - MAX_SESSIONS_PER_USER)
  for (const { id } of toEvict) {
    await revokeSession(userId, id)
    log.info({ userId, sessionId: id }, "Evicted oldest session (max devices)")
  }
}

export async function getSession(
  sessionId: string
): Promise<SessionRecord | null> {
  const raw = await redis.get(SESSION_KEY(sessionId))
  if (!raw) {
    return null
  }
  try {
    return JSON.parse(raw) as SessionRecord
  } catch {
    return null
  }
}

/** Single GET: validate session belongs to user; touch Redis at most once per 5 minutes. */
export async function assertSessionActiveAndTouch(
  sessionId: string,
  userId: string
): Promise<void> {
  const now = Date.now()
  pruneLastTouchMap(now)

  const raw = await redis.get(SESSION_KEY(sessionId))
  if (!raw) {
    throw new UnauthorizedError("Session expired or logged out")
  }
  let rec: SessionRecord
  try {
    rec = JSON.parse(raw) as SessionRecord
  } catch {
    throw new UnauthorizedError("Session expired or logged out")
  }
  if (rec.userId !== userId) {
    throw new UnauthorizedError("Session expired or logged out")
  }

  const last = lastTouchMap.get(sessionId)
  if (last !== undefined && now - last < TOUCH_THROTTLE_MS) {
    return
  }

  rec.lastActivity = now
  await redis.setex(
    SESSION_KEY(sessionId),
    SESSION_TTL_SEC,
    JSON.stringify(rec)
  )

  const listRaw = await redis.hget(USER_SESSIONS_HASH(userId), sessionId)
  if (listRaw) {
    try {
      const list = JSON.parse(listRaw) as UserSessionListEntry
      list.lastActivity = now
      await redis.hset(
        USER_SESSIONS_HASH(userId),
        sessionId,
        JSON.stringify(list)
      )
    } catch {
      /* ignore */
    }
  }

  lastTouchMap.set(sessionId, now)
}

export async function revokeSession(
  userId: string,
  sessionId: string
): Promise<void> {
  await redis.del(SESSION_KEY(sessionId))
  await redis.hdel(USER_SESSIONS_HASH(userId), sessionId)
  lastTouchMap.delete(sessionId)
  await db
    .delete(refreshTokens)
    .where(
      and(
        eq(refreshTokens.userId, userId),
        eq(refreshTokens.sessionId, sessionId)
      )
    )
}

export async function revokeAllSessionsForUser(userId: string): Promise<void> {
  const hkey = USER_SESSIONS_HASH(userId)
  const entries = await redis.hgetall(hkey)
  const ids = Object.keys(entries)
  for (const id of ids) {
    await redis.del(SESSION_KEY(id))
    lastTouchMap.delete(id)
  }
  await redis.del(hkey)
  await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId))
}

export async function listSessionsForUser(
  userId: string
): Promise<UserSessionListEntry[]> {
  await pruneGhostSessionsFromUserHash(userId)
  const entries = await redis.hgetall(USER_SESSIONS_HASH(userId))
  const out: UserSessionListEntry[] = []
  for (const sessionId of Object.keys(entries)) {
    const raw = entries[sessionId]
    if (typeof raw !== "string") {
      continue
    }
    try {
      const row = JSON.parse(raw) as UserSessionListEntry
      out.push({ ...row, sessionId })
    } catch {
      out.push({
        sessionId,
        deviceId: null,
        deviceType: null,
        appVersion: null,
        lastActivity: 0,
        createdAt: 0,
      })
    }
  }
  return out.sort((a, b) => b.lastActivity - a.lastActivity)
}
