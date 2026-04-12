import type { ErrorHandler } from "hono";
import { AppError } from "../lib/errors";
import type { AppEnv } from "../lib/types";

export const errorHandler: ErrorHandler<AppEnv> = (err, c) => {
  console.error("Error:", {
    requestId: c.get("requestId"),
    error: err.message,
    stack: err.stack,
  });

  if (err instanceof AppError) {
    return c.json(
      {
        success: false,
        error: {
          code: err.code,
          message: err.message,
          details: err.details,
        },
      },
      err.statusCode as 400 | 401 | 403 | 404 | 409 | 422 | 500 | 503
    );
  }

  return c.json(
    {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message:
          process.env.NODE_ENV === "production"
            ? "Internal server error"
            : err.message,
      },
    },
    500
  );
};
