import "dotenv/config"
import { pool } from "@subito/db"
import { notificationWorker } from "./processors/notification.processor"
import { paymentReconciliationWorker } from "./processors/payment.processor"
import { bookingStatusWorker } from "./processors/booking.processor"
import { partnerMatchingWorker } from "./processors/partner.processor"
import { recurringBookingWorker } from "./processors/recurring.processor"
import { redis } from "./lib/redis"
import { startMaintenanceInterval } from "./jobs/maintenance"
import { log } from "./lib/logger"

log.info("Starting workers...")

let maintenanceTimer: ReturnType<typeof setInterval> | null = null
const maintenanceIntervalMs = parseInt(
  process.env.MAINTENANCE_INTERVAL_MS || "0",
  10
)
if (Number.isFinite(maintenanceIntervalMs) && maintenanceIntervalMs >= 60_000) {
  maintenanceTimer = startMaintenanceInterval(maintenanceIntervalMs)
  log.info(
    { maintenanceIntervalMs },
    "Scheduled data maintenance (distributed lock, single runner)"
  )
}

const workers = [
  notificationWorker,
  paymentReconciliationWorker,
  bookingStatusWorker,
  partnerMatchingWorker,
  recurringBookingWorker,
]

let isShuttingDown = false

async function gracefulShutdown(signal: string) {
  if (isShuttingDown) return
  isShuttingDown = true

  log.info({ signal }, "Graceful shutdown requested")

  const shutdownTimeout = setTimeout(() => {
    log.error("Shutdown timeout, forcing exit")
    process.exit(1)
  }, 30000)

  try {
    if (maintenanceTimer) {
      clearInterval(maintenanceTimer)
      maintenanceTimer = null
      log.info("Maintenance interval cleared")
    }
    log.info("Closing workers...")
    await Promise.all(workers.map((worker) => worker.close()))
    log.info("Workers closed")

    log.info("Closing Redis connection...")
    await redis.quit()
    log.info("Redis connection closed")

    log.info("Closing database pool...")
    await pool.end()
    log.info("Database pool closed")

    clearTimeout(shutdownTimeout)
    log.info("Graceful shutdown complete")
    process.exit(0)
  } catch (error) {
    log.error({ err: error }, "Error during shutdown")
    clearTimeout(shutdownTimeout)
    process.exit(1)
  }
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"))
process.on("SIGINT", () => gracefulShutdown("SIGINT"))

log.info("All workers started successfully")
