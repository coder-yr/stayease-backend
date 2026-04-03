import type { Request, Response } from "express";
import { hotelService } from "../services/hotelService.js";
import { ok } from "../utils/apiResponse.js";
import { AppError } from "../utils/appError.js";

export const hotelController = {
  search: async (req: Request, res: Response) => {
    const amenities = typeof req.query.amenities === "string" ? req.query.amenities.split(",") : undefined;

    const data = await hotelService.search({
      location: req.query.location as string | undefined,
      minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined,
      maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
      minRating: req.query.minRating ? Number(req.query.minRating) : undefined,
      amenities,
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 10
    });

    res.status(200).json(ok(data, "Hotels fetched"));
  },

  getById: async (req: Request, res: Response) => {
    const item = await hotelService.getById(req.params.id);
    res.status(200).json(ok(item, "Hotel fetched"));
  },

  createMine: async (req: Request, res: Response) => {
    const ownerId = req.user!.id;
    const created = await hotelService.createByOwner(ownerId, req.body);
    res.status(201).json(ok(created, "Hotel submitted for approval"));
  },

  listMine: async (req: Request, res: Response) => {
    const ownerId = req.user!.id;
    const items = await hotelService.listByOwner(ownerId);
    res.status(200).json(ok(items, "Owner hotels fetched"));
  },

  updateMine: async (req: Request, res: Response) => {
    const ownerId = req.user!.id;
    const updated = await hotelService.updateByOwner(ownerId, req.params.id, req.body);
    if (!updated) throw new AppError("Hotel not found", 404);
    res.status(200).json(ok(updated, "Hotel updated and resubmitted for approval"));
  },

  deleteMine: async (req: Request, res: Response) => {
    const ownerId = req.user!.id;
    const removed = await hotelService.deleteByOwner(ownerId, req.params.id);
    if (!removed) throw new AppError("Hotel not found", 404);
    res.status(200).json(ok(null, "Hotel deleted"));
  }
};
