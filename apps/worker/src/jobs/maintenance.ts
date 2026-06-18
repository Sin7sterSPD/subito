import { db, pool } from "@subito/db"
import { idempotencyKeys } from "@subito/db/schema"
import { lt } from "@subito/db"
import { redis } from "../lib/redis"
import { log } from "../lib/logger"
import { randomUUID } from "crypto"

const LOCK_KEY = "subito:lock:data_maintenance_v1"
const LOCK_TTL_SEC = 240

const RELEASE_LOCK_SCRIPT = `
  if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
  else
    return 0
  end
`

export interface MaintenanceResult {
  skipped: boolean
}

function defaultRetentionDays(): number {
  const n = parseInt(process.env.PARTNER_LOCATION_RETENTION_DAYS || "90", 10)
  return Number.isFinite(n) && n > 0 ? n : 90
}

/**
 * Removes expired idempotency keys (hot path for sweeps uses `expires_at` index).
 * Prunes old `partner_locations` only when a newer row exists for the same partner (safe for history).
 */
export async function runScheduledMaintenance(
  partnerLocationRetentionDays = defaultRetentionDays()
): Promise<MaintenanceResult> {
  await db
    .delete(idempotencyKeys)
    .where(lt(idempotencyKeys.expiresAt, new Date()))

  await pool.query(
    `DELETE FROM partner_locations pl
     WHERE pl.recorded_at < NOW() - $1 * INTERVAL '1 day'
     AND EXISTS (
       SELECT 1 FROM partner_locations newer
       WHERE newer.partner_id = pl.partner_id
         AND newer.recorded_at > pl.recorded_at
     )`,
    [partnerLocationRetentionDays]
  )

  return { skipped: false }
}

export async function runScheduledMaintenanceWithLock(
  partnerLocationRetentionDays = defaultRetentionDays()
): Promise<MaintenanceResult> {
  const lockToken = randomUUID()

  const ok = await redis.set(LOCK_KEY, lockToken, "EX", LOCK_TTL_SEC, "NX")

  if (ok !== "OK") {
    return { skipped: true }
  }

  try {
    return await runScheduledMaintenance(partnerLocationRetentionDays)
  } finally {
    await redis.eval(RELEASE_LOCK_SCRIPT, 1, LOCK_KEY, lockToken)
  }
}

export function startMaintenanceInterval(
  intervalMs: number
): ReturnType<typeof setInterval> {
  return setInterval(() => {
    void runScheduledMaintenanceWithLock().then((r) => {
      if (!r.skipped) {
        log.info(
          "[maintenance] completed: idempotency_sweep + partner_location_prune"
        )
      }
    })
  }, intervalMs)
}
