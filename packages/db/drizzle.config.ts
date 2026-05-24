import dotenv from "dotenv"
import { defineConfig } from "drizzle-kit"
import { fileURLToPath } from "url"
import path from "path"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load .env from repo root (two levels up from this package)
dotenv.config({ path: path.resolve(__dirname, "../../.env") })

export default defineConfig({
  out: "./drizzle",
  schema: "./src/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
