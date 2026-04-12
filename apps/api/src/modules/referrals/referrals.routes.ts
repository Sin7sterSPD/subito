import { Hono } from "hono";
import type { AppEnv } from "../../lib/types";
import { requireAuth } from "../../middleware/auth";
import * as referralsService from "./referrals.service";

export const referralsRouter = new Hono<AppEnv>();

referralsRouter.get("/summary", requireAuth, async (c) => {
  const userId = c.get("userId")!;
  const summary = await referralsService.getReferralSummary(userId);

  return c.json({
    success: true,
    data: summary,
  });
});

referralsRouter.get("/:code/exists", async (c) => {
  const code = c.req.param("code");
  const result = await referralsService.checkReferralCode(code);

  return c.json({
    success: true,
    data: result,
  });
});
