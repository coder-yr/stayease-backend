import { Router } from "express";
import { walletController } from "../controllers/walletController.js";
import { requireAuth } from "../middlewares/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const walletRoutes = Router();

walletRoutes.get("/info", requireAuth, asyncHandler(walletController.getWalletInfo));
walletRoutes.get("/transactions", requireAuth, asyncHandler(walletController.getTransactions));
walletRoutes.post("/topup", requireAuth, asyncHandler(walletController.topUp));
