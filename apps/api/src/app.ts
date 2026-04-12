import { Hono } from "hono";
import type { MiddlewareHandler } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { prettyJSON } from "hono/pretty-json";
import { requestId } from "hono/request-id";
import { timing } from "hono/timing";
import { zValidator } from "@hono/zod-validator";

import { errorHandler } from "./middleware/error-handler";
import { requireAuth } from "./middleware/auth";
import { authRouter } from "./modules/auth/auth.routes";
import { usersRouter } from "./modules/users/users.routes";
import { locationRouter } from "./modules/location/location.routes";
import { listingsRouter } from "./modules/listings/listings.routes";
import { cartRouter } from "./modules/cart/cart.routes";
import { bookingsRouter } from "./modules/bookings/bookings.routes";
import { partnersRouter } from "./modules/partners/partners.routes";
import {
  paymentsRouter,
  processOrderSchema,
} from "./modules/payments/payments.routes";
import * as paymentsService from "./modules/payments/payments.service";
import { couponsRouter } from "./modules/coupons/coupons.routes";
import { ratingsRouter } from "./modules/ratings/ratings.routes";
import { referralsRouter } from "./modules/referrals/referrals.routes";
import { settingsRouter } from "./modules/settings/settings.routes";
import { uploadRouter } from "./modules/upload/upload.routes";

import type { AppEnv } from "./lib/types";

const defaultDevOrigins = ["http://localhost:3000", "http://localhost:8081"];
const parsedCors = process.env.CORS_ORIGINS?.split(",")
  .map((s) => s.trim())
  .filter(Boolean);
let corsAllowList = parsedCors?.length ? parsedCors : null;
if (!corsAllowList?.length) {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "FATAL: CORS_ORIGINS must be set in production (comma-separated origins)."
    );
  }
  corsAllowList = defaultDevOrigins;
}

export const app = new Hono<AppEnv>();

app.use("*", requestId());
app.use("*", timing());
app.use("*", logger());
app.use("*", secureHeaders());
app.use("*", prettyJSON());
app.use(
  "*",
  cors({
    origin: corsAllowList,
    credentials: true,
  })
);

/** Log client tracing headers (rate limits / version gates may use these later). */
const clientHeadersLogger: MiddlewareHandler<AppEnv> = async (c, next) => {
  const platform = c.req.header("X-Platform");
  const appVersion = c.req.header("X-App-Version");
  const deviceId = c.req.header("X-Device-ID");
  if (platform || appVersion || deviceId) {
    console.log(
      JSON.stringify({
        msg: "client_headers",
        requestId: c.get("requestId"),
        path: c.req.path,
        X_Platform: platform,
        X_App_Version: appVersion,
        X_Device_ID: deviceId ? `${deviceId.slice(0, 8)}…` : undefined,
      })
    );
  }
  await next();
};
app.use("*", clientHeadersLogger);

app.onError(errorHandler);

app.get("/", (c) => {
  return c.json({
    name: "Subito API",
    version: "1.0.0",
    docs: "All application routes are under /v1 (except GET /health).",
  });
});

app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

const v1 = new Hono<AppEnv>();

v1.route("/auth", authRouter);
v1.route("/users", usersRouter);
v1.route("/location", locationRouter);
v1.route("/listings", listingsRouter);
v1.route("/categories", listingsRouter);
v1.route("/cart", cartRouter);
v1.route("/bookings", bookingsRouter);
v1.route("/partners", partnersRouter);
v1.route("/payments", paymentsRouter);
v1.route("/coupons", couponsRouter);
v1.route("/rating", ratingsRouter);
v1.route("/referral", referralsRouter);
v1.route("/settings", settingsRouter);
v1.route("/support", settingsRouter);
v1.route("/upload", uploadRouter);

/** Mobile contract: POST /v1/process-order (alias of POST /v1/payments/process-order). */
v1.post(
  "/process-order",
  requireAuth,
  zValidator("json", processOrderSchema),
  async (c) => {
    const userId = c.get("userId")!;
    const data = c.req.valid("json");
    const result = await paymentsService.processOrder(userId, data);
    return c.json({ success: true, data: result });
  }
);

app.route("/v1", v1);

app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: {
        code: "NOT_FOUND",
        message: `Route ${c.req.method} ${c.req.path} not found`,
      },
    },
    404
  );
});

export type AppType = typeof app;
