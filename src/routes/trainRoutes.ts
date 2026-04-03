import { Router } from "express";
import { trainController } from "../controllers/trainController.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const trainRoutes = Router();

trainRoutes.get("/all", asyncHandler(trainController.all));
trainRoutes.get("/search", asyncHandler(trainController.search));
