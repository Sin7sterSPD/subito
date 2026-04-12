import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { prettyJSON } from "hono/pretty-json";
import { requestId } from "hono/request-id";
import { timing } from "hono/timing";

import { errorHandler } from "./middleware/error-handler";
import { authRouter } from "./modules/auth/auth.routes";
import { usersRouter } from "./modules/users/users.routes";
import { addressesRouter } from "./modules/addresses/addresses.routes";
import { locationRouter } from "./modules/location/location.routes";
import { listingsRouter } from "./modules/listings/listings.routes";
import { cartRouter } from "./modules/cart/cart.routes";
import { bookingsRouter } from "./modules/bookings/bookings.routes";
import { partnersRouter } from "./modules/partners/partners.routes";
import { paymentsRouter } from "./modules/payments/payments.routes";
import { couponsRouter } from "./modules/coupons/coupons.routes";
import { ratingsRouter } from "./modules/ratings/ratings.routes";
import { referralsRouter } from "./modules/referrals/referrals.routes";
import { settingsRouter } from "./modules/settings/settings.routes";
import { uploadRouter } from "./modules/upload/upload.routes";

import type { AppEnv } from "./lib/types";

export const app = new Hono<AppEnv>();

app.use("*", requestId());
app.use("*", timing());
app.use("*", logger());
app.use("*", secureHeaders());
app.use("*", prettyJSON());
app.use(
  "*",
  cors({
    origin: ["http://localhost:3000", "http://localhost:8081"],
    credentials: true,
  })
);

app.onError(errorHandler);

app.get("/", (c) => {
  return c.json({
    name: "Subito API",
    version: "1.0.0",
    status: "healthy",
  });
});

app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.route("/auth", authRouter);
app.route("/users", usersRouter);
app.route("/location", locationRouter);
app.route("/listings", listingsRouter);
app.route("/categories", listingsRouter);
app.route("/cart", cartRouter);
app.route("/bookings", bookingsRouter);
app.route("/partners", partnersRouter);
app.route("/v1/payment", paymentsRouter);
app.route("/payments", paymentsRouter);
app.route("/coupons", couponsRouter);
app.route("/rating", ratingsRouter);
app.route("/referral", referralsRouter);
app.route("/settings", settingsRouter);
app.route("/support", settingsRouter);
app.route("/upload", uploadRouter);

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
