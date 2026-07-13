import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { unauthorized } from "../lib/errors";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

export interface AuthedRequest extends Request {
  userId?: string;
}

export function signToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "12h" });
}

export function requireAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return next(unauthorized());
  }
  const token = header.slice("Bearer ".length);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    req.userId = payload.userId;
    next();
  } catch {
    next(unauthorized("Invalid or expired token"));
  }
}
