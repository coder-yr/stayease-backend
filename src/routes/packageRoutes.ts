import { Router } from "express";
import { packageController } from "../controllers/packageController.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { tourPackageCreateSchema, tourPackageUpdateSchema } from "../models/validators.js";

export const packageRoutes = Router();

packageRoutes.get("/", asyncHandler(packageController.list));
packageRoutes.get("/:id", asyncHandler(packageController.getById));
packageRoutes.post(
  "/",
  requireAuth,
  requireRole("admin"),
  validate(tourPackageCreateSchema),
  asyncHandler(packageController.create)
);
packageRoutes.put(
  "/:id",
  requireAuth,
  requireRole("admin"),
  validate(tourPackageUpdateSchema),
  asyncHandler(packageController.update)
);
packageRoutes.delete("/:id", requireAuth, requireRole("admin"), asyncHandler(packageController.remove));