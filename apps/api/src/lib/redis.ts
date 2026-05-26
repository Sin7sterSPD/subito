import "../env"
import Redis from "ioredis"
import { log } from "./logger"

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379"

export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000)
    return delay
  },
})

redis.on("error", (err) => {
  log.error({ err }, "Redis connection error")
})

redis.on("connect", () => {
  log.info("Connected to Redis")
})

export async function cacheGet<T>(key: string): Promise<T | null> {
  const data = await redis.get(key)
  if (!data) return null
  return JSON.parse(data) as T
}

const DEFAULT_CACHE_TTL_SEC = 60 * 60 * 24 // 24h when TTL omitted

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds?: number
): Promise<void> {
  const serialized = JSON.stringify(value)
  const ttl = ttlSeconds ?? DEFAULT_CACHE_TTL_SEC
  await redis.setex(key, ttl, serialized)
}

export async function cacheDel(key: string): Promise<void> {
  await redis.del(key)
}

/** Non-blocking: SCAN in chunks (replaces O(N) KEYS). */
export async function cacheDelPattern(pattern: string): Promise<void> {
  let cursor = "0"
  do {
    const [nextCursor, keys] = await redis.scan(
      cursor,
      "MATCH",
      pattern,
      "COUNT",
      100
    )
    cursor = nextCursor
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  } while (cursor !== "0")
}
