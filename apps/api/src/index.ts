import "dotenv/config";
import { serve } from "@hono/node-server";
import { app } from "./app";

const port = parseInt(process.env.PORT || "3000", 10);

console.log(`Starting server on port ${port}...`);

serve({
  fetch: app.fetch,
  port,
});

console.log(`Server running at http://localhost:${port}`);
