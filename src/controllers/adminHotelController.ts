import type { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { ok } from "../utils/apiResponse.js";
import { AppError } from "../utils/appError.js";

export const adminHotelController = {
  getPendingHotels: async (req: Request, res: Response) => {
    const hotels = await prisma.hotel.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "desc" }
    });

    res.status(200).json(ok(hotels, "Pending hotels fetched"));
  },

  approveHotel: async (req: Request, res: Response) => {
    const hotelId = req.params.id;

    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId }
    });

    if (!hotel) {
      throw new AppError("Hotel not found", 404);
    }

    if (hotel.status !== "pending") {
      throw new AppError(`Hotel status is already ${hotel.status}`, 400);
    }

    const updated = await prisma.hotel.update({
      where: { id: hotelId },
      data: { status: "approved" }
    });

    res.status(200).json(ok(updated, "Hotel approved"));
  },

  rejectHotel: async (req: Request, res: Response) => {
    const hotelId = req.params.id;

    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId }
    });

    if (!hotel) {
      throw new AppError("Hotel not found", 404);
    }

    if (hotel.status !== "pending") {
      throw new AppError(`Hotel status is already ${hotel.status}`, 400);
    }

    const updated = await prisma.hotel.update({
      where: { id: hotelId },
      data: { status: "rejected" }
    });

    res.status(200).json(ok(updated, "Hotel rejected"));
  }
};
