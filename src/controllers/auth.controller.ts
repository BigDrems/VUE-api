import { Request, Response } from "express";
import { z } from "zod";
import { Provider } from "@supabase/supabase-js";
import { AuthService } from "../services/auth.service";

const RegisterSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    role: z.enum(["COMMUTER", "DRIVER"]).default("COMMUTER"),
    vehiclePlate: z.string().optional(),
});

const LoginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});

const SyncSchema = z.object({
    accessToken: z.string(),
    role: z.enum(["COMMUTER", "DRIVER"]).default("COMMUTER"),
    vehiclePlate: z.string().optional(),
});

export class AuthController {
    static async getMe(req: Request, res: Response) {
        const user = await AuthService.getMe(req.user!.sub);
        res.json(user);
    }

    static async verifyDriver(req: Request, res: Response) {
        const driverId = req.params.driverId as string;
        const driver = await AuthService.verifyDriver(driverId);
        res.json({ message: "Driver verified successfully", driver });
    }

    static async register(req: Request, res: Response) {
        const parsed = RegisterSchema.parse(req.body);
        const result = await AuthService.register(parsed);
        res.status(201).json(result);
    }

    static async login(req: Request, res: Response) {
        const parsed = LoginSchema.parse(req.body);
        const result = await AuthService.login(parsed);
        res.json(result);
    }

    static async oauth(req: Request, res: Response) {
        const provider = req.params.provider as Provider;
        const protocol = req.protocol;
        const host = req.get("host")!;
        const url = await AuthService.getOAuthUrl(provider, protocol, host);
        res.json({ url });
    }

    static async sync(req: Request, res: Response) {
        const parsed = SyncSchema.parse(req.body);
        const result = await AuthService.sync(parsed);
        res.json(result);
    }
}
