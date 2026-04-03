import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { env } from "../config/env.js";
import { AppError } from "../utils/appError.js";
import { fail } from "../utils/apiResponse.js";
import { logger } from "../utils/logger.js";

export const notFoundHandler = (_req: Request, res: Response) => {
  res.status(404).json(fail("Route not found"));
};

export const errorHandler = (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json(fail(error.message, error.details));
  }

  if (error instanceof ZodError) {
    return res.status(400).json(fail("Validation failed", error.flatten()));
  }

  if (error instanceof Error && "code" in error) {
    const prismaLikeError = error as Error & { code?: string; meta?: unknown };
    if (prismaLikeError.code?.startsWith("P")) {
      return res
        .status(400)
        .json(fail("Database request failed", { code: prismaLikeError.code, meta: prismaLikeError.meta }));
    }
  }

  logger.error({ error }, "Unhandled error");

  return res.status(500).json(
    fail("Internal server error", env.NODE_ENV === "development" ? (error as Error).message : undefined)
  );
};
