import { Hono } from "hono"
import type { MiddlewareHandler } from "hono"
import { cors } from "hono/cors"
import { secureHeaders } from "hono/secure-headers"
import { prettyJSON } from "hono/pretty-json"
import { requestId } from "hono/request-id"
import { timing } from "hono/timing"
import { zValidator } from "@hono/zod-validator"

import { errorHandler } from "./middleware/errror-handler"
import { requireAuth } from "./middleware/auth"
import { authRouter } from "./modules/auth/auth.routes"

import type { AppEnv } from "./lib/types"

import { log } from "./lib/logger"

const defaultDevOrigins = [
  "http://localhost:3000",
  "http://localhost:4000",
  "http://localhost:8081",
]
const parsedCors = process.env.CORS_ORIGINS?.split(",")
  .map((s) => s.trim())
  .filter(Boolean)
let corsAllowList = parsedCors?.length ? parsedCors : null
if (!corsAllowList?.length) {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "FATAL: CORS_ORIGINS must be set in production (comma-separated origins)."
    )
  }
  corsAllowList = defaultDevOrigins
}

export const app = new Hono<AppEnv>()

app.use("*", requestId())
app.use("*", timing())
app.use("*", async (c, next) => {
  const start = Date.now()
  await next()
  log.info({
    requestId: c.get("requestId"),
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    durationMs: Date.now() - start,
  })
})
app.use("*", secureHeaders())
app.use("*", prettyJSON())
app.use(
  "*",
  cors({
    origin: corsAllowList,
    credentials: true,
  })
)

