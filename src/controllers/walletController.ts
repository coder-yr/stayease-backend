import type { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { ok } from "../utils/apiResponse.js";
import { AppError } from "../utils/appError.js";

export const walletController = {
  getWalletInfo: async (req: Request, res: Response) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        walletBalance: true,
        loyaltyPoints: true,
        membershipTier: true
      }
    });

    if (!user) throw new AppError("User not found", 404);

    res.status(200).json(ok({
      balance: Number(user.walletBalance),
      loyaltyPoints: user.loyaltyPoints,
      tier: user.membershipTier
    }, "Wallet info fetched"));
  },

  getTransactions: async (req: Request, res: Response) => {
    const limit = Number(req.query.limit) || 10;
    const transactions = await prisma.walletTransaction.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      take: limit
    });

    res.status(200).json(ok(transactions, "Transactions fetched"));
  },

  topUp: async (req: Request, res: Response) => {
    const { amount } = req.body;
    if (!amount || amount <= 0) throw new AppError("Invalid top-up amount", 400);

    const updatedUser = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        walletBalance: { increment: amount },
        transactions: {
          create: {
            title: "Wallet Top-up",
            amount,
            type: "income",
            method: "Staging Payment"
          }
        }
      },
      select: {
        walletBalance: true,
        loyaltyPoints: true,
        membershipTier: true
      }
    });

    res.status(200).json(ok({
      balance: Number(updatedUser.walletBalance),
      loyaltyPoints: updatedUser.loyaltyPoints,
      tier: updatedUser.membershipTier
    }, "Top-up successful"));
  }
};
