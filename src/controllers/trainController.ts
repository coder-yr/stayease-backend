import type { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { ok } from "../utils/apiResponse.js";

export const trainController = {
  all: async (_req: Request, res: Response) => {
    const data = await prisma.train.findMany({
      orderBy: { departureTime: "asc" }
    });
    res.status(200).json(ok(data, "All trains fetched"));
  },

  search: async (req: Request, res: Response) => {
    const source = req.query.source ? String(req.query.source) : undefined;
    const destination = req.query.destination ? String(req.query.destination) : undefined;

    const trains = await prisma.train.findMany({
      where: {
        ...(source ? { source: { contains: source } } : {}),
        ...(destination ? { destination: { contains: destination } } : {})
      }
    });

    res.status(200).json(ok(trains, "Trains fetched"));
  }
};
