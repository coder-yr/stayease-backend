import type { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { ok } from "../utils/apiResponse.js";
import { AppError } from "../utils/appError.js";

type BookingStatusValue = "pending" | "confirmed" | "cancelled";

export const bookingController = {
  create: async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const booking = await prisma.booking.create({
      data: {
        userId,
        type: req.body.type,
        travelDate: new Date(req.body.travelDate),
        hotelId: req.body.hotelId,
        flightData: req.body.flightData,
        busData: req.body.busData,
        trainData: req.body.trainData,
        totalAmount: Number(req.body.totalAmount),
        currency: req.body.currency ?? "USD",
        metadata: req.body.metadata
      }
    });

    res.status(201).json(ok(booking, "Booking created"));
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
