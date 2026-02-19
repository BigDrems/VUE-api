"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../core/config/prisma");
const router = (0, express_1.Router)();
const NearbyQuerySchema = zod_1.z.object({
    lat: zod_1.z.coerce.number().min(-90).max(90),
    lng: zod_1.z.coerce.number().min(-180).max(180),
    radius: zod_1.z.coerce.number().positive().default(5000), // metres, default 5 km
});
/**
 * GET /api/v1/vehicles/nearby?lat=x&lng=y[&radius=n]
 * Returns all active drivers within `radius` metres (default 5000 m / 5 km).
 * Uses PostGIS ST_DWithin for GiST-accelerated proximity search.
 */
router.get("/nearby", async (req, res) => {
    const parsed = NearbyQuerySchema.safeParse(req.query);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
    }
    const { lat, lng, radius } = parsed.data;
    const rows = await prisma_1.prisma.$queryRaw `
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
        drivers: rows.map((r) => ({
            driverId: r.driver_id,
            coords: r.coords,
            distanceMeters: Math.round(Number(r.distance_meters)),
            lastSeen: r.updated_at,
        })),
    });
});
exports.default = router;
//# sourceMappingURL=vehicles.js.map