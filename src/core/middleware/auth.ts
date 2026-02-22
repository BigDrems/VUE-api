import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { prisma } from "../config/prisma";

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

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }

  const token = authHeader.slice(7);
  try {
    // 1. Try verifying with local JWT secret
    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
      req.user = payload;
      return next();
    } catch (localErr) {
      // 2. If local fails, try verifying with Supabase secret (if available)
      if (env.SUPABASE_JWT_SECRET) {
        const payload = jwt.verify(token, env.SUPABASE_JWT_SECRET) as any;
        
        // Lookup user in our DB by supabaseId or email
        const user = await prisma.user.findFirst({
          where: {
            OR: [{ supabaseId: payload.sub }, { email: payload.email }],
          },
          include: { driver: true },
        });

        if (user) {
          req.user = {
            sub: user.id,
            role: user.role,
            driverId: user.driver?.id,
          };
          return next();
        }
      }
      throw localErr;
    }
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
