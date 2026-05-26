import { createMiddleware } from "hono/factory";
import { redis } from "@/lib/redis";

import type { AppEnv } from "@/lib/types"

interface RateLimitOptions {
  windowMs: number
  max: number
  keyPrefix?: string
}

/** Atomic INCR + EXPIRE on first hit (avoids pre-2015 INCR/EXPIRE TOCTOU). */
const RATE_LIMIT_SCRIPT = `
   local key = KEYS[1]
   local window = tonumber(ARGV[1])
   local current = redis.call('INCR', key)
   if current == 1 then
     redis.call('EXPIRE', key, window)
   end
   local ttl = redis.call('TTL', key)
   return {current, ttl}
   `

export function rateLimit(options: RateLimitOptions) {
  const { windowMs, max, keyPrefix = "ratelimit" } = options
  const windowSec = Math.ceil(windowMs / 1000)

  return createMiddleware<AppEnv>(async (c, next) => {
    const userId = c.get("userId")
    const ip =
      c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown"
    const identifier = userId || ip
    const key = `${keyPrefix}:${identifier}`

    const result = (await redis.eval(
      RATE_LIMIT_SCRIPT,
      1,
      key,
      windowSec.toString()
    )) as [number, number]

    const [current, ttl] = result
    const remaining = Math.max(0, max - current)

    c.header("X-RateLimit-Limit", max.toString())
    c.header("X-RateLimit-Remaining", remaining.toString())
    c.header("X-RateLimit-Reset", (Date.now() + ttl * 1000).toString())

    if (current > max) {
      c.header("Retry-After", ttl.toString())
      return c.json(
        {
          success: false,
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Too many requests, please try again later",
          },
        },
        429
      )
    }

    await next()
  })
}

export const authRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyPrefix: "ratelimit:auth",
})

export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  keyPrefix: "ratelimit:api",
})

export const checkoutRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  keyPrefix: "ratelimit:checkout",
})
   