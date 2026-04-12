import { Hono } from "hono";
import type { AppEnv } from "../../lib/types";
import { requireAuth } from "../../middleware/auth";
import * as uploadService from "./upload.service";

export const uploadRouter = new Hono<AppEnv>();

uploadRouter.post("/image", requireAuth, async (c) => {
  const userId = c.get("userId")!;
  const body = await c.req.parseBody();
  const file = body["file"];

  if (!file || typeof file === "string") {
    return c.json(
      {
        success: false,
        error: { code: "BAD_REQUEST", message: "No file uploaded" },
      },
      400
    );
  }

  const result = await uploadService.uploadImage(userId, file);

  return c.json({
    success: true,
    data: result,
  });
});
