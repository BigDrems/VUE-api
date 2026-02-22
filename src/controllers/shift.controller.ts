import { Request, Response } from "express";
import { z } from "zod";
import { ShiftService } from "../services/shift.service";

const StartShiftSchema = z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
});

export class ShiftController {
    static async startShift(req: Request, res: Response) {
        const parsed = StartShiftSchema.parse(req.body);
        const result = await ShiftService.startShift(req.user!.driverId!, parsed.lat, parsed.lng);
        res.status(200).json({ message: "Shift started", ...result });
    }

    static async endShift(req: Request, res: Response) {
        const result = await ShiftService.endShift(req.user!.driverId!);
        res.status(200).json({ message: "Shift ended", ...result });
    }
}
