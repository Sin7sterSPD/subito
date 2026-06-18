import Redis from "ioredis"
import { log } from "./logger"

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379"

export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
})

redis.on("error", (err) => {
  log.error({ err }, "Redis connection error")
})

redis.on("connect", () => {
  log.info("Worker connected to Redis")
})
