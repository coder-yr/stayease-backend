import type { Request, Response } from "express";
import { recommendationService } from "../services/recommendationService.js";
import { ok } from "../utils/apiResponse.js";

export const recommendationController = {
  mine: async (req: Request, res: Response) => {
    const data = await recommendationService.getRecommendations({
      userId: req.user!.id,
      location: req.query.location as string | undefined,
      maxBudget: req.query.maxBudget ? Number(req.query.maxBudget) : undefined,
      minRating: req.query.minRating ? Number(req.query.minRating) : undefined
    });

    res.status(200).json(ok(data, "Recommendations fetched"));
  }
};
