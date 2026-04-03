import { Router } from "express";
import { flightController } from "../controllers/flightController.js";
import { validate } from "../middlewares/validate.js";
import { flightSearchSchema } from "../models/validators.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const flightRoutes = Router();

flightRoutes.get("/all", asyncHandler(flightController.all));
flightRoutes.get("/", validate(flightSearchSchema), asyncHandler(flightController.search));
