import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import { env } from "../config/env.js";

type UserRole = "user" | "admin" | "owner";

type AccessTokenClaims = {
  sub: string;
  email: string;
  role: UserRole;
};

export const issueAccessToken = (input: { id: string; email: string; role: UserRole }) => {
  const payload: AccessTokenClaims = {
    sub: input.id,
    email: input.email,
    role: input.role
  };

  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"]
  };

  return jwt.sign(payload, env.JWT_SECRET, options);
};

export const verifyAccessToken = (token: string): (JwtPayload & AccessTokenClaims) | null => {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (typeof decoded === "string") return null;
    if (!decoded.sub || !decoded.email || !decoded.role) return null;
    if (decoded.role !== "user" && decoded.role !== "admin" && decoded.role !== "owner") return null;
    return decoded as JwtPayload & AccessTokenClaims;
  } catch {
    return null;
  }
};