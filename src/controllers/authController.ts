import type { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { ok } from "../utils/apiResponse.js";
import { AppError } from "../utils/appError.js";
import { issueAccessToken } from "../utils/jwt.js";
import { hashPassword, verifyPassword } from "../utils/password.js";

export const authController = {
  signup: async (req: Request, res: Response) => {
    const { email, password, name, accountType } = req.body as {
      email: string;
      password: string;
      name?: string;
      accountType?: "user" | "owner";
    };

    const wantsOwnerAccess = accountType === "owner";

    const existing = await prisma.user.findUnique({
      where: { email }
    });

    if (existing) throw new AppError("Email is already registered", 409);

    const user = await prisma.user.create({
      data: {
        email,
        name: name ?? null,
        passwordHash: await hashPassword(password),
        preferences: wantsOwnerAccess
          ? {
              ownerApplication: {
                status: "pending",
                requestedAt: new Date().toISOString()
              }
            }
          : undefined
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        preferences: true,
        travelHistory: true
      }
    });

    const accessToken = issueAccessToken({
      id: user.id,
      email: user.email,
      role: user.role
    });

    res.status(201).json(
      ok(
        {
          user,
          session: {
            accessToken,
            tokenType: "Bearer"
          }
        },
        wantsOwnerAccess
          ? "Signup successful. Owner access request submitted for admin approval."
          : "Signup successful"
      )
    );
  },

  login: async (req: Request, res: Response) => {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        preferences: true,
        travelHistory: true,
        passwordHash: true
      }
    });

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw new AppError("Invalid email or password", 401);
    }

    const accessToken = issueAccessToken({
      id: user.id,
      email: user.email,
      role: user.role
    });

    const { passwordHash: _passwordHash, ...profile } = user;

    res.status(200).json(
      ok(
        {
          user: profile,
          session: {
            accessToken,
            tokenType: "Bearer"
          }
        },
        "Login successful"
      )
    );
  },

  me: async (req: Request, res: Response) => {
    const profile = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        preferences: true,
        travelHistory: true,
        walletBalance: true,
        loyaltyPoints: true,
        membershipTier: true,
        createdAt: true,
        updatedAt: true,
        bookings: {
          orderBy: { createdAt: "desc" },
          take: 5
        }
      }
    });

    res.status(200).json(ok(profile, "Profile fetched"));
  }
};
