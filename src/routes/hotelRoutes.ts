import { Router } from "express";
import { hotelController } from "../controllers/hotelController.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { hotelSearchSchema } from "../models/validators.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const hotelRoutes = Router();

hotelRoutes.get("/", validate(hotelSearchSchema), asyncHandler(hotelController.search));

hotelRoutes.post("/", requireAuth, requireRole("owner", "admin"), asyncHandler(hotelController.createMine));
hotelRoutes.get("/my/list", requireAuth, requireRole("owner", "admin"), asyncHandler(hotelController.listMine));
hotelRoutes.put("/my/:id", requireAuth, requireRole("owner", "admin"), asyncHandler(hotelController.updateMine));
hotelRoutes.delete("/my/:id", requireAuth, requireRole("owner", "admin"), asyncHandler(hotelController.deleteMine));

hotelRoutes.get("/:id", asyncHandler(hotelController.getById));
