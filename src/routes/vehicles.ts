import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../core/config/prisma";

const router = Router();

const NearbyQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().positive().default(5000), // metres, default 5 km
});

interface NearbyRow {
  driver_id: string;
  coords: string; // GeoJSON string
  distance_meters: number;
  updated_at: Date;
}

/**
 * GET /api/v1/vehicles/nearby?lat=x&lng=y[&radius=n]
 * Returns all active drivers within `radius` metres (default 5000 m / 5 km).
 * Uses PostGIS ST_DWithin for GiST-accelerated proximity search.
 */
router.get("/nearby", async (req: Request, res: Response) => {
  const parsed = NearbyQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { lat, lng, radius } = parsed.data;

  const rows = await prisma.$queryRaw<NearbyRow[]>`
    SELECT
      vl."driverId"         AS driver_id,
      ST_AsGeoJSON(vl.coords)::json  AS coords,
      ST_Distance(
        vl.coords,
        ST_MakePoint(${lng}, ${lat})::geography
      )                     AS distance_meters,
      vl."updatedAt"        AS updated_at
    FROM "VehicleLocation" vl
    WHERE vl."isActive" = true
      AND ST_DWithin(
            vl.coords,
            ST_MakePoint(${lng}, ${lat})::geography,
            ${radius}
          )
    ORDER BY distance_meters ASC
  `;

  res.json({
    count: rows.length,
    queryPoint: { lat, lng },
    radiusMeters: radius,
    drivers: rows.map((r: NearbyRow) => ({
      driverId: r.driver_id,
      coords: r.coords,
      distanceMeters: Math.round(Number(r.distance_meters)),
      lastSeen: r.updated_at,
    })),
  });
});

export default router;
