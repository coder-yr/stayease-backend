import type { NextFunction, Request, Response } from "express";
import type { AnyZodObject, ZodEffects, ZodError } from "zod";
import { AppError } from "../utils/appError.js";

type ValidatableSchema = AnyZodObject | ZodEffects<AnyZodObject>;

export const validate = (schema: ValidatableSchema) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params
      });
      next();
    } catch (error) {
      const zodError = error as ZodError;
      next(new AppError("Validation failed", 400, zodError.flatten()));
    }
  };
};
