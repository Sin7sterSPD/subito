import "dotenv/config"
import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import * as schema from "./schema/index.js"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  max: parseInt(process.env.DB_POOL_MAX || "10", 10),
  idleTimeoutMillis: parseInt(
    process.env.DB_POOL_IDLE_TIMEOUT_MS || "30000",
    10
  ),
  connectionTimeoutMillis: parseInt(
    process.env.DB_POOL_CONNECT_TIMEOUT_MS || "5000",
    10
  ),
})

export const db = drizzle(pool, { schema })

export type Database = typeof db
export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

export { pool }
export * from "./schema/index.js"
export { schema }
