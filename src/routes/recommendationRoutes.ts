import { Router } from "express";
import { recommendationController } from "../controllers/recommendationController.js";
import { requireAuth } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { recommendationSchema } from "../models/validators.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const recommendationRoutes = Router();

recommendationRoutes.get("/", requireAuth, validate(recommendationSchema), asyncHandler(recommendationController.mine));
