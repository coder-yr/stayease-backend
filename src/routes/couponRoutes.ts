import { Router } from "express";
import { couponController } from "../controllers/couponController.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const couponRoutes = Router();

couponRoutes.post("/validate", asyncHandler(couponController.validate));
