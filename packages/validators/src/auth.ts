import { z } from "zod";

export const loginSchema = z.object({
  mobileNumber: z.string().min(10).max(15),
});

export const verifySchema = z.object({
  token: z.string(),
  idtoken: z.string(),
  mobileNumber: z.string().min(10).max(15),
  referralCode: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyInput = z.infer<typeof verifySchema>;
