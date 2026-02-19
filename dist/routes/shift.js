"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../core/config/prisma");
const auth_1 = require("../core/middleware/auth");
const geo_1 = require("../core/utils/geo");
const env_1 = require("../core/config/env");
const router = (0, express_1.Router)();
const StartShiftSchema = zod_1.z.object({
    lat: zod_1.z.number().min(-90).max(90),
    lng: zod_1.z.number().min(-180).max(180),
});
/**
 * POST /api/v1/shift/start
 * Verifies the driver is within TERMINAL_RADIUS_METERS of the configured
 * Leyte terminal and activates their VehicleLocation record.
 */
router.post("/start", auth_1.authenticate, auth_1.requireDriver, async (req, res) => {
    const parsed = StartShiftSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
    }
    const { lat, lng } = parsed.data;
    const driverId = req.user.driverId;
    // ── Geofence check ────────────────────────────────────────────────────
    const distanceToTerminal = (0, geo_1.haversineDistance)(lat, lng, env_1.env.TERMINAL_LAT, env_1.env.TERMINAL_LNG);
    if (distanceToTerminal > env_1.env.TERMINAL_RADIUS_METERS) {
        res.status(403).json({
            error: "Driver is not at a registered terminal",
            distanceMeters: Math.round(distanceToTerminal),
            requiredWithinMeters: env_1.env.TERMINAL_RADIUS_METERS,
        });
        return;
    }
    // ── Upsert location with PostGIS geography point ───────────────────────
    await prisma_1.prisma.$executeRaw `
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
});
/**
 * POST /api/v1/shift/end
 * Marks the driver's location as inactive.
 */
router.post("/end", auth_1.authenticate, auth_1.requireDriver, async (req, res) => {
    const driverId = req.user.driverId;
    await prisma_1.prisma.vehicleLocation.updateMany({
        where: { driverId },
        data: { isActive: false },
    });
    console.log(`[Shift] Driver ${driverId} ended shift`);
    res.status(200).json({ message: "Shift ended", driverId });
});
exports.default = router;
//# sourceMappingURL=shift.js.map