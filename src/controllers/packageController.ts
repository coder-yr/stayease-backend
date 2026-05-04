import type { Request, Response } from "express";
import { packageService } from "../services/packageService.js";
import { ok } from "../utils/apiResponse.js";
import { AppError } from "../utils/appError.js";

export const packageController = {
  list: async (_req: Request, res: Response) => {
    const items = await packageService.list();
    res.status(200).json(ok(items, "Packages fetched"));
  },

  getById: async (req: Request, res: Response) => {
    const item = await packageService.getById(req.params.id);
    if (!item) throw new AppError("Package not found", 404);
    res.status(200).json(ok(item, "Package fetched"));
  },

  create: async (req: Request, res: Response) => {
    const created = await packageService.create(req.body);
    res.status(201).json(ok(created, "Package created"));
  },

  update: async (req: Request, res: Response) => {
    const updated = await packageService.update(req.params.id, req.body);
    if (!updated) throw new AppError("Package not found", 404);
    res.status(200).json(ok(updated, "Package updated"));
  },

  remove: async (req: Request, res: Response) => {
    const removed = await packageService.delete(req.params.id);
    if (!removed) throw new AppError("Package not found", 404);
    res.status(200).json(ok(null, "Package deleted"));
  }
};