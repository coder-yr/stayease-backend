import type { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { ok } from "../utils/apiResponse.js";
import { AppError } from "../utils/appError.js";

type BookingStatusValue = "pending" | "confirmed" | "cancelled";

export const bookingController = {
  create: async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const totalAmount = Number(req.body.totalAmount);
    const type = req.body.type;

    // Validation for hotel bookings
    if (type === "hotel" && req.body.hotelId) {
      const hotel = await prisma.hotel.findUnique({ where: { id: req.body.hotelId } });
      if (!hotel) throw new AppError("Hotel not found", 404);

      const metadata = req.body.metadata || {};
      const checkIn = metadata.checkInDate;
      const checkOut = metadata.checkOutDate;

      if (checkIn && checkOut) {
        const start = new Date(checkIn);
        const end = new Date(checkOut);
        const diff = end.getTime() - start.getTime();
        const nights = Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
        
        const expectedTotal = Number(hotel.price) * nights;
        
        // Allow a small margin for potential rounding issues
        if (Math.abs(totalAmount - expectedTotal) > 1) {
          throw new AppError(`Price mismatch. Expected: ${expectedTotal}, Received: ${totalAmount}. nights: ${nights}`, 400);
        }
      }
    }

    const booking = await prisma.booking.create({
      data: {
        userId,
        type: type,
        travelDate: new Date(req.body.travelDate),
        hotelId: req.body.hotelId ?? null,
        packageId: req.body.packageId ?? null,
        flightData: req.body.flightData,
        packageData: req.body.packageData,
        busData: req.body.busData,
        trainData: req.body.trainData,
        totalAmount: totalAmount,
        currency: req.body.currency ?? "USD",
        metadata: req.body.metadata,
        status: "pending"
      } as any
    });

    res.status(201).json(ok(booking, "Booking created with status 'pending'. Complete payment to confirm."));
  },

  listMine: async (req: Request, res: Response) => {
    const items = await prisma.booking.findMany({
      where: { userId: req.user!.id },
      include: { hotel: true },
      orderBy: { createdAt: "desc" }
    });

    res.status(200).json(ok(items, "Bookings fetched"));
  },

  listOwnerBookings: async (req: Request, res: Response) => {
    const ownerId = req.user!.id;
    const items = await prisma.booking.findMany({
      where: {
        hotel: {
          ownerId: ownerId
        }
      },
      include: {
        hotel: true,
        user: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    res.status(200).json(ok(items, "Owner bookings fetched"));
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
  },

  confirm: async (req: Request, res: Response) => {
    const bookingId = req.params.id;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Fetch booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId }
    });

    if (!booking) {
      throw new AppError("Booking not found", 404);
    }

    // Enforce owner-or-admin access control
    if (booking.userId !== userId && userRole !== "admin") {
      throw new AppError("Unauthorized: Cannot confirm this booking", 403);
    }

    // Expect paymentMethod in body: 'wallet' | 'card' | 'upi'
    const paymentMethod = (req.body.paymentMethod || "").toString().toLowerCase();
    if (!["wallet", "card", "upi"].includes(paymentMethod)) {
      throw new AppError("Invalid or missing paymentMethod. Use 'wallet'|'card'|'upi'", 400);
    }

    if (booking.status !== "pending") {
      throw new AppError("Only pending bookings can be confirmed", 400);
    }

    // Handle wallet payments with atomic deduction + transaction
    if (paymentMethod === "wallet") {
      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({ where: { id: booking.userId } });
        if (!user) throw new AppError("User not found", 404);

        const walletBalance = Number(user.walletBalance);
        const amount = Number(booking.totalAmount);
        if (walletBalance < amount) {
          throw new AppError(
            `Insufficient wallet balance. Required: ${amount}, Available: ${walletBalance}`,
            400
          );
        }

        await tx.user.update({ where: { id: booking.userId }, data: { walletBalance: { decrement: amount } } });

        await tx.walletTransaction.create({
          data: {
            userId: booking.userId,
            title: "Booking",
            amount: amount,
            type: "debit",
            method: "Wallet"
          }
        });

        // attach payment metadata and confirm
        const updated = await tx.booking.update({
          where: { id: bookingId },
          data: {
            status: "confirmed",
            metadata: {
              ...(booking.metadata as any || {}),
              payment: { method: "wallet", mock: false, paidAt: new Date().toISOString() }
            }
          } as any
        });

        return updated;
      });

      res.status(200).json(ok(result, "Booking confirmed and wallet deducted"));
      return;
    }

    // For card or UPI, simulate payment success (no wallet deduction). Record mock payment info.
    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: "confirmed",
        metadata: {
          ...(booking.metadata as any || {}),
          payment: { method: paymentMethod, mock: true, paidAt: new Date().toISOString() }
        }
      } as any
    });

    res.status(200).json(ok(updated, `Booking confirmed via ${paymentMethod} (mock)`));
  }
};
