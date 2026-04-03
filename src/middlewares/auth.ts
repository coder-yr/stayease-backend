import type { NextFunction, Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/appError.js";
import { verifyAccessToken } from "../utils/jwt.js";

type UserRole = "user" | "admin" | "owner";

const getBearerToken = (req: Request): string | null => {
  const header = req.headers.authorization;
  if (!header) return null;
  const [type, token] = header.split(" ");
  if (type !== "Bearer" || !token) return null;
  return token;
};

export const requireAuth = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const token = getBearerToken(req);
    if (!token) throw new AppError("Missing access token", 401);

    const payload = verifyAccessToken(token);
    if (!payload) throw new AppError("Invalid or expired token", 401);

    const profile = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true }
    });

    if (!profile) throw new AppError("Profile not found", 404);

    req.user = {
      id: profile.id,
      email: profile.email,
      role: profile.role
    };

    next();
  } catch (error) {
    next(error);
  }
};

export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError("Unauthorized", 401));
    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError("Forbidden", 403));
    }
    next();
  };
};
