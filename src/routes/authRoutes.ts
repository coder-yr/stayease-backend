import { Router } from "express";
import { authController } from "../controllers/authController.js";
import { requireAuth } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { authLoginSchema, authSignupSchema } from "../models/validators.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const authRoutes = Router();

authRoutes.post("/signup", validate(authSignupSchema), asyncHandler(authController.signup));
authRoutes.post("/login", validate(authLoginSchema), asyncHandler(authController.login));
authRoutes.get("/me", requireAuth, asyncHandler(authController.me));
