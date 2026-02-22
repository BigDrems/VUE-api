import { prisma } from "../core/config/prisma";
import { ForbiddenError } from "../core/errors/AppError";
import { haversineDistance } from "../core/utils/geo";
import { env } from "../core/config/env";
import { redisClient } from "../core/config/redis";

export class ShiftService {
    static async startShift(driverId: string, lat: number, lng: number) {
        const driver = await prisma.driver.findUnique({
            where: { id: driverId },
        });

        if (!driver || !driver.isVerified) {
            throw new ForbiddenError("Driver profile is not yet verified by an administrator.");
        }

        const distanceToTerminal = haversineDistance(
            lat,
            lng,
            env.TERMINAL_LAT,
            env.TERMINAL_LNG
        );

        if (distanceToTerminal > env.TERMINAL_RADIUS_METERS) {
            throw new ForbiddenError(
                `Driver is not at a registered terminal. Distance: ${Math.round(distanceToTerminal)}m. Required: ${env.TERMINAL_RADIUS_METERS}m`
            );
        }

        // 1. Write to Redis (Hot Geospatial Data)
        await redisClient.geoadd("active_drivers", lng, lat, driverId);

        // 2. Write-behind: Async PostGIS Update without blocking the response
        prisma.$executeRaw`
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
    `.catch((err) => {
            console.error("[WriteBehind] Error updating Postgres:", err);
        });

        return { driverId, coords: { lat, lng } };
    }

    static async endShift(driverId: string) {
        // 1. Remove from Redis
        await redisClient.zrem("active_drivers", driverId);

        // 2. Write-behind POSTGIS update
        prisma.vehicleLocation.updateMany({
            where: { driverId },
            data: { isActive: false },
        }).catch((err) => {
            console.error("[WriteBehind] Error ending shift in Postgres:", err);
        });

        return { driverId };
    }
}
