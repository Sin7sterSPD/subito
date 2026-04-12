import { createMiddleware } from "hono/factory";
import { redis } from "../lib/redis";
import type { AppEnv } from "../lib/types";

interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyPrefix?: string;
}

export function rateLimit(options: RateLimitOptions) {
  const { windowMs, max, keyPrefix = "ratelimit" } = options;
  const windowSec = Math.ceil(windowMs / 1000);

  return createMiddleware<AppEnv>(async (c, next) => {
    const userId = c.get("userId");
    const ip = c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";
    const identifier = userId || ip;
    const key = `${keyPrefix}:${identifier}`;

    const current = await redis.incr(key);

    if (current === 1) {
      await redis.expire(key, windowSec);
    }

    const ttl = await redis.ttl(key);
    const remaining = Math.max(0, max - current);

    c.header("X-RateLimit-Limit", max.toString());
    c.header("X-RateLimit-Remaining", remaining.toString());
    c.header("X-RateLimit-Reset", (Date.now() + ttl * 1000).toString());

    if (current > max) {
      c.header("Retry-After", ttl.toString());
      return c.json(
        {
          success: false,
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Too many requests, please try again later",
          },
        },
        429
      );
    }

    await next();
  });
}

export const authRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyPrefix: "ratelimit:auth",
});

export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  keyPrefix: "ratelimit:api",
});

export const checkoutRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  keyPrefix: "ratelimit:checkout",
});
