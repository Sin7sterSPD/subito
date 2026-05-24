/** Parse env-style durations: `15m`, `30d`, `3600s`, `2h`. Defaults to `fallbackSec` on bad input. */
export function parseDurationToSeconds(
  raw: string | undefined,
  fallbackSec: number
): number {
  if (!raw || typeof raw !== "string") {
    return fallbackSec
  }
  const m = /^(\d+)\s*(s|m|h|d)$/i.exec(raw.trim())
  if (!m) {
    return fallbackSec
  }
  const n = parseInt(m[1]!, 10)
  if (!Number.isFinite(n) || n < 0) {
    return fallbackSec
  }
  const u = m[2]!.toLowerCase()
  const mult = u === "s" ? 1 : u === "m" ? 60 : u === "h" ? 3600 : 86400
  return n * mult
}
