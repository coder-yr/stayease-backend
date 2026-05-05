import { Router } from "express";
import { adminHotelController } from "../controllers/adminHotelController.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const adminRoutes = Router();

// All admin routes require authentication and admin role
adminRoutes.use(requireAuth, requireRole("admin"));

// Hotel management
adminRoutes.get("/hotels/pending", asyncHandler(adminHotelController.getPendingHotels));
adminRoutes.patch("/hotels/:id/approve", asyncHandler(adminHotelController.approveHotel));
adminRoutes.patch("/hotels/:id/reject", asyncHandler(adminHotelController.rejectHotel));
