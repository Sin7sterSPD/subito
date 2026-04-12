import { createMiddleware } from "hono/factory";
import { verifyToken } from "../lib/jwt";
import { UnauthorizedError } from "../lib/errors";
import { isTokenBlacklisted } from "../modules/auth/auth.service";
import type { AppEnv } from "../lib/types";

export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new UnauthorizedError("Missing or invalid authorization header");
  }

  const token = authHeader.substring(7);

  const isBlacklisted = await isTokenBlacklisted(token);
  if (isBlacklisted) {
    throw new UnauthorizedError("Token has been revoked");
  }

  const payload = await verifyToken(token);

  if (!payload) {
    throw new UnauthorizedError("Invalid or expired token");
  }

  c.set("user", payload);
  c.set("userId", payload.userId);

  await next();
});

export const optionalAuth = createMiddleware<AppEnv>(async (c, next) => {
  const authHeader = c.req.header("Authorization");

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);

    const isBlacklisted = await isTokenBlacklisted(token);
    if (!isBlacklisted) {
      const payload = await verifyToken(token);

      if (payload) {
        c.set("user", payload);
        c.set("userId", payload.userId);
      }
    }
  }

  await next();
});

export const requireRole = (...roles: ("customer" | "partner" | "admin")[]) =>
  createMiddleware<AppEnv>(async (c, next) => {
    const user = c.get("user");

    if (!user) {
      throw new UnauthorizedError("Authentication required");
    }

    if (!roles.includes(user.role)) {
      throw new UnauthorizedError(
        `Access denied. Required role: ${roles.join(" or ")}`
      );
    }

    await next();
  });

export const requireAdmin = requireRole("admin");
export const requirePartner = requireRole("partner", "admin");
export const requireCustomer = requireRole("customer", "admin");
