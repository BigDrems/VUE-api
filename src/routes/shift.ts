import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../core/config/prisma";
import { authenticate, requireDriver } from "../core/middleware/auth";
import { haversineDistance } from "../core/utils/geo";
import { env } from "../core/config/env";

const router = Router();

const StartShiftSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

/**
 * POST /api/v1/shift/start
 * Verifies the driver is within TERMINAL_RADIUS_METERS of the configured
 * Leyte terminal and activates their VehicleLocation record.
 */
router.post(
  "/start",
  authenticate,
  requireDriver,
  async (req: Request, res: Response) => {
    const parsed = StartShiftSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const { lat, lng } = parsed.data;
    const driverId = req.user!.driverId!;

    //Geofence check
    const distanceToTerminal = haversineDistance(
      lat,
      lng,
      env.TERMINAL_LAT,
      env.TERMINAL_LNG
    );

    if (distanceToTerminal > env.TERMINAL_RADIUS_METERS) {
      res.status(403).json({
        error: "Driver is not at a registered terminal",
        distanceMeters: Math.round(distanceToTerminal),
        requiredWithinMeters: env.TERMINAL_RADIUS_METERS,
      });
      return;
    }

    //Upsert location with PostGIS geography point
    await prisma.$executeRaw`
      INSERT INTO "VehicleLocation" ("id", "driverId", "coords", "isActive", "updatedAt")
      VALUES (
        gen_random_uuid(),
        ${driverId},
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
        true,
        NOW()
      )
      ON CONFLICT ("driverId") DO UPDATE SET
        coords    = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
        "isActive" = true,
        "updatedAt" = NOW()
    `;

    console.log(`[Shift] Driver ${driverId} started shift at (${lat}, ${lng})`);

    res.status(200).json({
      message: "Shift started",
      driverId,
      coords: { lat, lng },
    });
  }
);

/**
 * POST /api/v1/shift/end
 * Marks the driver's location as inactive.
 */
router.post(
  "/end",
  authenticate,
  requireDriver,
  async (req: Request, res: Response) => {
    const driverId = req.user!.driverId!;

    await prisma.vehicleLocation.updateMany({
      where: { driverId },
      data: { isActive: false },
    });

    console.log(`[Shift] Driver ${driverId} ended shift`);
    res.status(200).json({ message: "Shift ended", driverId });
  }
);

export default router;
