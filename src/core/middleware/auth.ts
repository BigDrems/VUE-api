import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

export interface JwtPayload {
  sub: string;    // userId
  role: "COMMUTER" | "DRIVER";
  driverId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireDriver(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== "DRIVER") {
    res.status(403).json({ error: "Driver access required" });
    return;
  }
  if (!req.user.driverId) {
    res.status(403).json({ error: "No driver profile linked to this account" });
    return;
  }
  next();
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: "8h" });
}
