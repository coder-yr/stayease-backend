import { Router } from "express";
import { chatController } from "../controllers/chatController.js";
import { requireAuth } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { chatSchema } from "../models/validators.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const chatRoutes = Router();

chatRoutes.post("/", requireAuth, validate(chatSchema), asyncHandler(chatController.create));
