import type { Request, Response } from "express";
import { flightService } from "../services/flightService.js";
import { ok } from "../utils/apiResponse.js";

export const flightController = {
  all: async (_req: Request, res: Response) => {
    const data = await flightService.getAll();
    res.status(200).json(ok(data, "All flights fetched"));
  },

  search: async (req: Request, res: Response) => {
    const data = await flightService.search({
      source: String(req.query.source),
      destination: String(req.query.destination),
      date: String(req.query.date),
      adults: req.query.adults ? Number(req.query.adults) : 1,
      travelClass: req.query.travelClass ? String(req.query.travelClass) : "ECONOMY",
      userId: req.user?.id
    });

    res.status(200).json(ok(data, "Flights fetched"));
  }
};
