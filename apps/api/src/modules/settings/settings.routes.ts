import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { AppEnv } from "../../lib/types";
import { requireAuth, optionalAuth } from "../../middleware/auth";
import * as settingsService from "./settings.service";

export const settingsRouter = new Hono<AppEnv>();

const complaintSchema = z.object({
  category: z.string().optional(),
  subject: z.string().min(1),
  description: z.string().min(1),
  bookingId: z.string().uuid().optional(),
  attachments: z.array(z.string()).optional(),
});

settingsRouter.get("/", optionalAuth, async (c) => {
  const settings = await settingsService.getAppSettings();

  return c.json({
    success: true,
    data: settings,
  });
});

settingsRouter.get("/contact", async (c) => {
  const contact = await settingsService.getSupportContact();

  return c.json({
    success: true,
    data: contact,
  });
});

settingsRouter.post(
  "/complaint",
  requireAuth,
  zValidator("json", complaintSchema),
  async (c) => {
    const userId = c.get("userId")!;
    const data = c.req.valid("json");
    const result = await settingsService.submitComplaint(userId, data);

    return c.json({
      success: true,
      data: result,
    });
  }
);
