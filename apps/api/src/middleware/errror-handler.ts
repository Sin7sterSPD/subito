import type { ErrorHandler } from "hono"
import { AppError } from "@/lib/errors"
import type { AppEnv } from "@/lib/types"

import { log } from "@/lib/logger"

export const errorHandler: ErrorHandler<AppEnv> = (err, c) => {
  const inProd = process.env.NODE_ENV === "production"
  log.error(
    {
      requestId: c.get("requestId"),
      err,
      ...(inProd ? {} : { stack: err.stack }),
    },
    err.message
  )

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
      err.statusCode as 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500 | 503
    )
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
  )
}
