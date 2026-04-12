import type { Context } from "hono";

export interface JWTPayload {
  sub: string;
  userId: string;
  role: "customer" | "partner" | "admin";
  phone: string;
  iat: number;
  exp: number;
}

export interface AppEnv {
  Variables: {
    requestId: string;
    user?: JWTPayload;
    userId?: string;
  };
}

export type AppContext = Context<AppEnv>;

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export const ServiceabilityStatus = {
  SERVICEABLE: "SERVICEABLE",
  NOT_SERVICEABLE: "NOT_SERVICEABLE",
  NOT_EXIST: "NOT_EXIST",
} as const;

export type ServiceabilityStatus =
  (typeof ServiceabilityStatus)[keyof typeof ServiceabilityStatus];
