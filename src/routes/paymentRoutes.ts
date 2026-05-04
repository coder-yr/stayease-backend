import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/apiResponse.js";

export const paymentRoutes = Router();

paymentRoutes.post(
  "/mock",
  requireAuth,
  asyncHandler(async (_req, res) => {
    res.status(200).json(ok({ success: true }, "Mock payment approved"));
  })
);