import { Router } from "express";
import { busController } from "../controllers/busController.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const busRoutes = Router();

busRoutes.get("/all", asyncHandler(busController.all));
busRoutes.get("/search", asyncHandler(busController.search));
