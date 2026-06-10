import "./env"

import { serve } from "@hono/node-server"
import { app } from "./app"
import { pool } from "@subito/db"

import { redis } from "./lib/redis"
import { log } from "./lib/logger"
import { closeQueueProducers } from "./lib/queues"
const port = parseInt(process.env.PORT || "4000", 10)

log.info({ port }, "api_starting")

const server = serve({
  fetch: app.fetch,
  port,
})

log.info({ port }, "api_listening")

let isShuttingDown = false

async function gracefulShutdown(signal: string) {
  if (isShuttingDown) return
  isShuttingDown = true

  log.info({ signal }, "shutdown_start")

  server.close(() => {
    log.info("http_server_closed")
  })

  const shutdownTimeout = setTimeout(() => {
    log.fatal("shutdown_timeout")
    process.exit(1)
  }, 30000)

  try {
    log.info("closing_bullmq_queues")
    await closeQueueProducers()
    log.info("bullmq_queues_closed")

    log.info("closing_redis")
    await redis.quit()
    log.info("redis_closed")

    log.info("closing_db_pool")
    await pool.end()
    log.info("db_pool_closed")

    clearTimeout(shutdownTimeout)
    log.info("shutdown_complete")
    process.exit(0)
  } catch (error) {
    log.error({ err: error }, "shutdown_error")
    clearTimeout(shutdownTimeout)
    process.exit(1)
  }
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"))
process.on("SIGINT", () => gracefulShutdown("SIGINT"))
