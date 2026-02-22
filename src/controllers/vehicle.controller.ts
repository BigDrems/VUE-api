import { Request, Response } from "express";
import { z } from "zod";
import { VehicleService } from "../services/vehicle.service";

const NearbyQuerySchema = z.object({
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),
    radius: z.coerce.number().positive().default(5000), // metres, default 5 km
});

export class VehicleController {
    static async getNearby(req: Request, res: Response) {
        const parsed = NearbyQuerySchema.parse(req.query);
        const { lat, lng, radius } = parsed;

        const drivers = await VehicleService.getNearbyDrivers(lat, lng, radius);

        res.json({
            count: drivers.length,
            queryPoint: { lat, lng },
            radiusMeters: radius,
            drivers,
        });
    }
}
