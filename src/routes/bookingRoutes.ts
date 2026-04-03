import { Router } from "express";
import { bookingController } from "../controllers/bookingController.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { bookingCreateSchema, bookingStatusSchema } from "../models/validators.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const bookingRoutes = Router();

bookingRoutes.post("/", requireAuth, validate(bookingCreateSchema), asyncHandler(bookingController.create));
bookingRoutes.get("/mine", requireAuth, asyncHandler(bookingController.listMine));
bookingRoutes.get("/:id", requireAuth, asyncHandler(bookingController.getById));
bookingRoutes.patch(
  "/:id/status",
  requireAuth,
  requireRole("admin"),
  validate(bookingStatusSchema),
  asyncHandler(bookingController.updateStatus)
);
