import type { Request, Response } from "express";
import { chatService } from "../services/chatService.js";
import { ok } from "../utils/apiResponse.js";

export const chatController = {
  create: async (req: Request, res: Response) => {
    const data = await chatService.respond({
      userId: req.user?.id,
      message: req.body.message
    });

    res.status(200).json(ok(data, "Chat response generated"));
  }
};
