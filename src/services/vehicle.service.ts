import { redisClient } from "../core/config/redis";

export class VehicleService {
    static async getNearbyDrivers(lat: number, lng: number, radiusMeters: number) {
        // 1. Query Redis for hot geospatial data
        // GEORADIUS active_drivers lng lat radius m WITHDIST WITHCOORD ASC
        const results = await redisClient.georadius(
            "active_drivers",
            lng,
            lat,
            radiusMeters,
            "m",
            "WITHDIST",
            "WITHCOORD",
            "ASC"
        ) as any[];

        // results is an array of [driverId, distanceStr, [lngStr, latStr]]
        return results.map((result) => {
            const driverId = result[0];
            const distance = result[1];
            const [rLng, rLat] = result[2];

            return {
                driverId,
                coords: {
                    type: "Point",
                    coordinates: [Number(rLng), Number(rLat)]
                },
                distanceMeters: Math.round(Number(distance)),
                lastSeen: new Date(),
            };
        });
    }
}
