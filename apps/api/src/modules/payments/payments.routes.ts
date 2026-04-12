import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { AppEnv } from "../../lib/types";
import { requireAuth } from "../../middleware/auth";
import * as paymentsService from "./payments.service";

export const paymentsRouter = new Hono<AppEnv>();

const optionsQuerySchema = z.object({
  platform: z.string().default("android"),
});

const verifyUpiSchema = z.object({
  upiId: z.string(),
});

const initiatePaymentSchema = z.object({
  orderId: z.string(),
  amount: z.number(),
  paymentMethodId: z.string().optional(),
});

export const processOrderSchema = z.object({
  orderId: z.string(),
  status: z.enum(["SUCCESS", "CHARGED", "FAILED", "PENDING"]),
  txnId: z.string().optional(),
});

paymentsRouter.get(
  "/options",
  requireAuth,
  zValidator("query", optionsQuerySchema),
  async (c) => {
    const { platform } = c.req.valid("query");
    const options = await paymentsService.getPaymentOptions(platform);

    return c.json({
      success: true,
      data: options,
    });
  }
);

paymentsRouter.get(
  "/verify-upi",
  requireAuth,
  zValidator("query", verifyUpiSchema),
  async (c) => {
    const { upiId } = c.req.valid("query");
    const result = await paymentsService.verifyUpi(upiId);

    return c.json({
      success: true,
      data: result,
    });
  }
);

paymentsRouter.get("/", requireAuth, async (c) => {
  const userId = c.get("userId")!;
  const page = parseInt(c.req.query("page") || "1", 10);
  const limit = parseInt(c.req.query("limit") || "10", 10);
  const history = await paymentsService.getPaymentHistory(userId, { page, limit });

  return c.json({
    success: true,
    data: history.payments,
    meta: history.meta,
  });
});

paymentsRouter.get("/status", requireAuth, async (c) => {
  const userId = c.get("userId")!;
  const orderId = c.req.query("orderId");
  
  if (!orderId) {
    return c.json({ success: false, error: { code: "BAD_REQUEST", message: "orderId required" } }, 400);
  }
  
  const status = await paymentsService.getPaymentStatus(userId, orderId);

  return c.json({
    success: true,
    data: status,
  });
});

paymentsRouter.post(
  "/initiate",
  requireAuth,
  zValidator("json", initiatePaymentSchema),
  async (c) => {
    const userId = c.get("userId")!;
    const data = c.req.valid("json");
    const result = await paymentsService.initiatePayment(userId, data);

    return c.json({
      success: true,
      data: result,
    });
  }
);

paymentsRouter.post(
  "/process-order",
  requireAuth,
  zValidator("json", processOrderSchema),
  async (c) => {
    const userId = c.get("userId")!;
    const data = c.req.valid("json");
    const result = await paymentsService.processOrder(userId, data);

    return c.json({
      success: true,
      data: result,
    });
  }
);

paymentsRouter.post("/juspay/webhook", async (c) => {
  const body = await c.req.json();
  const result = await paymentsService.handleWebhook(body);

  return c.json({
    success: true,
    data: result,
  });
});
