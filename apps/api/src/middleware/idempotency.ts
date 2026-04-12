import { createMiddleware } from "hono/factory";
import { createHash } from "crypto";
import { redis } from "../lib/redis";
import { ConflictError, UnauthorizedError, BadRequestError } from "../lib/errors";
import type { AppEnv } from "../lib/types";

interface IdempotencyOptions {
  ttlSeconds?: number;
  requireAuth?: boolean;
}

interface IdempotencyRecord {
  status: "processing" | "completed";
  requestHash: string;
  response?: unknown;
  statusCode?: number;
  completedAt?: string;
}

const DEFAULT_TTL = 60 * 60 * 6; // 6 hours default

/**
 * Production-grade idempotency middleware
 * 
 * Features:
 * - Atomic locking with SET NX to prevent race conditions
 * - Request body hashing to detect payload mismatches
 * - Configurable TTL per route
 * - Requires authentication by default
 * - Safe response handling (JSON and non-JSON)
 * 
 * Usage:
 *   app.post("/bookings", idempotency(), handler);
 *   app.post("/payments", idempotency({ ttlSeconds: 3600 }), handler);
 */
export function idempotency(options: IdempotencyOptions = {}) {
  const { ttlSeconds = DEFAULT_TTL, requireAuth = true } = options;

  return createMiddleware<AppEnv>(async (c, next) => {
    const idempotencyKey = c.req.header("Idempotency-Key");

    if (!idempotencyKey) {
      await next();
      return;
    }

    if (idempotencyKey.length < 10 || idempotencyKey.length > 255) {
      throw new BadRequestError(
        "Idempotency-Key must be between 10 and 255 characters"
      );
    }

    const userId = c.get("userId");

    if (requireAuth && !userId) {
      throw new UnauthorizedError(
        "Authentication required for idempotent requests"
      );
    }

    const identifier = userId || c.req.header("x-forwarded-for") || "unknown";
    const cacheKey = `idempotency:${identifier}:${idempotencyKey}`;

    const rawBody = await c.req.text();
    const requestHash = createHash("sha256").update(rawBody).digest("hex");

    const lockValue = JSON.stringify({
      status: "processing",
      requestHash,
      startedAt: new Date().toISOString(),
    } satisfies Partial<IdempotencyRecord>);

    const wasSet = await redis.set(cacheKey, lockValue, "EX", ttlSeconds, "NX");

    if (!wasSet) {
      const existing = await redis.get(cacheKey);

      if (!existing) {
        throw new ConflictError(
          "Idempotency key state inconsistent. Please retry with a new key."
        );
      }

      let record: IdempotencyRecord;
      try {
        record = JSON.parse(existing);
      } catch {
        await redis.del(cacheKey);
        throw new ConflictError(
          "Corrupted idempotency record. Please retry with a new key."
        );
      }

      if (record.status === "processing") {
        c.header("Retry-After", "5");
        throw new ConflictError(
          "A request with this idempotency key is currently being processed. Please wait and retry."
        );
      }

      if (record.status === "completed") {
        if (record.requestHash !== requestHash) {
          throw new BadRequestError(
            "Idempotency key has already been used with a different request payload. " +
            "Each unique request must use a unique idempotency key."
          );
        }

        c.header("X-Idempotent-Replayed", "true");
        c.header("X-Idempotent-Completed-At", record.completedAt || "");

        if (record.response === null || record.response === undefined) {
          return c.body(null, (record.statusCode || 204) as 204);
        }

        return c.json(record.response as object, (record.statusCode || 200) as 200);
      }
    }

    try {
      c.req.raw = new Request(c.req.url, {
        method: c.req.method,
        headers: c.req.raw.headers,
        body: rawBody,
      });

      await next();

      let responseBody: unknown = null;
      const contentType = c.res.headers.get("content-type") || "";
      const statusCode = c.res.status;

      if (statusCode !== 204 && contentType.includes("application/json")) {
        try {
          responseBody = await c.res.clone().json();
        } catch {
          responseBody = null;
        }
      }

      const completedRecord: IdempotencyRecord = {
        status: "completed",
        requestHash,
        response: responseBody,
        statusCode,
        completedAt: new Date().toISOString(),
      };

      await redis.setex(cacheKey, ttlSeconds, JSON.stringify(completedRecord));
    } catch (error) {
      await redis.del(cacheKey);
      throw error;
    }
  });
}

export const bookingIdempotency = idempotency({ ttlSeconds: 60 * 60 * 24 }); // 24h for bookings
export const paymentIdempotency = idempotency({ ttlSeconds: 60 * 60 * 6 });  // 6h for payments
export const checkoutIdempotency = idempotency({ ttlSeconds: 60 * 60 * 2 }); // 2h for checkout
