import type { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { ok } from "../utils/apiResponse.js";
import { AppError } from "../utils/appError.js";

type BookingStatusValue = "pending" | "confirmed" | "cancelled";

export const bookingController = {
  create: async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const totalAmount = Number(req.body.totalAmount);

    // Fetch user wallet balance
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    // Check if wallet balance is sufficient (convert Decimal to number)
    const walletBalance = Number(user.walletBalance);
    if (walletBalance < totalAmount) {
      throw new AppError(
        `Insufficient wallet balance. Required: ${totalAmount}, Available: ${walletBalance}`,
        400
      );
    }

    // Create booking, deduct wallet, and create transaction in a single transaction
    const result = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.create({
        data: {
          userId,
          type: req.body.type,
          travelDate: new Date(req.body.travelDate),
          hotelId: req.body.hotelId ?? null,
          packageId: req.body.packageId ?? null,
          flightData: req.body.flightData,
          packageData: req.body.packageData,
          busData: req.body.busData,
          trainData: req.body.trainData,
          totalAmount: totalAmount,
          currency: req.body.currency ?? "USD",
          metadata: req.body.metadata
        } as any
      });

      // Deduct from wallet
      await tx.user.update({
        where: { id: userId },
        data: { walletBalance: { decrement: totalAmount } }
      });

      // Create wallet transaction record
      await tx.walletTransaction.create({
        data: {
          userId,
          title: "Booking",
          amount: totalAmount,
          type: "debit",
          method: "Wallet"
        }
      });

      return booking;
    });

    res.status(201).json(ok(result, "Booking created and wallet deducted"));
  },

  listMine: async (req: Request, res: Response) => {
    const items = await prisma.booking.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" }
    });

    res.status(200).json(ok(items, "Bookings fetched"));
  },

  getById: async (req: Request, res: Response) => {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id }
    });

    if (!booking) {
      throw new AppError("Booking not found", 404);
    }

    // Enforce owner-or-admin access control
    const userId = req.user!.id;
    const userRole = req.user!.role;
    if (booking.userId !== userId && userRole !== "admin") {
      throw new AppError("Unauthorized: Cannot access this booking", 403);
    }

    res.status(200).json(ok(booking, "Booking fetched"));
  },

  updateStatus: async (req: Request, res: Response) => {
    const status = req.body.status as BookingStatusValue;
    if (!["pending", "confirmed", "cancelled"].includes(status)) {
      throw new AppError("Invalid status", 400);
    }

    const booking = await prisma.booking.update({
      where: { id: req.params.id },
      data: { status }
    });

    res.status(200).json(ok(booking, "Booking status updated"));
  }
};
