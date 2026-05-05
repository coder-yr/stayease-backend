import type { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { ok } from "../utils/apiResponse.js";

export const busController = {
  all: async (_req: Request, res: Response) => {
    const data = await prisma.bus.findMany({
      orderBy: { departureTime: "asc" }
    });
    res.status(200).json(ok(data, "All buses fetched"));
  },

  search: async (req: Request, res: Response) => {
    const source = req.query.source ? String(req.query.source) : undefined;
    const destination = req.query.destination ? String(req.query.destination) : undefined;

    const buses = await prisma.bus.findMany({
      where: {
        ...(source ? { source: { contains: source } } : {}),
        ...(destination ? { destination: { contains: destination } } : {})
      }
    });

    res.status(200).json(ok(buses, "Buses fetched"));
  }
};
